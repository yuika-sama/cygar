from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, auth, dashboard, recipes, sessions, users

app = FastAPI(
    title="Cygar API",
    version="0.1.0",
    description="Backend skeleton for recycling dashboard, sessions, AR/3D and admin modules.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(sessions.router)
app.include_router(recipes.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
