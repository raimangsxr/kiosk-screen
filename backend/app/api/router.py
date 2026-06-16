from fastapi import APIRouter

from app.api.ads import router as ads_router
from app.api.approved_domains import router as approved_domains_router
from app.api.auth import router as auth_router
from app.api.clients import router as clients_router
from app.api.configuration import router as configuration_router
from app.api.content import router as content_router
from app.api.display import router as display_router
from app.api.events import router as events_router
from app.api.health import router as health_router
from app.api.readiness import router as readiness_router
from app.api.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(display_router)
api_router.include_router(configuration_router)
api_router.include_router(content_router)
api_router.include_router(clients_router)
api_router.include_router(ads_router)
api_router.include_router(approved_domains_router)
api_router.include_router(events_router)
api_router.include_router(readiness_router)
api_router.include_router(users_router)
api_router.include_router(health_router)
