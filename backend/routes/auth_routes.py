"""Auth routes: register, login, logout, profile"""
import random, string
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, validator
from database import get_db
from models import User, UserRole, ProviderProfile, AuditEvent
from auth import (
    verify_password, hash_password, create_access_token,
    get_current_user, settings
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ─── Schemas ─────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.consumer
    city_id: Optional[int] = None
    locality_id: Optional[int] = None
    # Provider-specific
    business_name: Optional[str] = None
    contact_phone: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    city_id: Optional[int] = None
    locality_id: Optional[int] = None
    phone: Optional[str] = None
    preferred_alert_channel: Optional[str] = None

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "city_id": user.city_id,
        "locality_id": user.locality_id,
        "preferred_alert_channel": user.preferred_alert_channel.value if user.preferred_alert_channel else "in_app",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.email and not req.phone:
        raise HTTPException(400, "Email or phone is required")

    # Check uniqueness
    if req.email:
        existing = await db.execute(select(User).where(User.email == req.email))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Email already registered")
    if req.phone:
        existing = await db.execute(select(User).where(User.phone == req.phone))
        if existing.scalar_one_or_none():
            raise HTTPException(400, "Phone already registered")

    user = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=hash_password(req.password),
        role=req.role,
        city_id=req.city_id,
        locality_id=req.locality_id,
    )
    db.add(user)
    await db.flush()

    if req.role == UserRole.provider:
        if not req.business_name:
            raise HTTPException(400, "business_name is required for providers")
        profile = ProviderProfile(
            user_id=user.id,
            business_name=req.business_name,
            contact_phone=req.contact_phone or req.phone,
            contact_email=req.email,
        )
        db.add(profile)

    audit = AuditEvent(user_id=user.id, action="user_register", resource_type="user", resource_id=user.id)
    db.add(audit)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": _user_to_dict(user)}


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    identifier = form_data.username
    # Try email first, then phone
    result = await db.execute(select(User).where(User.email == identifier))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.phone == identifier))
        user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(400, "Account is deactivated")

    token = create_access_token({"sub": str(user.id)})
    audit = AuditEvent(user_id=user.id, action="user_login", resource_type="user", resource_id=user.id)
    db.add(audit)
    await db.commit()
    return {"access_token": token, "token_type": "bearer", "user": _user_to_dict(user)}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_dict(current_user)


@router.put("/me")
async def update_profile(
    req: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.city_id is not None:
        current_user.city_id = req.city_id
    if req.locality_id is not None:
        current_user.locality_id = req.locality_id
    if req.phone is not None:
        current_user.phone = req.phone
    await db.commit()
    await db.refresh(current_user)
    return _user_to_dict(current_user)
