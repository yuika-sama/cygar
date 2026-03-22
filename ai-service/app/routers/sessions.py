from datetime import datetime

from fastapi import APIRouter, Path

from app.schemas.common import (
    AnalyzeRequest,
    AnalyzeResult,
    ApiResponse,
    Model3D,
    Recipe,
    SessionCreateRequest,
    SessionHistoryItem,
)

router = APIRouter(tags=["sessions"])


@router.post("/session", response_model=ApiResponse)
def create_session(payload: SessionCreateRequest) -> ApiResponse:
    return ApiResponse(
        message="Session created",
        data={
            "id": "s001",
            "name": payload.name,
            "note": payload.note,
            "status": "created",
        },
    )


@router.post("/session/analyze", response_model=ApiResponse)
def submit_analysis(payload: AnalyzeRequest) -> ApiResponse:
    return ApiResponse(
        message="Analysis submitted",
        data={
            "session_id": payload.session_id,
            "total_images": len(payload.waste_images),
            "status": "processing",
        },
    )


@router.get("/session/analyze", response_model=AnalyzeResult)
def get_analysis_result() -> AnalyzeResult:
    return AnalyzeResult(
        session_id="s001",
        recognized_wastes=["plastic_bottle", "cardboard"],
        confidence_scores=[0.97, 0.88],
    )


@router.get("/session/analyze/recipes", response_model=list[Recipe])
def get_analysis_recipes() -> list[Recipe]:
    return [
        Recipe(id="r1", title="Chau cay tu chai nhua", difficulty="easy", estimated_minutes=30),
        Recipe(id="r3", title="Hop dung giay tai che", difficulty="medium", estimated_minutes=45),
    ]


@router.get("/session/3D", response_model=list[Model3D])
def get_3d_models() -> list[Model3D]:
    return [
        Model3D(
            id="m1",
            name="Pot Model",
            waste_id="w_plastic_bottle",
            model_url="https://cdn.example.com/models/pot.glb",
            preview_image_url="https://cdn.example.com/previews/pot.png",
        )
    ]


@router.get("/session/AR", response_model=ApiResponse)
def get_ar_payload() -> ApiResponse:
    return ApiResponse(
        message="AR payload",
        data={
            "models": [
                {
                    "id": "m1",
                    "name": "Pot Model",
                    "waste_id": "w_plastic_bottle",
                    "model_url": "https://cdn.example.com/models/pot.glb",
                }
            ],
            "recipes": [
                {
                    "id": "r1",
                    "title": "Chau cay tu chai nhua",
                    "difficulty": "easy",
                }
            ],
        },
    )


@router.get("/session/history", response_model=list[SessionHistoryItem])
def get_session_history() -> list[SessionHistoryItem]:
    now = datetime.utcnow()
    return [
        SessionHistoryItem(id="s001", created_at=now, status="completed"),
        SessionHistoryItem(id="s002", created_at=now, status="processing"),
    ]


@router.get("/session/history/{session_id}", response_model=ApiResponse)
def get_session_history_detail(
    session_id: str = Path(..., description="Session history ID"),
) -> ApiResponse:
    return ApiResponse(
        message="Session history detail",
        data={
            "id": session_id,
            "status": "completed",
            "recognized_wastes": ["plastic_bottle", "paper"],
        },
    )
