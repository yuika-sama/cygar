from fastapi import APIRouter

from app.schemas.common import DashboardData

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardData)
def get_dashboard() -> DashboardData:
    return DashboardData(
        total_sessions=12,
        total_users=5,
        total_recipes=20,
        total_wastes=18,
    )
