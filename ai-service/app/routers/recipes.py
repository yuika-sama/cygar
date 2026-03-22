from fastapi import APIRouter, Path

from app.schemas.common import Recipe, RecipeDetail

router = APIRouter(tags=["recipes"])


@router.get("/recipes", response_model=list[Recipe])
def get_recipes() -> list[Recipe]:
    return [
        Recipe(id="r1", title="Chau cay tu chai nhua", difficulty="easy", estimated_minutes=30),
        Recipe(id="r2", title="Khay dung but tu vo hop", difficulty="medium", estimated_minutes=40),
    ]


@router.get("/recipes/{recipe_id}", response_model=RecipeDetail)
def get_recipe_by_id(recipe_id: str = Path(..., description="Recipe ID")) -> RecipeDetail:
    return RecipeDetail(
        id=recipe_id,
        title="Mau cong thuc tai che",
        difficulty="easy",
        estimated_minutes=30,
        description="Mo ta chi tiet cong thuc.",
        materials=["chai nhua", "keo nen"],
        steps=["Lam sach vat lieu", "Ghep cac thanh phan", "Hoan thien"],
    )
