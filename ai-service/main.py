import os
import httpx
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv

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

app = FastAPI(title="Firebase FastAPI Backend")
security = HTTPBearer()


# --- MODEL DỮ LIỆU ---
class LoginRequest(BaseModel):
    email: str
    password: str


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

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)

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
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu người dùng")

    user_data = doc.to_dict()
    viewed_recipes = user_data.get("viewed_recipes", [])

    return {
        "usage_count": user_data.get("usage_count", 0),
        "viewed_history_count": len(viewed_recipes)
    }


@app.get("/history")
def get_history(user_token: dict = Depends(verify_token)):
    """Lấy 10 lịch sử gần nhất của user"""
    uid = user_token.get("uid")
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu người dùng")

    user_data = doc.to_dict()
    history = user_data.get("history", [])

    # Sắp xếp lịch sử theo timestamp mới nhất (nếu cần) và giới hạn 10 phần tử
    # Giả định dữ liệu history đã được lưu theo thứ tự, cắt lấy 10:
    recent_history = history[:10]

    return recent_history


@app.post("/execute")
async def execute(
        images: List[UploadFile] = File(...),
        user_token: dict = Depends(verify_token)
):
    """
    Nhận danh sách hình ảnh -> Xử lý logic -> Trả về kết quả
    """
    # 1. Xử lý logic nhận diện (Tự implement)
    # Placeholder data:
    detection_logic = {
        "materials": ["Gỗ Sồi", "Sắt mạ kẽm"],
        "processed_images": [img.filename for img in images]
    }

    # 2. Xử lý logic gợi ý (Tự implement)
    # Placeholder data (Hiện không yêu cầu trả về trong output cuối nhưng có thể dùng nội bộ):
    suggestion_logic = [
        {"title": "Bàn làm việc vintage", "likes": 120, "link": "https://example.com/item1"}
    ]

    # 3. Xử lý logic mở rộng (Tự implement)
    # Placeholder data:
    expansion_logic = [
        {"title": "Cách bảo quản gỗ sồi", "likes": 345, "link": "https://example.com/blog1"},
        {"title": "Tự làm chân bàn sắt", "likes": 89, "link": "https://example.com/blog2"}
    ]

    # 4. Trả kết quả gom nhóm
    return {
        "detection_result": detection_logic,
        "expansion_result": expansion_logic
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