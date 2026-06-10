from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_schema
from .routes import admin, chat


def create_app() -> FastAPI:
    init_schema()
    app = FastAPI(title="RefundAgent API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True}

    return app


app = create_app()
