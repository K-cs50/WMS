"""Supply report routes with reliability scoring and multi-locality broadcast capabilities"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from database import get_db
from models import (
    SupplyReport, ReportType, ReportStatus, ReliabilityScore,
    SupplySchedule, Locality, Notification, AlertSubscription,
    AlertType, NotificationChannel, User, UserRole, VerificationStatus
)
from auth import get_current_user
from reliability import calculate_reliability

router = APIRouter(prefix="/api/reports", tags=["reports"])

RATE_LIMIT_MINUTES = 5  # Min gap between regular citizen reports per user per locality

# ─── Schemas ─────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    locality_id: int
    report_type: ReportType
    observed_at: datetime
    note: Optional[str] = None
    water_availability_status: Optional[str] = None
    expected_supply_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_stop_time: Optional[str] = None
    source: Optional[str] = "Community Ground Report"
    is_demo: bool = False

class BroadcastCreate(BaseModel):
    locality_id: int
    affected_locality_ids: Optional[List[int]] = None
    report_type: ReportType
    observed_at: Optional[datetime] = None
    date: Optional[str] = None
    expected_supply_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_stop_time: Optional[str] = None
    water_availability_status: str
    description: str
    source: str
    source_url: Optional[str] = None
    is_official: bool = False

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _compute_verification_status(r: SupplyReport) -> str:
    """Compute dynamic verification status based on source authority, age, and moderation."""
    if r.is_official:
        return "official"
    
    # Check if outdated (observed or submitted > 2 hours ago for active timing status)
    now = datetime.now(timezone.utc)
    obs = r.observed_at
    if obs and obs.tzinfo is None:
        obs = obs.replace(tzinfo=timezone.utc)
    if obs and (now - obs).total_seconds() > 7200:
        return "outdated"
        
    if r.status == ReportStatus.flagged:
        return "conflicting"
    if r.status == ReportStatus.verified:
        return "community_reported"
    if r.verification_status:
        return r.verification_status
    return "unverified"

def _report_dict(r: SupplyReport, include_reporter: bool = True) -> dict:
    computed_status = _compute_verification_status(r)
    return {
        "id": r.id,
        "locality_id": r.locality_id,
        "locality_name": r.locality.name if r.locality else None,
        "latitude": r.locality.latitude if r.locality else None,
        "longitude": r.locality.longitude if r.locality else None,
        "reporter_name": r.reporter.full_name if (r.reporter and include_reporter) else "Community Citizen",
        "reporter_role": r.reporter.role.value if r.reporter else "consumer",
        "report_type": r.report_type.value,
        "observed_at": r.observed_at.isoformat() if r.observed_at else None,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "note": r.note,
        "status": r.status.value,
        "verification_status": computed_status,
        "is_broadcast": bool(r.is_broadcast),
        "is_official": bool(r.is_official),
        "expected_supply_time": r.expected_supply_time,
        "actual_start_time": r.actual_start_time,
        "actual_stop_time": r.actual_stop_time,
        "water_availability_status": r.water_availability_status or "Available",
        "source": r.source or ("Official Municipal Notice" if r.is_official else "Community Ground Report"),
        "source_url": r.source_url,
        "affected_locality_ids": r.affected_locality_ids or [r.locality_id],
        "is_demo": bool(r.is_demo),
    }

async def _refresh_reliability(locality_id: int, db: AsyncSession):
    """Recalculate and persist reliability score for locality."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
    result = await db.execute(
        select(SupplyReport)
        .where(
            and_(
                SupplyReport.locality_id == locality_id,
                SupplyReport.submitted_at >= cutoff,
                SupplyReport.status != ReportStatus.rejected
            )
        )
    )
    reports = result.scalars().all()

    sched = await db.execute(
        select(SupplySchedule).where(
            and_(SupplySchedule.locality_id == locality_id, SupplySchedule.is_active == True)
        )
    )
    has_schedule = sched.scalar_one_or_none() is not None

    result_data = calculate_reliability(reports, has_schedule)

    rs = await db.execute(
        select(ReliabilityScore).where(ReliabilityScore.locality_id == locality_id)
    )
    rs_obj = rs.scalar_one_or_none()
    if not rs_obj:
        rs_obj = ReliabilityScore(locality_id=locality_id)
        db.add(rs_obj)

    rs_obj.score = result_data["score"]
    rs_obj.supply_status = result_data["supply_status"]
    rs_obj.report_count = result_data["report_count"]
    rs_obj.agreeing_count = result_data["agreeing_count"]
    rs_obj.conflicting_count = result_data["conflicting_count"]
    rs_obj.freshest_report_age_minutes = result_data["freshest_age_minutes"]
    rs_obj.explanation = result_data["explanation"]
    rs_obj.last_calculated = datetime.now(timezone.utc)
    await db.commit()
    return result_data

# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_report(
    req: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Rate limiting: prevent flooding from single user within window
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=RATE_LIMIT_MINUTES)
    recent = await db.execute(
        select(SupplyReport).where(
            and_(
                SupplyReport.locality_id == req.locality_id,
                SupplyReport.reporter_id == current_user.id,
                SupplyReport.submitted_at >= cutoff
            )
        )
    )
    if recent.scalar_one_or_none():
        raise HTTPException(429, f"Rate limit reached: Please wait {RATE_LIMIT_MINUTES} minutes before submitting another report for this locality.")

    # Validate locality exists
    loc = await db.execute(select(Locality).where(Locality.id == req.locality_id))
    loc_obj = loc.scalar_one_or_none()
    if not loc_obj:
        raise HTTPException(404, "Locality not found")

    report = SupplyReport(
        locality_id=req.locality_id,
        reporter_id=current_user.id,
        report_type=req.report_type,
        observed_at=req.observed_at,
        note=req.note,
        status=ReportStatus.pending,
        is_demo=req.is_demo,
        is_broadcast=False,
        is_official=False,  # Community reports are NEVER official
        verification_status="unverified",
        water_availability_status=req.water_availability_status or "Reported",
        expected_supply_time=req.expected_supply_time,
        actual_start_time=req.actual_start_time,
        actual_stop_time=req.actual_stop_time,
        source=req.source or "Community Citizen Observation",
    )
    db.add(report)
    await db.flush()

    # Refresh reliability
    reliability = await _refresh_reliability(req.locality_id, db)

    return {
        "report_id": report.id,
        "message": "Report submitted successfully",
        "reliability": reliability,
        "report": _report_dict(report)
    }


