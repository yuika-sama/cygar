from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class ApiResponse(BaseModel):
    message: str
    data: Any | None = None


class DashboardData(BaseModel):
    total_sessions: int
    total_users: int
    total_recipes: int
    total_wastes: int


class SessionCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    note: str | None = None


class AnalyzeRequest(BaseModel):
    session_id: str
    waste_images: list[str] = Field(default_factory=list, description="List image URLs or base64 strings")


class AnalyzeResult(BaseModel):
    session_id: str
    recognized_wastes: list[str]
    confidence_scores: list[float]


class Recipe(BaseModel):
    id: str
    title: str
    difficulty: str
    estimated_minutes: int


class RecipeDetail(Recipe):
    description: str
    materials: list[str]
    steps: list[str]


class Model3D(BaseModel):
    id: str
    name: str
    waste_id: str
    model_url: str
    preview_image_url: str | None = None


class SessionHistoryItem(BaseModel):
    id: str
    created_at: datetime
    status: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    user_id: str
    role: str
    token: str


class LogoutRequest(BaseModel):
    user_id: str
    token: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserProfile(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str


class AdminUserCreate(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "user"


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None


class AdminSessionCreate(BaseModel):
    user_id: str
    title: str
    status: str = "pending"


class AdminSessionUpdate(BaseModel):
    title: str | None = None
    status: str | None = None


class AdminRecipeCreate(BaseModel):
    title: str
    description: str


class AdminRecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class AdminWasteCreate(BaseModel):
    name: str
    category: str | None = None
    model_3d_url: str | None = None


class AdminWasteUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    model_3d_url: str | None = None
