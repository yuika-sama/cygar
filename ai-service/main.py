import os
import io
import httpx
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

import logging

import numpy as np
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware

from PIL import Image
from pydantic import BaseModel

import firebase_admin
from firebase_admin import credentials, auth, firestore

from dotenv import load_dotenv
from starlette.responses import StreamingResponse
from ultralytics import YOLO

from utils.train import OptimizedRecyclingRecommender

import json

# --- TẢI BIẾN MÔI TRƯỜNG TỪ FILE .env ---
load_dotenv()

# --- KHỞI TẠO FIREBASE ---
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Lấy từ Firebase Console -> Project Settings -> General -> Web API Key
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
FIREBASE_SSL_VERIFY = os.getenv("FIREBASE_SSL_VERIFY", "true").lower() != "false"
FIREBASE_CA_BUNDLE = os.getenv("FIREBASE_CA_BUNDLE")

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "cygar")

app = FastAPI(title="Firebase FastAPI Backend")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent

# helpers contain refactored pieces extracted from this file
from helpers.models import get_waste_detector, get_recommender
from helpers.chatbot_rag import get_chat_rag_service
from helpers.firestore_utils import ensure_user_document, build_history_record
from helpers.cloud import build_cloudinary_image_url, upload_webp_to_cloudinary
from helpers.http import download_image_bytes
from helpers.auth import verify_token


# --- MODEL DỮ LIỆU ---
class LoginRequest(BaseModel):
    email: str
    password: str


class ExecuteRequest(BaseModel):
    session_id: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
    messages: List[Message]
    options: Optional[dict] = None
    # backward-compatible key
    option: Optional[dict] = None


def _to_firestore_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _to_firestore_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_firestore_safe(v) for v in value]
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


def _get_last_user_message(messages: List[Dict[str, Any]]) -> Optional[str]:
    for item in reversed(messages):
        if item.get("role") == "user" and item.get("content"):
            return str(item.get("content"))
    return None

# --- ROUTES ---

@app.post("/auth/login")
async def login(req: LoginRequest):
    """
    Nhận email, password -> Gọi tới Firebase REST API để đăng nhập
    -> Trả về access token
    """
    # Nếu FIREBASE_WEB_API_KEY bị None (chưa đọc được file .env), báo lỗi ngay để dễ debug
    if not FIREBASE_WEB_API_KEY:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi cấu hình server: Thiếu FIREBASE_WEB_API_KEY"
        )

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    payload = {
        "email": req.email,
        "password": req.password,
        "returnSecureToken": True
    }

    verify_config: bool | str = FIREBASE_SSL_VERIFY
    if FIREBASE_SSL_VERIFY:
        ca_bundle = FIREBASE_CA_BUNDLE or os.getenv("SSL_CERT_FILE") or os.getenv("REQUESTS_CA_BUNDLE")
        if ca_bundle:
            verify_config = ca_bundle

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=verify_config) as client:
            response = await client.post(url, json=payload)

    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Khong ket noi duoc Firebase Auth do loi SSL. "
                "Hay cau hinh FIREBASE_CA_BUNDLE (duong dan CA) hoac chi dung FIREBASE_SSL_VERIFY=false tren moi truong local."
            ),
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Khong the goi Firebase Auth. Vui long kiem tra mang/proxy cua server.",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác"
        )

    data = response.json()
    return {
        "status": "success",
        "access_token": data["idToken"],
        "expires_in": data["expiresIn"]
    }


@app.get("/dashboards")
def get_dashboards(user_token: dict = Depends(verify_token)):
    """Lấy thông tin usage_count và số lượng viewed_recipes"""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    user_data = ensure_user_document(uid, user_token)
    viewed_recipes = user_data.get("viewed_recipes", [])
    if not isinstance(viewed_recipes, list):
        viewed_recipes = []

    return {
        "usage_count": user_data.get("usage_count", 0),
        "viewed_history_count": len(viewed_recipes)
    }


