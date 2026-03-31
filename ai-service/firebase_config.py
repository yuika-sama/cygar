import firebase_admin
from firebase_admin import credentials, auth
import os

# Khởi tạo Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

def verify_token(token: str):
    try:
        # Giải mã và kiểm tra token từ client gửi lên
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        return None