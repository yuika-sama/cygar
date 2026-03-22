from fastapi import APIRouter

from app.schemas.common import UserProfile

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserProfile)
def get_current_user() -> UserProfile:
    return UserProfile(
        id="u001",
        full_name="Demo User",
        email="demo.user@example.com",
        role="user",
    )