@app.get("/history")
def get_history(
    page: int = Query(1, ge=1, description="Trang hiện tại, bắt đầu từ 1"),
    page_size: int = Query(10, ge=1, le=50, description="Số bản ghi mỗi trang"),
    user_token: dict = Depends(verify_token)
):
    """Lấy lịch sử theo phân trang"""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    user_data = ensure_user_document(uid, user_token)
    history = user_data.get("history", [])
    if not isinstance(history, list):
        history = []

    total_items = len(history)
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0
    start = (page - 1) * page_size
    end = start + page_size
    paged_history = history[start:end] if start < total_items else []

    return {
        "items": paged_history,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    }


@app.post("/add-session")
async def add_session(
        images: List[UploadFile] = File(...),
        user_token: dict = Depends(verify_token)
):
    """
    Tạo session mới: nhận danh sách ảnh, nén webp, lưu metadata session vào Firestore.
    """
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")
    if not images:
        raise HTTPException(status_code=400, detail="Cần gửi ít nhất 1 ảnh")

    session_id = str(uuid.uuid4())
    session_name = f"Phiên {datetime.now().strftime('%Y%m%d-%H%M%S')}"

    image_records: List[Dict[str, Any]] = []
    for image in images:
        raw = await image.read()
        if not raw:
            continue

        try:
            pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            continue

        width, height = pil_image.size
        image_stem = Path(image.filename or f"image-{uuid.uuid4().hex[:8]}").stem
        webp_filename = f"{image_stem}-{uuid.uuid4().hex[:8]}.webp"

        webp_buffer = io.BytesIO()
        pil_image.save(webp_buffer, format="WEBP", quality=80, method=6)
        webp_content = webp_buffer.getvalue()

        cloudinary_public_id, image_url = upload_webp_to_cloudinary(uid, session_id, webp_filename, webp_content)
        image_records.append({
            "original_name": image.filename,
            "converted_name": webp_filename,
            "relative_path": cloudinary_public_id,
            "storage_path": cloudinary_public_id,
            "cloudinary_public_id": cloudinary_public_id,
            "image_url": image_url,
            "mime_type": "image/webp",
            "width": width,
            "height": height,
            "size_bytes": len(webp_content),
        })

    if not image_records:
        raise HTTPException(status_code=400, detail="Không có ảnh hợp lệ để tạo session")

    user_ref = db.collection("users").document(uid)
    current_user_data = ensure_user_document(uid, user_token)

    session_payload = {
        "session_id": session_id,
        "session_name": session_name,
        "uid": uid,
        "token_uid": uid,
        "created_at": firestore.SERVER_TIMESTAMP,
        "images": _to_firestore_safe(image_records),
        "total_images": len(image_records),
    }
    user_ref.collection("sessions").document(session_id).set(session_payload)

    existing_history = current_user_data.get("history", [])
    session_history = {
        "action": "add_session",
        "target_id": session_id,
        "target_name": session_name,
        "timestamp": datetime.now(timezone.utc),
    }
    user_ref.set(
        {
            "last_updated": firestore.SERVER_TIMESTAMP,
            "history": [session_history] + existing_history[:49],
        },
        merge=True,
    )

    return {
        "status": "success",
        "session_id": session_id,
        "session_name": session_name,
        "uid": uid,
        "images": image_records,
    }


