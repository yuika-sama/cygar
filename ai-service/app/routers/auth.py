from fastapi import APIRouter

from app.schemas.common import ApiResponse, LoginRequest, LoginResponse, LogoutRequest, RegisterRequest

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    return LoginResponse(user_id="u001", role="user", token="sample-jwt-token")


@router.post("/logout", response_model=ApiResponse)
def logout(payload: LogoutRequest) -> ApiResponse:
    return ApiResponse(message="Logged out", data={"user_id": payload.user_id})


@router.post("/register", response_model=ApiResponse)
def register(payload: RegisterRequest) -> ApiResponse:
    return ApiResponse(
        message="User registered",
        data={"id": "u002", "full_name": payload.full_name, "email": payload.email},
    )
