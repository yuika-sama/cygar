import io
import os
from pathlib import Path

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from fastapi import HTTPException, status


def ensure_cloudinary_config() -> None:
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
    if not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Thiếu cấu hình Cloudinary. "
                "Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong file .env"
            ),
        )

    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )


def build_cloudinary_image_url(public_id: str) -> str:
    ensure_cloudinary_config()
    secure_url, _ = cloudinary.utils.cloudinary_url(public_id, secure=True)
    return secure_url


def upload_webp_to_cloudinary(uid: str, session_id: str, filename: str, content: bytes) -> tuple[str, str]:
    ensure_cloudinary_config()
    upload_folder = f"{os.getenv('CLOUDINARY_FOLDER', 'cygar')}/users/{uid}/sessions/{session_id}"
    public_id = f"{upload_folder}/{Path(filename).stem}"

    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            resource_type="image",
            public_id=public_id,
            format="webp",
            overwrite=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Upload ảnh lên Cloudinary thất bại. "
                "Vui lòng kiểm tra CLOUDINARY_* trong .env. "
                f"Chi tiết: {exc}"
            ),
        ) from exc

    uploaded_public_id = result.get("public_id")
    uploaded_url = result.get("secure_url")
    if not uploaded_public_id or not uploaded_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary không trả về public_id/secure_url hợp lệ.",
        )

    return uploaded_public_id, uploaded_url
