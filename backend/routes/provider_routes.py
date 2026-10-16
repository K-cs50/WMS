"""Tanker provider routes"""
import random, string
from datetime import datetime, timezone, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from pydantic import BaseModel
from database import get_db
from models import (
    ProviderProfile, Tanker, ProviderServiceArea, Booking,
    BookingStatus, WaterCategory, User, UserRole,
    DeliveryUpdate, BulkWaterRequest, BulkRequestMember,
    BulkRequestStatus, Locality, Notification, AlertType,
    NotificationChannel
)
from auth import get_current_user, require_provider

router = APIRouter(prefix="/api/providers", tags=["providers"])

# ─── Schemas ─────────────────────────────────────────────────────────────────

class TankerCreate(BaseModel):
    registration_number: str
    capacity_liters: int
    water_category: WaterCategory
    vehicle_type: Optional[str] = None

class TankerDispatch(BaseModel):
    locality_id: int
    delivery_address: Optional[str] = None
    consumer_notes: Optional[str] = None

class ServiceAreaUpdate(BaseModel):
    locality_ids: List[int]

class BookingCreate(BaseModel):
    provider_id: int
    locality_id: int
    delivery_address: str
    water_category: WaterCategory
    quantity_liters: int
    requested_date: Optional[date] = None
    consumer_notes: Optional[str] = None

class BookingAction(BaseModel):
    action: str  # accept, reject, start, deliver, cancel
    provider_notes: Optional[str] = None
    quoted_price: Optional[float] = None
    tanker_id: Optional[int] = None

class BulkRequestCreate(BaseModel):
    locality_id: int
    water_category: WaterCategory
    quantity_liters_per_unit: int
    description: Optional[str] = None

class BulkJoin(BaseModel):
    bulk_request_id: int
    quantity_liters: int
    delivery_address: str

# ─── Helpers ─────────────────────────────────────────────────────────────────

from sqlalchemy.orm import selectinload

def _gen_ref():
    return "WMS" + "".join(random.choices(string.ascii_uppercase + string.digits, k=7))

def _provider_dict(p: ProviderProfile) -> dict:
    tanker_count = 0
    try:
        tanker_count = len(p.tankers) if p.tankers is not None else 0
    except Exception:
        tanker_count = 0
    return {
        "id": p.id,
        "user_id": p.user_id,
        "business_name": p.business_name,
        "contact_name": p.contact_name,
        "contact_phone": p.contact_phone,
        "is_verified": p.is_verified,
        "operating_hours": p.operating_hours,
        "description": p.description,
        "tanker_count": tanker_count,
    }

def _booking_dict(b: Booking) -> dict:
    prov_name = None
    cons_name = None
    try:
        prov_name = b.provider.business_name if b.provider else None
    except Exception:
        pass
    try:
        cons_name = b.consumer.full_name if b.consumer else None
    except Exception:
        pass
    return {
        "id": b.id,
        "booking_reference": b.booking_reference,
        "consumer_id": b.consumer_id,
        "provider_id": b.provider_id,
        "locality_id": b.locality_id,
        "delivery_address": b.delivery_address,
        "water_category": b.water_category.value,
        "quantity_liters": b.quantity_liters,
        "quoted_price": b.quoted_price,
        "agreed_price": b.agreed_price,
        "status": b.status.value,
        "requested_date": b.requested_date.isoformat() if b.requested_date else None,
        "consumer_notes": b.consumer_notes,
        "provider_notes": b.provider_notes,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "is_bulk": b.is_bulk,
        "provider_name": prov_name,
        "consumer_name": cons_name,
    }

# ─── Provider Routes ──────────────────────────────────────────────────────────

@router.get("/")
async def list_providers(
    locality_id: Optional[int] = None,
    water_category: Optional[WaterCategory] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ProviderProfile).options(selectinload(ProviderProfile.tankers)).where(ProviderProfile.is_active == True)
    if locality_id:
        stmt = stmt.join(ProviderServiceArea).where(
            ProviderServiceArea.locality_id == locality_id,
            ProviderServiceArea.is_active == True
        )
    result = await db.execute(stmt)
    providers = result.scalars().unique().all()
    return [_provider_dict(p) for p in providers]


