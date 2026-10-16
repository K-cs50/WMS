"""Locality and city routes"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models import City, Locality

router = APIRouter(prefix="/api/localities", tags=["localities"])

@router.get("/cities")
async def list_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(City).where(City.is_active == True).order_by(City.name))
    cities = result.scalars().all()
    return [
        {"id": c.id, "name": c.name, "state": c.state, "latitude": c.latitude, "longitude": c.longitude}
        for c in cities
    ]

@router.get("/search")
async def search_localities(
    q: str = Query("", min_length=0),
    city_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Locality).where(Locality.is_active == True)
    if city_id:
        stmt = stmt.where(Locality.city_id == city_id)
    if q:
        stmt = stmt.where(
            or_(
                Locality.name.ilike(f"%{q}%"),
                Locality.district.ilike(f"%{q}%"),
                Locality.postal_code.ilike(f"%{q}%"),
                Locality.ward.ilike(f"%{q}%"),
            )
        )
    stmt = stmt.order_by(Locality.name).limit(50)
    result = await db.execute(stmt)
    localities = result.scalars().all()
    return [_loc_dict(l) for l in localities]

@router.get("/{locality_id}")
async def get_locality(locality_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Locality).where(Locality.id == locality_id))
    loc = result.scalar_one_or_none()
    if not loc:
        from fastapi import HTTPException
        raise HTTPException(404, "Locality not found")
    return _loc_dict(loc)

def _loc_dict(l: Locality) -> dict:
    return {
        "id": l.id,
        "name": l.name,
        "district": l.district,
        "postal_code": l.postal_code,
        "latitude": l.latitude,
        "longitude": l.longitude,
        "zone": l.zone,
        "ward": l.ward,
        "city_id": l.city_id,
    }
