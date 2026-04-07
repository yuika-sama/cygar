import os
import io
import httpx
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any

import numpy as np
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv
from ultralytics import YOLO

from utils.train import OptimizedRecyclingRecommender

# --- TẢI BIẾN MÔI TRƯỜNG TỪ FILE .env ---
load_dotenv() # CHÚ Ý: Bắt buộc phải gọi hàm này trước khi dùng os.getenv

# --- KHỞI TẠO FIREBASE ---
# Đường dẫn tới file service account tải từ Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Lấy từ Firebase Console -> Project Settings -> General -> Web API Key
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
FIREBASE_SSL_VERIFY = os.getenv("FIREBASE_SSL_VERIFY", "true").lower() != "false"
FIREBASE_CA_BUNDLE = os.getenv("FIREBASE_CA_BUNDLE")

app = FastAPI(title="Firebase FastAPI Backend")
security = HTTPBearer()

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATHS = [
    BASE_DIR / "utils" / "models" / "waste_classification.pt",
    BASE_DIR / "utils" / "models" / "waste_classifcation.pt",
]
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

_waste_detector: YOLO | None = None
_recommender: OptimizedRecyclingRecommender | None = None


# --- MODEL DỮ LIỆU ---
class LoginRequest(BaseModel):
    email: str
    password: str


class ExecuteRequest(BaseModel):
    session_id: str


def _to_firestore_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _to_firestore_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_firestore_safe(v) for v in value]
    if isinstance(value, (np.integer, np.floating)):
        return value.item()
    return value


def get_waste_detector() -> YOLO:
    global _waste_detector
    if _waste_detector is not None:
        return _waste_detector

    model_path = next((path for path in MODEL_PATHS if path.exists()), None)
    if model_path is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không tìm thấy model waste_classification.pt trong utils/models"
        )

    _waste_detector = YOLO(str(model_path))
    return _waste_detector


def get_recommender() -> OptimizedRecyclingRecommender:
    global _recommender
    if _recommender is not None:
        return _recommender

    recommender = OptimizedRecyclingRecommender(model_dir=str(BASE_DIR / "utils" / "models" / "recommender_cache"))
    dataset_paths = [
        str(BASE_DIR / "utils" / "dataset" / "projects_craft.csv"),
        str(BASE_DIR / "utils" / "dataset" / "projects_workshop.csv"),
    ]
    recommender.train_or_load_model(file_paths=dataset_paths, force_retrain=False)
    _recommender = recommender
    return _recommender


def _ensure_user_document(uid: str, token_payload: Dict[str, Any]) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    snapshot = user_ref.get()
    if snapshot.exists:
        return snapshot.to_dict() or {}

    user_doc = {
        "display_name": token_payload.get("name") or token_payload.get("display_name"),
        "email": token_payload.get("email"),
        "usage_count": 0,
        "last_updated": firestore.SERVER_TIMESTAMP,
        "history": [],
        "viewed_recipes": [],
    }
    user_ref.set(user_doc, merge=True)
    return user_doc


def _build_history_record(
    execution_id: str,
    session_id: str,
    primary_label: str | None,
    detected_count: int,
) -> Dict[str, Any]:
    return {
        "action": "execute",
        "target_id": execution_id,
        "session_id": session_id,
        "target_name": primary_label or "unknown",
        "detected_count": detected_count,
        "timestamp": datetime.now(timezone.utc),
    }


def _build_public_image_url(relative_path: str) -> str:
    base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
    return f"{base_url}/{relative_path.lstrip('/')}"


# --- MIDDLEWARE / DEPENDENCY XÁC MINH TOKEN ---
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Xác minh Bearer token gửi lên từ client qua Firebase Admin SDK"""
    token = credentials.credentials
    try:
        # Giải mã và xác thực token
        decoded_token = auth.verify_id_token(token)
        return decoded_token  # Trả về payload của user (chứa uid, email...)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )


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

    user_data = _ensure_user_document(uid, user_token)
    viewed_recipes = user_data.get("viewed_recipes", [])
    if not isinstance(viewed_recipes, list):
        viewed_recipes = []

    return {
        "usage_count": user_data.get("usage_count", 0),
        "viewed_history_count": len(viewed_recipes)
    }


@app.get("/history")
def get_history(user_token: dict = Depends(verify_token)):
    """Lấy 10 lịch sử gần nhất của user"""
    uid = user_token.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không chứa uid")

    user_data = _ensure_user_document(uid, user_token)
    history = user_data.get("history", [])
    if not isinstance(history, list):
        history = []

    # Sắp xếp lịch sử theo timestamp mới nhất (nếu cần) và giới hạn 10 phần tử
    # Giả định dữ liệu history đã được lưu theo thứ tự, cắt lấy 10:
    recent_history = history[:10]

    return recent_history


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
    session_upload_dir = UPLOADS_DIR / uid / session_id
    session_upload_dir.mkdir(parents=True, exist_ok=True)

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
        webp_filename = f"{image_stem}.webp"
        webp_path = session_upload_dir / webp_filename
        pil_image.save(webp_path, format="WEBP", quality=80, method=6)

        relative_path = str(webp_path.relative_to(BASE_DIR)).replace("\\", "/")
        image_records.append({
            "original_name": image.filename,
            "converted_name": webp_filename,
            "relative_path": relative_path,
            "image_url": _build_public_image_url(relative_path),
            "mime_type": "image/webp",
            "width": width,
            "height": height,
            "size_bytes": webp_path.stat().st_size,
        })

    if not image_records:
        raise HTTPException(status_code=400, detail="Không có ảnh hợp lệ để tạo session")

    user_ref = db.collection("users").document(uid)
    current_user_data = _ensure_user_document(uid, user_token)

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
    current_user_data = _ensure_user_document(uid, user_token)

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
        relative_path = session_image.get("relative_path")
        if not relative_path:
            continue

        image_path = BASE_DIR / Path(str(relative_path).replace("/", os.sep))
        if not image_path.exists():
            continue

        try:
            pil_image = Image.open(image_path).convert("RGB")
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
            "converted_name": session_image.get("converted_name") or image_path.name,
            "relative_path": str(relative_path).replace("\\", "/"),
            "image_url": session_image.get("image_url") or _build_public_image_url(str(relative_path)),
            "mime_type": session_image.get("mime_type", "image/webp"),
            "width": width,
            "height": height,
            "size_bytes": image_path.stat().st_size,
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
        _build_history_record(execution_id, req.session_id, primary_label, len(detected_labels))
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


# --- CHẠY SERVER ---
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)