@router.get("/my-profile")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Provider profile not found")
    return {
        **_provider_dict(profile),
        "service_areas": [
            {"locality_id": sa.locality_id, "locality_name": sa.locality.name if sa.locality else None}
            for sa in (profile.service_areas or [])
        ],
        "tankers": [
            {
                "id": t.id,
                "registration_number": t.registration_number,
                "capacity_liters": t.capacity_liters,
                "water_category": t.water_category.value,
                "is_available": t.is_available,
            }
            for t in (profile.tankers or [])
        ]
    }


@router.put("/my-profile/service-areas")
async def update_service_areas(
    req: ServiceAreaUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Provider profile not found")

    # Remove old areas
    old_areas = await db.execute(
        select(ProviderServiceArea).where(ProviderServiceArea.provider_id == profile.id)
    )
    for area in old_areas.scalars().all():
        await db.delete(area)

    # Add new areas
    for loc_id in req.locality_ids:
        db.add(ProviderServiceArea(provider_id=profile.id, locality_id=loc_id))
    await db.commit()
    return {"message": "Service areas updated"}


@router.post("/tankers", status_code=201)
async def add_tanker(
    req: TankerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Provider profile not found")

    tanker = Tanker(
        provider_id=profile.id,
        registration_number=req.registration_number,
        capacity_liters=req.capacity_liters,
        water_category=req.water_category,
        vehicle_type=req.vehicle_type,
    )
    db.add(tanker)
    await db.commit()
    return {"message": "Tanker registered", "tanker_id": tanker.id}


@router.get("/tankers")
async def list_all_tankers(
    locality_id: Optional[int] = None,
    water_category: Optional[WaterCategory] = None,
    is_available: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all active tankers with live coordinates and service localities.
    If locality_id is provided, strictly filters to tankers whose provider explicitly
    serves that locality through ProviderServiceArea.
    """
    stmt = (
        select(Tanker)
        .options(
            selectinload(Tanker.provider).selectinload(ProviderProfile.service_areas).selectinload(ProviderServiceArea.locality),
            selectinload(Tanker.bookings)
        )
        .where(Tanker.is_active == True)
    )

    if water_category:
        stmt = stmt.where(Tanker.water_category == water_category)
    if is_available is not None:
        stmt = stmt.where(Tanker.is_available == is_available)

    result = await db.execute(stmt)
    tankers = result.scalars().unique().all()

    output = []
    for t in tankers:
        prov = t.provider
        supported_locs = []
        serves_selected = False
        if prov and prov.service_areas:
            for sa in prov.service_areas:
                if sa.is_active and sa.locality:
                    supported_locs.append({
                        "id": sa.locality.id,
                        "name": sa.locality.name,
                        "zone": sa.locality.zone,
                        "latitude": sa.locality.latitude,
                        "longitude": sa.locality.longitude,
                    })
                    if locality_id and sa.locality.id == locality_id:
                        serves_selected = True

        # If locality_id filter was requested, ensure this tanker strictly serves it!
        if locality_id and not serves_selected:
            continue

        # Check if currently active booking/dispatch exists
        current_dispatch = None
        if not t.is_available and t.bookings:
            for b in sorted(t.bookings, key=lambda x: x.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True):
                if b.status in [BookingStatus.in_progress, BookingStatus.accepted]:
                    loc_name = None
                    try:
                        loc_res = await db.execute(select(Locality).where(Locality.id == b.locality_id))
                        l_obj = loc_res.scalar_one_or_none()
                        loc_name = l_obj.name if l_obj else None
                    except Exception:
                        pass
                    current_dispatch = {
                        "booking_id": b.id,
                        "booking_reference": b.booking_reference,
                        "locality_id": b.locality_id,
                        "locality_name": loc_name,
                        "status": b.status.value,
                        "delivery_address": b.delivery_address,
                        "created_at": b.created_at.isoformat() if b.created_at else None,
                    }
                    break

        output.append({
            "id": t.id,
            "provider_id": t.provider_id,
            "provider_name": prov.business_name if prov else "Municipal Tanker Unit",
            "contact_name": prov.contact_name if prov else "Dispatcher",
            "contact_phone": prov.contact_phone if prov else "040-23227801",
            "is_provider_verified": prov.is_verified if prov else True,
            "registration_number": t.registration_number,
            "capacity_liters": t.capacity_liters,
            "water_category": t.water_category.value,
            "vehicle_type": t.vehicle_type or "Heavy Tanker",
            "is_available": t.is_available,
            "latitude": t.current_latitude,
            "longitude": t.current_longitude,
            "last_location_update": t.last_location_update.isoformat() if t.last_location_update else None,
            "supported_localities": supported_locs,
            "current_dispatch": current_dispatch,
        })

    return output


@router.post("/tankers/{tanker_id}/dispatch")
async def dispatch_tanker(
    tanker_id: int,
    req: TankerDispatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Location-based tanker dispatch.
    Validates target locality, checks provider service area eligibility,
    prevents conflicting dispatches on unavailable tankers, records dispatch,
    and updates live availability.
    """
    # 1. Validate target locality
    loc_res = await db.execute(select(Locality).where(Locality.id == req.locality_id, Locality.is_active == True))
    target_locality = loc_res.scalar_one_or_none()
    if not target_locality:
        raise HTTPException(404, "Target locality does not exist or is inactive")

    # 2. Fetch tanker with provider and service areas
    tanker_res = await db.execute(
        select(Tanker)
        .options(selectinload(Tanker.provider).selectinload(ProviderProfile.service_areas))
        .where(Tanker.id == tanker_id, Tanker.is_active == True)
    )
    tanker = tanker_res.scalar_one_or_none()
    if not tanker:
        raise HTTPException(404, "Tanker not found")

    # 3. Verify service area eligibility
    prov = tanker.provider
    if not prov:
        raise HTTPException(400, "Tanker has no associated provider profile")

    serves_locality = any(
        sa.locality_id == req.locality_id and sa.is_active
        for sa in (prov.service_areas or [])
    )
    if not serves_locality:
        raise HTTPException(
            400,
            f"Tanker {tanker.registration_number} ({prov.business_name}) does not serve {target_locality.name}. "
            f"Please select a tanker authorized for this locality."
        )

    # 4. Check current availability to prevent conflicting dispatches
    if not tanker.is_available:
        raise HTTPException(
            409,
            f"Tanker {tanker.registration_number} is already dispatched or currently unavailable. "
            f"Conflicting dispatch prevented."
        )

    # 5. Execute dispatch
    now_utc = datetime.now(timezone.utc)
    tanker.is_available = False
    tanker.last_location_update = now_utc
    # If tanker coordinates were empty or far, update nearby target locality
    if not tanker.current_latitude or not tanker.current_longitude:
        tanker.current_latitude = target_locality.latitude
        tanker.current_longitude = target_locality.longitude

    ref = _gen_ref()
    booking = Booking(
        consumer_id=current_user.id,
        provider_id=prov.id,
        tanker_id=tanker.id,
        locality_id=req.locality_id,
        delivery_address=req.delivery_address or f"Priority Municipal Dispatch — {target_locality.name}",
        water_category=tanker.water_category,
        quantity_liters=tanker.capacity_liters,
        requested_date=date.today(),
        consumer_notes=req.consumer_notes or f"Location-based operational dispatch by {current_user.full_name}",
        booking_reference=ref,
        status=BookingStatus.in_progress,
    )
    db.add(booking)
    await db.flush()

    # Record delivery tracking update
    update = DeliveryUpdate(
        booking_id=booking.id,
        status=BookingStatus.in_progress,
        latitude=tanker.current_latitude,
        longitude=tanker.current_longitude,
        is_simulated=True,
        note=f"Tanker {tanker.registration_number} dispatched to {target_locality.name} by {current_user.full_name}",
    )
    db.add(update)

    # Notify provider
    db.add(Notification(
        user_id=prov.user_id,
        title="Immediate Tanker Dispatch",
        message=f"Tanker {tanker.registration_number} was dispatched to {target_locality.name}. Booking Ref: {ref}.",
        alert_type=AlertType.booking_update,
    ))

    await db.commit()
    await db.refresh(tanker)

    return {
        "success": True,
        "message": f"Tanker {tanker.registration_number} successfully dispatched to {target_locality.name}",
        "booking_id": booking.id,
        "booking_reference": ref,
        "tanker_id": tanker.id,
        "locality_id": target_locality.id,
        "locality_name": target_locality.name,
        "status": "in_progress",
        "dispatched_at": now_utc.isoformat(),
    }


@router.post("/tankers/{tanker_id}/return")
async def return_tanker(
    tanker_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark dispatched tanker as returned/available after delivery."""
    tanker_res = await db.execute(
        select(Tanker)
        .options(selectinload(Tanker.bookings))
        .where(Tanker.id == tanker_id)
    )
    tanker = tanker_res.scalar_one_or_none()
    if not tanker:
        raise HTTPException(404, "Tanker not found")

    tanker.is_available = True
    tanker.last_location_update = datetime.now(timezone.utc)

    # Mark active in_progress booking as delivered
    for b in (tanker.bookings or []):
        if b.status == BookingStatus.in_progress:
            b.status = BookingStatus.delivered
            db.add(DeliveryUpdate(
                booking_id=b.id,
                status=BookingStatus.delivered,
                note=f"Service delivered and tanker returned to available status by {current_user.full_name}",
            ))

    await db.commit()
    return {"success": True, "message": f"Tanker {tanker.registration_number} marked as available."}


# ─── Booking Routes ───────────────────────────────────────────────────────────

@router.post("/bookings", status_code=201)
async def create_booking(
    req: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify provider exists and serves locality
    provider = await db.execute(
        select(ProviderProfile).where(
            ProviderProfile.id == req.provider_id,
            ProviderProfile.is_active == True
        )
    )
    provider_obj = provider.scalar_one_or_none()
    if not provider_obj:
        raise HTTPException(404, "Provider not found")

    booking = Booking(
        consumer_id=current_user.id,
        provider_id=req.provider_id,
        locality_id=req.locality_id,
        delivery_address=req.delivery_address,
        water_category=req.water_category,
        quantity_liters=req.quantity_liters,
        requested_date=req.requested_date or date.today(),
        consumer_notes=req.consumer_notes,
        booking_reference=_gen_ref(),
        status=BookingStatus.pending,
    )
    db.add(booking)

    # Notify provider
    notif = Notification(
        user_id=provider_obj.user_id,
        title="New Booking Request",
        message=f"New booking request from {current_user.full_name} for {req.quantity_liters}L of {req.water_category.value} water.",
        alert_type=AlertType.booking_update,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(booking)
    return {"booking_id": booking.id, "booking_reference": booking.booking_reference, "status": booking.status.value}


@router.get("/bookings/mine")
async def my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.provider:
        # Get provider profile
        result = await db.execute(
            select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return []
        stmt = select(Booking).where(Booking.provider_id == profile.id).order_by(desc(Booking.created_at))
    else:
        stmt = select(Booking).where(Booking.consumer_id == current_user.id).order_by(desc(Booking.created_at))

    result = await db.execute(stmt)
    bookings = result.scalars().all()
    return [_booking_dict(b) for b in bookings]


@router.put("/bookings/{booking_id}/action")
async def booking_action(
    booking_id: int,
    req: BookingAction,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    # Authorization
    if current_user.role == UserRole.provider:
        prov = await db.execute(
            select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
        )
        prov_obj = prov.scalar_one_or_none()
        if not prov_obj or booking.provider_id != prov_obj.id:
            raise HTTPException(403, "Not your booking")
    elif current_user.role == UserRole.consumer:
        if booking.consumer_id != current_user.id:
            raise HTTPException(403, "Not your booking")

    action_map = {
        "accept": BookingStatus.accepted,
        "reject": BookingStatus.rejected,
        "start": BookingStatus.in_progress,
        "deliver": BookingStatus.delivered,
        "cancel": BookingStatus.cancelled,
    }
    if req.action not in action_map:
        raise HTTPException(400, f"Unknown action. Valid: {list(action_map.keys())}")

    booking.status = action_map[req.action]
    if req.provider_notes:
        booking.provider_notes = req.provider_notes
    if req.quoted_price is not None:
        booking.quoted_price = req.quoted_price
    if req.tanker_id:
        booking.tanker_id = req.tanker_id

    # Add delivery update
    update = DeliveryUpdate(
        booking_id=booking.id,
        status=booking.status,
        is_simulated=True,
        note=f"Status changed to {booking.status.value} by {current_user.full_name}",
    )
    db.add(update)

    # Notify consumer
    notif = Notification(
        user_id=booking.consumer_id,
        title=f"Booking {booking.booking_reference} Update",
        message=f"Your booking status has been updated to: {booking.status.value}.",
        alert_type=AlertType.booking_update,
    )
    db.add(notif)
    await db.commit()
    return _booking_dict(booking)


@router.get("/bookings/{booking_id}/tracking")
async def get_tracking(booking_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DeliveryUpdate).where(DeliveryUpdate.booking_id == booking_id).order_by(DeliveryUpdate.created_at)
    )
    updates = result.scalars().all()
    return [
        {
            "status": u.status.value,
            "latitude": u.latitude,
            "longitude": u.longitude,
            "is_simulated": u.is_simulated,
            "note": u.note,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in updates
    ]


# ─── Bulk Request Routes ──────────────────────────────────────────────────────

@router.post("/bulk-requests", status_code=201)
async def create_bulk_request(
    req: BulkRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    bulk = BulkWaterRequest(
        locality_id=req.locality_id,
        created_by_id=current_user.id,
        water_category=req.water_category,
        quantity_liters_per_unit=req.quantity_liters_per_unit,
        description=req.description,
        threshold=10,  # configurable by admin
    )
    db.add(bulk)
    await db.flush()

    # Auto-join creator
    member = BulkRequestMember(
        bulk_request_id=bulk.id,
        user_id=current_user.id,
        quantity_liters=req.quantity_liters_per_unit,
    )
    db.add(member)
    await db.commit()
    return {"bulk_request_id": bulk.id, "message": "Bulk request created. You have been added as the first member."}


@router.post("/bulk-requests/join")
async def join_bulk_request(
    req: BulkJoin,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BulkWaterRequest).where(
            BulkWaterRequest.id == req.bulk_request_id,
            BulkWaterRequest.status == BulkRequestStatus.open,
        )
    )
    bulk = result.scalar_one_or_none()
    if not bulk:
        raise HTTPException(404, "Bulk request not found or not open")

    # Check already joined
    existing = await db.execute(
        select(BulkRequestMember).where(
            BulkRequestMember.bulk_request_id == req.bulk_request_id,
            BulkRequestMember.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "You have already joined this bulk request")

    member = BulkRequestMember(
        bulk_request_id=req.bulk_request_id,
        user_id=current_user.id,
        quantity_liters=req.quantity_liters,
        delivery_address=req.delivery_address,
    )
    db.add(member)
    await db.flush()

    # Count members
    count_result = await db.execute(
        select(BulkRequestMember).where(BulkRequestMember.bulk_request_id == req.bulk_request_id)
    )
    member_count = len(count_result.scalars().all())

    if member_count >= bulk.threshold:
        bulk.status = BulkRequestStatus.threshold_met
        notif = Notification(
            user_id=bulk.created_by_id,
            title="Bulk Request Threshold Reached!",
            message=f"Your bulk water request has reached {bulk.threshold} members and is now eligible for provider matching.",
            alert_type=AlertType.bulk_threshold,
        )
        db.add(notif)

    await db.commit()
    return {
        "message": "Joined bulk request",
        "member_count": member_count,
        "threshold": bulk.threshold,
        "threshold_met": member_count >= bulk.threshold
    }


@router.get("/bulk-requests/locality/{locality_id}")
async def list_bulk_requests(locality_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BulkWaterRequest)
        .where(BulkWaterRequest.locality_id == locality_id)
        .order_by(desc(BulkWaterRequest.created_at))
    )
    requests = result.scalars().all()
    out = []
    for r in requests:
        count_res = await db.execute(
            select(BulkRequestMember).where(BulkRequestMember.bulk_request_id == r.id)
        )
        member_count = len(count_res.scalars().all())
        out.append({
            "id": r.id,
            "locality_id": r.locality_id,
            "water_category": r.water_category.value,
            "quantity_liters_per_unit": r.quantity_liters_per_unit,
            "threshold": r.threshold,
            "member_count": member_count,
            "status": r.status.value,
            "description": r.description,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return out
