from fastapi import APIRouter

from app.api.v1.ads.routes import router as ads_router
from app.api.v1.api_keys.routes import router as api_keys_router
from app.api.v1.auth.routes import router as auth_router
from app.api.v1.content.routes import router as content_router
from app.api.v1.display.routes import configuration_router, display_router
from app.api.v1.events.routes import router as events_router
from app.api.v1.health.routes import router as health_router
from app.api.iframes import router as iframes_router
from app.api.v1.media.routes import router as media_router
from app.api.v1.public_content.routes import router as public_content_router
from app.api.v1.readiness.routes import router as readiness_router
from app.api.v1.users.routes import router as users_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(display_router)
api_v1_router.include_router(configuration_router)
api_v1_router.include_router(content_router)
api_v1_router.include_router(iframes_router)
api_v1_router.include_router(ads_router)
api_v1_router.include_router(media_router)
api_v1_router.include_router(events_router)
api_v1_router.include_router(readiness_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(public_content_router)
api_v1_router.include_router(health_router)