@app.post("/execute")
async def execute(
        req: ExecuteRequest,
        user_token: dict = Depends(verify_token)
):
    """
    Nhận danh sách hình ảnh -> Xử lý logic -> Trả về kết quả
    """
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")
    if not req.session_id:
        raise HTTPException(status_code=400, detail="Thiếu session_id")

    detector = get_waste_detector()
    recommender = get_recommender()

    user_ref = db.collection("users").document(uid)
    current_user_data = ensure_user_document(uid, user_token)

    session_ref = user_ref.collection("sessions").document(req.session_id)
    session_snapshot = session_ref.get()
    if not session_snapshot.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy session")

    session_data = session_snapshot.to_dict() or {}
    session_images = session_data.get("images", [])
    if not isinstance(session_images, list) or len(session_images) == 0:
        raise HTTPException(status_code=400, detail="Session không có hình ảnh để xử lý")

    execution_id = str(uuid.uuid4())

    detected_labels: List[str] = []
    image_records: List[Dict[str, Any]] = []

    for session_image in session_images:
        cloudinary_public_id = (
            session_image.get("cloudinary_public_id")
            or session_image.get("storage_path")
            or session_image.get("relative_path")
        )
        image_url = session_image.get("image_url")
        if not image_url and cloudinary_public_id:
            image_url = build_cloudinary_image_url(str(cloudinary_public_id))

        if not cloudinary_public_id or not image_url:
            continue

        try:
            image_content = await download_image_bytes(str(image_url))
            pil_image = Image.open(io.BytesIO(image_content)).convert("RGB")
        except Exception:
            continue

        width, height = pil_image.size
        np_image = np.array(pil_image)
        result = detector.predict(np_image, conf=0.3, verbose=False)[0]

        detections = []
        boxes = getattr(result, "boxes", None)
        if boxes is not None and boxes.cls is not None:
            names = detector.names
            for cls_id, conf, xyxy in zip(boxes.cls.tolist(), boxes.conf.tolist(), boxes.xyxy.tolist()):
                label = names[int(cls_id)]
                confidence = round(float(conf), 4)
                bbox = {
                    "x1": round(float(xyxy[0]), 2),
                    "y1": round(float(xyxy[1]), 2),
                    "x2": round(float(xyxy[2]), 2),
                    "y2": round(float(xyxy[3]), 2),
                }
                detections.append({
                    "label": label,
                    "confidence": confidence,
                    "bbox": bbox,
                })
                detected_labels.append(label)

        image_records.append({
            "original_name": session_image.get("original_name"),
            "converted_name": session_image.get("converted_name") or Path(str(cloudinary_public_id)).name,
            "relative_path": str(cloudinary_public_id).replace("\\", "/"),
            "storage_path": str(cloudinary_public_id).replace("\\", "/"),
            "cloudinary_public_id": str(cloudinary_public_id).replace("\\", "/"),
            "image_url": image_url,
            "mime_type": session_image.get("mime_type", "image/webp"),
            "width": width,
            "height": height,
            "size_bytes": session_image.get("size_bytes") or len(image_content),
            "detected_objects": detections,
        })

    if not image_records:
        raise HTTPException(status_code=400, detail="Không có ảnh hợp lệ để xử lý")

    # Tổng hợp nhãn theo tần suất để gợi ý công thức
    label_frequency: Dict[str, int] = {}
    for label in detected_labels:
        label_frequency[label] = label_frequency.get(label, 0) + 1

    ranked_labels = sorted(label_frequency, key=label_frequency.get, reverse=True)

    recommendation_by_label: Dict[str, List[Dict[str, Any]]] = {}
    merged_recipe_map: Dict[str, Dict[str, Any]] = {}
    for label in ranked_labels:
        recs = recommender.recommend(label, top_n=5)
        recommendation_by_label[label] = recs
        for rec in recs:
            key = f"{rec.get('title')}|{rec.get('link')}"
            if key not in merged_recipe_map:
                merged_recipe_map[key] = {
                    "title": rec.get("title"),
                    "link": rec.get("link"),
                    "view": rec.get("view", 0),
                    "favorites": rec.get("lượt yêu thích", 0),
                    "matched_labels": [label],
                }
            elif label not in merged_recipe_map[key]["matched_labels"]:
                merged_recipe_map[key]["matched_labels"].append(label)

    merged_recommendations = sorted(
        merged_recipe_map.values(),
        key=lambda x: (x.get("favorites", 0), x.get("view", 0)),
        reverse=True,
    )

    primary_label = ranked_labels[0] if ranked_labels else None

    execution_payload = {
        "execution_id": execution_id,
        "session_id": req.session_id,
        "session_name": session_data.get("session_name"),
        "uid": uid,
        "created_at": firestore.SERVER_TIMESTAMP,
        "detected_labels": ranked_labels,
        "label_frequency": label_frequency,
        "images": _to_firestore_safe(image_records),
        "recipe_suggestions": _to_firestore_safe(merged_recommendations),
        "recipe_suggestions_by_label": _to_firestore_safe(recommendation_by_label),
    }

    user_ref.collection("executions").document(execution_id).set(execution_payload)

    existing_history = current_user_data.get("history", [])
    updated_history = [
        build_history_record(execution_id, req.session_id, primary_label, len(detected_labels))
    ] + existing_history

    user_ref.set(
        {
            "usage_count": int(current_user_data.get("usage_count", 0)) + 1,
            "last_updated": firestore.SERVER_TIMESTAMP,
            "history": updated_history[:50],
        },
        merge=True,
    )

    return {
        "status": "success",
        "execution_id": execution_id,
        "session_id": req.session_id,
        "session_name": session_data.get("session_name"),
        "detection_result": {
            "detected_labels": ranked_labels,
            "label_frequency": label_frequency,
            "images": image_records,
        },
        "recommendation_result": {
            "recipes": merged_recommendations,
            "by_label": recommendation_by_label,
        },
        "post_info": {
            "uid": uid,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "total_images": len(image_records),
        },
    }


