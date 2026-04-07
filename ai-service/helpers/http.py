import httpx
from fastapi import HTTPException, status


async def download_image_bytes(image_url: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            return response.content
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không thể tải ảnh từ Cloudinary: {image_url}",
        ) from exc