@router.post("/broadcast", status_code=201)
async def create_broadcast(
    req: BroadcastCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Broadcast a water-supply report to one or multiple localities.
    Only authorized locality representatives and administrators can broadcast.
    Official status can only be designated by administrators or verified authorities.
    """
    is_admin = current_user.role == UserRole.admin
    is_rep = getattr(current_user, 'is_locality_rep', False) or current_user.role == UserRole.admin
    
    if not (is_admin or is_rep):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Only verified locality representatives and administrators can broadcast water-supply announcements."
        )

    # STRICT RULE: A community report must never be presented as an official HMWSSB announcement
    if req.is_official and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Only system administrators and verified municipal liaisons can publish with the 'Official' label."
        )

    # Validate target localities
    target_ids = list(set([req.locality_id] + (req.affected_locality_ids or [])))
    loc_res = await db.execute(select(Locality).where(Locality.id.in_(target_ids)))
    valid_localities = loc_res.scalars().all()
    if not valid_localities:
        raise HTTPException(404, "No valid localities specified for broadcast.")

    observed_time = req.observed_at or datetime.now(timezone.utc)
    verification_label = "official" if (req.is_official and is_admin) else "community_reported"

    # Create the primary broadcast report
    broadcast_report = SupplyReport(
        locality_id=req.locality_id,
        reporter_id=current_user.id,
        report_type=req.report_type,
        observed_at=observed_time,
        note=req.description,
        status=ReportStatus.verified if req.is_official else ReportStatus.pending,
        is_demo=False,
        is_broadcast=True,
        is_official=bool(req.is_official and is_admin),
        verification_status=verification_label,
        expected_supply_time=req.expected_supply_time,
        actual_start_time=req.actual_start_time,
        actual_stop_time=req.actual_stop_time,
        water_availability_status=req.water_availability_status,
        source=req.source,
        source_url=req.source_url,
        affected_locality_ids=target_ids,
    )
    db.add(broadcast_report)
    await db.flush()

    # Recalculate reliability for all affected localities
    for lid in target_ids:
        await _refresh_reliability(lid, db)

    # Notify affected users (both residents of these localities and alert subscribers)
    user_query = await db.execute(
        select(User.id).where(User.locality_id.in_(target_ids))
    )
    resident_ids = set(user_query.scalars().all())

    sub_query = await db.execute(
        select(AlertSubscription.user_id).where(
            and_(
                AlertSubscription.locality_id.in_(target_ids),
                AlertSubscription.is_active == True
            )
        )
    )
    subscriber_ids = set(sub_query.scalars().all())
    all_notified_user_ids = resident_ids.union(subscriber_ids)

    # Determine alert type
    alert_type = AlertType.supply_start if req.report_type == ReportType.supply_started else AlertType.delay

    primary_loc_name = valid_localities[0].name
    for uid in all_notified_user_ids:
        title_prefix = "Official HMWSSB Announcement" if broadcast_report.is_official else "Community Broadcast"
        notif = Notification(
            user_id=uid,
            title=f"[{title_prefix}] {primary_loc_name}: {req.water_availability_status}",
            message=f"{req.description} | Timings: {req.expected_supply_time or 'Current Window'} | Source: {req.source}",
            alert_type=alert_type,
            channel=NotificationChannel.in_app,
            related_locality_id=req.locality_id,
        )
        db.add(notif)

    await db.commit()

    return {
        "broadcast_id": broadcast_report.id,
        "message": f"Broadcast successfully published to {len(target_ids)} localities and delivered to {len(all_notified_user_ids)} users.",
        "affected_localities": [loc.name for loc in valid_localities],
        "report": _report_dict(broadcast_report),
    }


@router.get("/")
async def list_reports(
    locality_id: Optional[int] = None,
    report_type: Optional[str] = None,
    verification_status: Optional[str] = None,
    is_broadcast: Optional[bool] = None,
    date_str: Optional[str] = Query(None, alias="date"),
    hours: int = Query(72, le=720),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    """
    Search and filter reports by locality, date, report type, broadcast status, and verification status.
    """
    stmt = (
        select(SupplyReport)
        .options(selectinload(SupplyReport.locality), selectinload(SupplyReport.reporter))
        .where(SupplyReport.status != ReportStatus.rejected)
    )

    if locality_id:
        stmt = stmt.where(
            or_(
                SupplyReport.locality_id == locality_id,
                # Or included in multi-locality broadcast
                SupplyReport.affected_locality_ids.contains([locality_id])
            )
        )

    if report_type:
        stmt = stmt.where(SupplyReport.report_type == report_type)

    if is_broadcast is not None:
        stmt = stmt.where(SupplyReport.is_broadcast == is_broadcast)

    if hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        stmt = stmt.where(SupplyReport.submitted_at >= cutoff)

    stmt = stmt.order_by(desc(SupplyReport.submitted_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    reports = result.scalars().all()

    formatted = [_report_dict(r) for r in reports]

    # In-memory filter for computed verification status if requested
    if verification_status:
        formatted = [r for r in formatted if r["verification_status"] == verification_status]

    return formatted


@router.get("/broadcasts/active")
async def get_active_broadcasts(
    locality_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve active broadcast announcements published in the last 48 hours for immediate banner display.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    stmt = (
        select(SupplyReport)
        .options(selectinload(SupplyReport.locality), selectinload(SupplyReport.reporter))
        .where(
            and_(
                SupplyReport.is_broadcast == True,
                SupplyReport.submitted_at >= cutoff,
                SupplyReport.status != ReportStatus.rejected
            )
        )
        .order_by(desc(SupplyReport.submitted_at))
    )
    result = await db.execute(stmt)
    broadcasts = result.scalars().all()

    formatted = [_report_dict(b) for b in broadcasts]
    if locality_id:
        formatted = [
            b for b in formatted
            if b["locality_id"] == locality_id or locality_id in (b["affected_locality_ids"] or [])
        ]

    return formatted


@router.get("/locality/{locality_id}")
async def get_locality_reports(
    locality_id: int,
    hours: int = Query(48, le=168),
    db: AsyncSession = Depends(get_db)
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(SupplyReport)
        .options(selectinload(SupplyReport.locality), selectinload(SupplyReport.reporter))
        .where(
            and_(
                SupplyReport.locality_id == locality_id,
                SupplyReport.submitted_at >= cutoff,
                SupplyReport.status != ReportStatus.rejected
            )
        )
        .order_by(desc(SupplyReport.submitted_at))
    )
    reports = result.scalars().all()
    return [_report_dict(r) for r in reports]


@router.get("/reliability/{locality_id}")
async def get_reliability(locality_id: int, db: AsyncSession = Depends(get_db)):
    rs = await db.execute(
        select(ReliabilityScore).where(ReliabilityScore.locality_id == locality_id)
    )
    rs_obj = rs.scalar_one_or_none()
    if not rs_obj:
        return await _refresh_reliability(locality_id, db)

    return {
        "score": rs_obj.score,
        "supply_status": rs_obj.supply_status.value,
        "report_count": rs_obj.report_count,
        "agreeing_count": rs_obj.agreeing_count,
        "conflicting_count": rs_obj.conflicting_count,
        "freshest_age_minutes": rs_obj.freshest_report_age_minutes,
        "explanation": rs_obj.explanation or [],
        "last_calculated": rs_obj.last_calculated.isoformat() if rs_obj.last_calculated else None,
    }


@router.get("/status/{locality_id}")
async def get_supply_status(locality_id: int, db: AsyncSession = Depends(get_db)):
    """Combined status endpoint: schedule + reliability + recent reports + active broadcasts."""
    sched_result = await db.execute(
        select(SupplySchedule).where(
            and_(SupplySchedule.locality_id == locality_id, SupplySchedule.is_active == True)
        )
    )
    schedules = sched_result.scalars().all()

    rs = await db.execute(
        select(ReliabilityScore).where(ReliabilityScore.locality_id == locality_id)
    )
    rs_obj = rs.scalar_one_or_none()

    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    rpts = await db.execute(
        select(SupplyReport)
        .options(selectinload(SupplyReport.locality), selectinload(SupplyReport.reporter))
        .where(
            and_(
                SupplyReport.locality_id == locality_id,
                SupplyReport.submitted_at >= cutoff,
                SupplyReport.status != ReportStatus.rejected
            )
        )
        .order_by(desc(SupplyReport.submitted_at))
        .limit(15)
    )
    recent_reports = rpts.scalars().all()

    # Active broadcast for locality
    b_cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    b_stmt = (
        select(SupplyReport)
        .options(selectinload(SupplyReport.locality), selectinload(SupplyReport.reporter))
        .where(
            and_(
                SupplyReport.is_broadcast == True,
                SupplyReport.submitted_at >= b_cutoff,
                SupplyReport.status != ReportStatus.rejected,
                or_(
                    SupplyReport.locality_id == locality_id,
                    SupplyReport.affected_locality_ids.contains([locality_id])
                )
            )
        )
        .order_by(desc(SupplyReport.submitted_at))
        .limit(3)
    )
    b_res = await db.execute(b_stmt)
    active_broadcasts = b_res.scalars().all()

    return {
        "schedules": [
            {
                "day_of_week": s.day_of_week,
                "expected_start_time": s.expected_start_time,
                "expected_end_time": s.expected_end_time,
                "duration_minutes": s.duration_minutes,
                "source": s.source,
                "source_url": s.source_url,
                "is_official": s.is_official,
                "frequency_notes": s.frequency_notes,
            }
            for s in schedules
        ],
        "reliability": {
            "score": rs_obj.score if rs_obj else 0,
            "supply_status": rs_obj.supply_status.value if rs_obj else "no_data",
            "report_count": rs_obj.report_count if rs_obj else 0,
            "agreeing_count": rs_obj.agreeing_count if rs_obj else 0,
            "conflicting_count": rs_obj.conflicting_count if rs_obj else 0,
            "freshest_age_minutes": rs_obj.freshest_report_age_minutes if rs_obj else None,
            "explanation": rs_obj.explanation if rs_obj else [],
            "last_calculated": rs_obj.last_calculated.isoformat() if (rs_obj and rs_obj.last_calculated) else None,
        } if rs_obj else {
            "score": 0, "supply_status": "no_data", "report_count": 0,
            "agreeing_count": 0, "conflicting_count": 0,
            "freshest_age_minutes": None, "explanation": [], "last_calculated": None
        },
        "recent_reports": [_report_dict(r) for r in recent_reports],
        "active_broadcasts": [_report_dict(b) for b in active_broadcasts],
    }
