"""
DIME Backend — FastAPI Application Entry Point.

This is the main DIME backend server. It provides:
- REST API endpoints under /api/v1/
- Health and readiness probes
- CORS configuration for the Next.js frontend
- Structured error handling
- Structured logging

Run with:
    uvicorn backend.main:app --reload --port 8000
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.v1.router import api_v1_router
from backend.core.config import get_settings
from backend.core.exceptions import DimeError
from backend.core.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup and shutdown hooks."""
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info(
        "dime_backend_starting",
        environment=settings.environment,
        cors_origins=settings.cors_origins,
    )
    yield
    logger.info("dime_backend_shutting_down")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="DIME — AI Product Intelligence API",
        description=(
            "Backend API for the DIME AI Product Intelligence & "
            "Idea Validation Platform."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.is_development else None,
        redoc_url="/api/redoc" if settings.is_development else None,
    )

    # ── CORS ──────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────
    def _cors_headers(request: Request) -> dict[str, str]:
        origin = request.headers.get("origin")
        if origin and (origin in settings.cors_origins or "*" in settings.cors_origins):
            return {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        return {}

    @app.exception_handler(DimeError)
    async def dime_error_handler(request: Request, exc: DimeError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": type(exc).__name__,
                "message": exc.message,
                "detail": exc.detail,
            },
            headers=_cors_headers(request),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("unhandled_error at %s: %s", request.url, exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred",
                "detail": {},
            },
            headers=_cors_headers(request),
        )

    # ── Routes ────────────────────────────────────────────────
    app.include_router(api_v1_router)

    # ── Root redirect ─────────────────────────────────────────
    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, Any]:
        return {
            "service": "DIME Backend API",
            "version": "0.1.0",
            "docs": "/api/docs",
        }

    return app


# Module-level app instance for uvicorn
app = create_app()