@app.get("/executions/{execution_id}")
def get_execution_detail(execution_id: str, user_token: dict = Depends(verify_token)):
    """Lay chi tiet execution da xu ly truoc do theo execution_id."""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    execution_ref = db.collection("users").document(uid).collection("executions").document(execution_id)
    execution_snapshot = execution_ref.get()
    if not execution_snapshot.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy execution")

    execution_data = execution_snapshot.to_dict() or {}

    return {
        "status": "success",
        "execution_id": execution_data.get("execution_id") or execution_id,
        "session_id": execution_data.get("session_id"),
        "session_name": execution_data.get("session_name"),
        "detection_result": {
            "detected_labels": execution_data.get("detected_labels", []),
            "label_frequency": execution_data.get("label_frequency", {}),
            "images": execution_data.get("images", []),
        },
        "recommendation_result": {
            "recipes": execution_data.get("recipe_suggestions", []),
            "by_label": execution_data.get("recipe_suggestions_by_label", {}),
        },
        "post_info": {
            "uid": uid,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "total_images": len(execution_data.get("images", [])) if isinstance(execution_data.get("images"), list) else 0,
        },
    }


@app.get("/me")
def get_me(user_token: dict = Depends(verify_token)):
    """Trả về email và display_name của user hiện tại"""
    uid = user_token.get("uid")
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        # Nếu chưa có doc trong Firestore, lấy email từ token
        return {
            "email": user_token.get("email"),
            "display_name": None
        }

    user_data = doc.to_dict()
    return {
        "email": user_data.get("email"),
        "display_name": user_data.get("display_name")
    }


