"""Aggregated API v1 router mounting all domain route modules."""

from fastapi import APIRouter

from app.api.v1.adaptive import router as adaptive_router
from app.api.v1.admin import router as admin_router
from app.api.v1.attempts import router as attempts_router
from app.api.v1.auth import router as auth_router
from app.api.v1.classes import router as classes_router
from app.api.v1.consents import router as consents_router
from app.api.v1.curricula import router as curricula_router
from app.api.v1.data_rights import router as data_rights_router
from app.api.v1.mastery import router as mastery_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.questions import router as questions_router
from app.api.v1.skills import router as skills_router
from app.api.v1.sync import router as sync_router
from app.api.v1.tutor import router as tutor_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(classes_router)
api_v1_router.include_router(profiles_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(consents_router)
api_v1_router.include_router(data_rights_router)
api_v1_router.include_router(curricula_router)
api_v1_router.include_router(skills_router)
api_v1_router.include_router(questions_router)
api_v1_router.include_router(attempts_router)
api_v1_router.include_router(mastery_router)
api_v1_router.include_router(sync_router)
api_v1_router.include_router(adaptive_router)
api_v1_router.include_router(tutor_router)
