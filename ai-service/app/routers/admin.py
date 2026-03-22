from fastapi import APIRouter, Path

from app.schemas.common import (
    AdminRecipeCreate,
    AdminRecipeUpdate,
    AdminSessionCreate,
    AdminSessionUpdate,
    AdminUserCreate,
    AdminUserUpdate,
    AdminWasteCreate,
    AdminWasteUpdate,
    ApiResponse,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# Admin users CRUD
@router.get("/users", response_model=ApiResponse)
def list_users() -> ApiResponse:
    return ApiResponse(message="Admin list users", data=[{"id": "u001", "role": "user"}])


@router.post("/users", response_model=ApiResponse)
def create_user(payload: AdminUserCreate) -> ApiResponse:
    return ApiResponse(message="Admin create user", data={"id": "u_new", **payload.model_dump()})


@router.get("/users/{user_id}", response_model=ApiResponse)
def get_user(user_id: str = Path(..., description="User ID")) -> ApiResponse:
    return ApiResponse(message="Admin get user", data={"id": user_id, "role": "user"})


@router.put("/users/{user_id}", response_model=ApiResponse)
def update_user(
    payload: AdminUserUpdate,
    user_id: str = Path(..., description="User ID"),
) -> ApiResponse:
    return ApiResponse(message="Admin update user", data={"id": user_id, **payload.model_dump()})


@router.delete("/users/{user_id}", response_model=ApiResponse)
def delete_user(user_id: str = Path(..., description="User ID")) -> ApiResponse:
    return ApiResponse(message="Admin delete user", data={"id": user_id})


# Admin session CRUD
@router.get("/session", response_model=ApiResponse)
def admin_list_sessions() -> ApiResponse:
    return ApiResponse(message="Admin list sessions", data=[{"id": "s001", "status": "completed"}])


@router.post("/session", response_model=ApiResponse)
def admin_create_session(payload: AdminSessionCreate) -> ApiResponse:
    return ApiResponse(message="Admin create session", data={"id": "s_new", **payload.model_dump()})


@router.get("/session/{session_id}", response_model=ApiResponse)
def admin_get_session(session_id: str = Path(..., description="Session ID")) -> ApiResponse:
    return ApiResponse(message="Admin get session", data={"id": session_id, "status": "pending"})


@router.put("/session/{session_id}", response_model=ApiResponse)
def admin_update_session(
    payload: AdminSessionUpdate,
    session_id: str = Path(..., description="Session ID"),
) -> ApiResponse:
    return ApiResponse(message="Admin update session", data={"id": session_id, **payload.model_dump()})


@router.delete("/session/{session_id}", response_model=ApiResponse)
def admin_delete_session(session_id: str = Path(..., description="Session ID")) -> ApiResponse:
    return ApiResponse(message="Admin delete session", data={"id": session_id})


# Admin recipes CRUD
@router.get("/recipes", response_model=ApiResponse)
def admin_list_recipes() -> ApiResponse:
    return ApiResponse(message="Admin list recipes", data=[{"id": "r1", "title": "Sample recipe"}])


@router.post("/recipes", response_model=ApiResponse)
def admin_create_recipe(payload: AdminRecipeCreate) -> ApiResponse:
    return ApiResponse(message="Admin create recipe", data={"id": "r_new", **payload.model_dump()})


@router.get("/recipes/{recipe_id}", response_model=ApiResponse)
def admin_get_recipe(recipe_id: str = Path(..., description="Recipe ID")) -> ApiResponse:
    return ApiResponse(message="Admin get recipe", data={"id": recipe_id, "title": "Sample recipe"})


@router.put("/recipes/{recipe_id}", response_model=ApiResponse)
def admin_update_recipe(
    payload: AdminRecipeUpdate,
    recipe_id: str = Path(..., description="Recipe ID"),
) -> ApiResponse:
    return ApiResponse(message="Admin update recipe", data={"id": recipe_id, **payload.model_dump()})


@router.delete("/recipes/{recipe_id}", response_model=ApiResponse)
def admin_delete_recipe(recipe_id: str = Path(..., description="Recipe ID")) -> ApiResponse:
    return ApiResponse(message="Admin delete recipe", data={"id": recipe_id})


# Admin wastes CRUD (including 3D model management)
@router.get("/wastes", response_model=ApiResponse)
def admin_list_wastes() -> ApiResponse:
    return ApiResponse(
        message="Admin list wastes",
        data=[{"id": "w1", "name": "plastic bottle", "model_3d_url": "https://cdn.example.com/pot.glb"}],
    )


@router.post("/wastes", response_model=ApiResponse)
def admin_create_waste(payload: AdminWasteCreate) -> ApiResponse:
    return ApiResponse(message="Admin create waste", data={"id": "w_new", **payload.model_dump()})


@router.get("/wastes/{waste_id}", response_model=ApiResponse)
def admin_get_waste(waste_id: str = Path(..., description="Waste ID")) -> ApiResponse:
    return ApiResponse(message="Admin get waste", data={"id": waste_id, "name": "plastic bottle"})


@router.put("/wastes/{waste_id}", response_model=ApiResponse)
def admin_update_waste(
    payload: AdminWasteUpdate,
    waste_id: str = Path(..., description="Waste ID"),
) -> ApiResponse:
    return ApiResponse(message="Admin update waste", data={"id": waste_id, **payload.model_dump()})


@router.delete("/wastes/{waste_id}", response_model=ApiResponse)
def admin_delete_waste(waste_id: str = Path(..., description="Waste ID")) -> ApiResponse:
    return ApiResponse(message="Admin delete waste", data={"id": waste_id})
