"""WMS — Water Management Supply: FastAPI Backend"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from config import settings
from routes.auth_routes import router as auth_router
from routes.locality_routes import router as locality_router
from routes.report_routes import router as report_router
from routes.provider_routes import router as provider_router
from routes.misc_routes import (
    notif_router, alert_router, weather_router, map_router,
    forecast_router, contact_router, sources_router, admin_router, ai_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="WMS — Water Management Supply API",
    description="Community Water Intelligence, Supply Monitoring & Tanker Delivery Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
for router in [
    auth_router, locality_router, report_router, provider_router,
    notif_router, alert_router, weather_router, map_router,
    forecast_router, contact_router, sources_router, admin_router, ai_router
]:
    app.include_router(router)

@app.get("/")
async def root():
    return {
        "app": "WMS — Water Management Supply",
        "version": "1.0.0",
        "tagline": "Know Your Water. Plan Ahead. Stay Connected.",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