@app.post("/auth/logout")
def logout(user_token: dict = Depends(verify_token)):
    """
    Xử lý logout: Thu hồi (revoke) toàn bộ refresh token của user.
    Hành động này sẽ làm vô hiệu hóa các access token được cấp sau đó.
    """
    uid = user_token.get("uid")
    try:
        auth.revoke_refresh_tokens(uid)
        return {
            "status": "success",
            "message": "Đăng xuất thành công, tất cả phiên bản token đã bị thu hồi."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi khi xử lý đăng xuất")

@app.get("/ai/tags", tags=["Models"])
async def get_available_models():
    """Return chatbot runtime metadata (model + loaded knowledge stats)."""
    rag_service = get_chat_rag_service()
    return rag_service.describe()


@app.post("/ai/chats", tags=["Chat"])
def create_chat_session(user_token: dict = Depends(verify_token)):
    """Tạo một phiên chat mới cho user hiện tại."""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    session_id = str(uuid.uuid4())
    chat_ref = db.collection("users").document(uid).collection("chats").document(session_id)
    chat_ref.set({
        "session_id": session_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "last_updated": firestore.SERVER_TIMESTAMP,
        "title": "Yuika Chat",
    })
    return {"session_id": session_id}


@app.get("/ai/chats", tags=["Chat"])
def list_chat_sessions(user_token: dict = Depends(verify_token), limit: int = 20):
    """Liệt kê các phiên chat (mặc định theo `last_updated` giảm dần)."""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    chats_ref = db.collection("users").document(uid).collection("chats").order_by("last_updated", direction=firestore.Query.DESCENDING).limit(limit)
    docs = chats_ref.stream()
    sessions = []
    for doc in docs:
        d = doc.to_dict() or {}
        created = d.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        sessions.append({
            "session_id": doc.id,
            "created_at": created,
            "last_message": d.get("last_message"),
        })
    return sessions


@app.post("/ai/chats/{session_id}/messages", tags=["Chat"])
def add_chat_message(session_id: str, msg: Message, user_token: dict = Depends(verify_token)):
    """Thêm một tin nhắn vào phiên chat (user hoặc assistant)."""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    messages_ref = db.collection("users").document(uid).collection("chats").document(session_id).collection("messages")
    messages_ref.add({
        "role": msg.role,
        "content": msg.content,
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    # cập nhật last_message trên document phiên
    chat_doc_ref = db.collection("users").document(uid).collection("chats").document(session_id)
    chat_doc_ref.set({"last_message": {"role": msg.role, "content": msg.content}, "last_updated": firestore.SERVER_TIMESTAMP}, merge=True)

    return {"status": "success"}


@app.get("/ai/chats/{session_id}/messages", tags=["Chat"])
def get_chat_messages(session_id: str, user_token: dict = Depends(verify_token)):
    """Lấy danh sách tin nhắn của một phiên, sắp xếp theo thời gian tăng dần."""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    messages_ref = db.collection("users").document(uid).collection("chats").document(session_id).collection("messages").order_by("created_at", direction=firestore.Query.ASCENDING)
    docs = messages_ref.stream()
    items = []
    for doc in docs:
        d = doc.to_dict() or {}
        created = d.get("created_at")
        if isinstance(created, datetime):
            created = created.isoformat()
        items.append({"role": d.get("role"), "content": d.get("content"), "created_at": created})
    return {"items": items}

@app.post("/ai/chat", tags=["Chat"])
async def chat_sync(request: ChatRequest):
    """Sync chat with local RAG (markdown docs + dataset + gesture mapping)."""
    try:
        logger = logging.getLogger("uvicorn.error")
        messages_dict = [msg.model_dump() for msg in request.messages]

        last_user = _get_last_user_message(messages_dict)
        if not last_user:
            raise HTTPException(status_code=400, detail="Khong tim thay tin nhan cua user")

        rag_service = get_chat_rag_service()
        reply_payload = rag_service.answer(user_message=last_user, messages=messages_dict[:-1], top_k=4)
        logger.debug("chat_sync gesture=%s sources=%s", reply_payload.get("gesture"), reply_payload.get("sources"))
        return reply_payload
    except Exception as e:
        logging.getLogger("uvicorn.error").exception("Error in chat_sync: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/chat/stream", tags=["Chat"])
async def chat_stream(request: ChatRequest):
    """SSE chat endpoint. Emits one JSON event with content + gesture + sources."""
    async def generate_chunks():
        logger = logging.getLogger("uvicorn.error")
        try:
            messages_dict = [msg.model_dump() for msg in request.messages]

            last_user = _get_last_user_message(messages_dict)
            if not last_user:
                yield f"data: {json.dumps({'error': 'No user message provided'})}\n\n"
                return

            rag_service = get_chat_rag_service()
            reply_payload = rag_service.answer(user_message=last_user, messages=messages_dict[:-1], top_k=4)
            yield f"data: {json.dumps(reply_payload, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.exception("Error: %s", e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate_chunks(), media_type="text/event-stream")


# --- CHẠY SERVER ---
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)