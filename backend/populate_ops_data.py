"""
Populate and update WMS database with verified Hyderabad localities,
water stress telemetry, providers, tankers with coordinates, and diverse supply reports.
"""
import asyncio
from datetime import datetime, timezone, timedelta, date

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete
from models import (
    Base, City, Locality, User, UserRole, ProviderProfile, Tanker,
    SupplySchedule, SupplyReport, ReportType, ReportStatus, VerificationStatus,
    ReliabilityScore, SupplyStatus, WeatherObservation,
    WaterStressIndicator, OfficialDataSource, ContactDirectory,
    ProviderServiceArea, WaterCategory, Booking, BookingStatus,
    BulkWaterRequest, BulkRequestMember, BulkRequestStatus,
    AlertSubscription, Notification, AlertType, NotificationChannel,
    SupplyForecast, DeliveryUpdate
)
from auth import hash_password
from config import settings
from reliability import calculate_reliability

engine = create_async_engine(settings.DATABASE_URL, echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NOW = datetime.now(timezone.utc)

HYD_LOCALITIES_DATA = [
    {"name": "Banjara Hills", "district": "Hyderabad", "postal_code": "500034", "latitude": 17.4126, "longitude": 78.4481, "zone": "West", "ward": "Ward 121"},
    {"name": "Jubilee Hills", "district": "Hyderabad", "postal_code": "500033", "latitude": 17.4325, "longitude": 78.4079, "zone": "West", "ward": "Ward 120"},
    {"name": "Kondapur", "district": "Rangareddy", "postal_code": "500084", "latitude": 17.4700, "longitude": 78.3660, "zone": "West", "ward": "Ward 151"},
    {"name": "Madhapur", "district": "Rangareddy", "postal_code": "500081", "latitude": 17.4483, "longitude": 78.3915, "zone": "West", "ward": "Ward 150"},
    {"name": "Secunderabad", "district": "Hyderabad", "postal_code": "500003", "latitude": 17.4399, "longitude": 78.4983, "zone": "North", "ward": "Ward 60"},
    {"name": "Kukatpally", "district": "Rangareddy", "postal_code": "500072", "latitude": 17.4849, "longitude": 78.4138, "zone": "North", "ward": "Ward 180"},
    {"name": "LB Nagar", "district": "Rangareddy", "postal_code": "500074", "latitude": 17.3464, "longitude": 78.5524, "zone": "East", "ward": "Ward 10"},
    {"name": "Ameerpet", "district": "Hyderabad", "postal_code": "500016", "latitude": 17.4373, "longitude": 78.4483, "zone": "Central", "ward": "Ward 95"},
    {"name": "Mehdipatnam", "district": "Hyderabad", "postal_code": "500028", "latitude": 17.3940, "longitude": 78.4360, "zone": "South", "ward": "Ward 71"},
    {"name": "Dilsukhnagar", "district": "Hyderabad", "postal_code": "500060", "latitude": 17.3688, "longitude": 78.5233, "zone": "East", "ward": "Ward 15"},
    {"name": "Uppal", "district": "Medchal-Malkajgiri", "postal_code": "500039", "latitude": 17.4018, "longitude": 78.5602, "zone": "East", "ward": "Ward 8"},
    {"name": "Vanasthalipuram", "district": "Rangareddy", "postal_code": "500070", "latitude": 17.3312, "longitude": 78.5714, "zone": "East", "ward": "Ward 12"},
    {"name": "Nagole", "district": "Medchal-Malkajgiri", "postal_code": "500068", "latitude": 17.3753, "longitude": 78.5606, "zone": "East", "ward": "Ward 11"},
    {"name": "Miyapur", "district": "Rangareddy", "postal_code": "500049", "latitude": 17.4968, "longitude": 78.3546, "zone": "West", "ward": "Ward 107"},
    {"name": "Gachibowli", "district": "Rangareddy", "postal_code": "500032", "latitude": 17.4401, "longitude": 78.3489, "zone": "West", "ward": "Ward 105"},
    {"name": "Begumpet", "district": "Hyderabad", "postal_code": "500016", "latitude": 17.4447, "longitude": 78.4664, "zone": "Central", "ward": "Ward 149"},
]

STRESS_METRICS = {
    "Uppal": {"level": "critical", "gw": 28.5, "res": 38.0, "label": "Critical water stress — persistent deficit & high industrial draw", "source": "HMWSSB East Circle & CGWB"},
    "Vanasthalipuram": {"level": "critical", "gw": 29.1, "res": 36.0, "label": "Critical water stress — deep aquifer drop in outer ward", "source": "CGWB Groundwater Observation Grid"},
    "LB Nagar": {"level": "high", "gw": 24.2, "res": 48.0, "label": "High water stress — elevated peak demand and depleted shallow aquifers", "source": "CGWB & HMWSSB Telemetry Grid"},
    "Nagole": {"level": "high", "gw": 25.0, "res": 44.0, "label": "High water stress — rapid urbanization drawdown", "source": "HMWSSB Operations Division IX"},
    "Kukatpally": {"level": "high", "gw": 26.3, "res": 45.0, "label": "High water stress — high density extraction zone", "source": "CGWB Observation Division"},
    "Banjara Hills": {"level": "moderate", "gw": 18.5, "res": 62.0, "label": "Moderate water stress — seasonal supply stabilization", "source": "HMWSSB West Zone Monitoring"},
    "Kondapur": {"level": "moderate", "gw": 22.1, "res": 55.0, "label": "Moderate stress — groundwater declining in pre-monsoon", "source": "CGWB Seasonal Aquifer Bulletin"},
    "Dilsukhnagar": {"level": "moderate", "gw": 19.8, "res": 55.0, "label": "Moderate water stress — stabilized municipal supply schedule", "source": "HMWSSB Circle II & CGWB"},
    "Ameerpet": {"level": "moderate", "gw": 19.5, "res": 58.0, "label": "Moderate stress — commercial corridor pipeline regulation", "source": "GHMC Central Zone Monitoring"},
    "Miyapur": {"level": "moderate", "gw": 21.4, "res": 52.0, "label": "Moderate stress — intermittent booster pipeline pressure", "source": "HMWSSB North-West Grid"},
    "Jubilee Hills": {"level": "low", "gw": 15.2, "res": 68.0, "label": "Low water stress — adequate reservoir pressure and stable supply", "source": "HMWSSB West Zone Master Balancing Reservoir"},
    "Madhapur": {"level": "low", "gw": 16.0, "res": 60.0, "label": "Low water stress in current operating cycle", "source": "HMWSSB IT Corridor Telemetry"},
    "Secunderabad": {"level": "low", "gw": 14.8, "res": 65.0, "label": "Low water stress — steady gravity feed from Cantonment reservoirs", "source": "Secunderabad Cantonment Board & HMWSSB"},
    "Mehdipatnam": {"level": "low", "gw": 15.5, "res": 64.0, "label": "Low water stress — stable distribution schedule", "source": "HMWSSB South Division"},
    "Gachibowli": {"level": "low", "gw": 16.5, "res": 63.0, "label": "Low water stress — monitored bulk IT corridor feeds", "source": "HMWSSB IT Grid Operations"},
    "Begumpet": {"level": "low", "gw": 15.0, "res": 66.0, "label": "Low water stress — stable distribution from central grid", "source": "HMWSSB North Division"},
    "Nalgonda Town": {"level": "moderate", "gw": 28.4, "res": 42.0, "label": "Moderate seasonal draw — elevated summer agriculture demand", "source": "CGWB Seasonal Aquifer Bulletin"},
    "Miryalaguda": {"level": "high", "gw": 31.2, "res": 32.0, "label": "High water stress — regional canal supply lag", "source": "Telangana Water Resources Dept"},
    "Bhongir": {"level": "moderate", "gw": 23.0, "res": 50.0, "label": "Moderate water stress — sub-basin observation well", "source": "CGWB Hydrological Survey"},
}

async def populate():
    async with AsyncSessionLocal() as db:
        print("Ensuring city records...")
        hyd_city = (await db.execute(select(City).where(City.name == "Hyderabad"))).scalar_one_or_none()
        if not hyd_city:
            hyd_city = City(name="Hyderabad", state="Telangana", country="India", latitude=17.3850, longitude=78.4867)
            db.add(hyd_city)
            await db.flush()

        print("Ensuring Hyderabad localities...")
        loc_map = {}
        # Fetch existing
        existing_locs = (await db.execute(select(Locality))).scalars().all()
        for l in existing_locs:
            loc_map[l.name] = l

        for data in HYD_LOCALITIES_DATA:
            if data["name"] in loc_map:
                l = loc_map[data["name"]]
                l.latitude = data["latitude"]
                l.longitude = data["longitude"]
                l.district = data["district"]
                l.postal_code = data["postal_code"]
                l.zone = data["zone"]
                l.ward = data["ward"]
            else:
                l = Locality(
                    city_id=hyd_city.id,
                    name=data["name"],
                    district=data["district"],
                    postal_code=data["postal_code"],
                    latitude=data["latitude"],
                    longitude=data["longitude"],
                    zone=data["zone"],
                    ward=data["ward"],
                    is_active=True,
                )
                db.add(l)
                await db.flush()
                loc_map[l.name] = l

        print("Updating/Seeding Water Stress Indicators for all localities...")
        # Clean existing to ensure consistent data
        await db.execute(delete(WaterStressIndicator))
        await db.flush()

        for name, l in loc_map.items():
            metric = STRESS_METRICS.get(name, {
                "level": "moderate", "gw": 20.0, "res": 55.0,
                "label": "Monitored locality aquifer metrics",
                "source": "CGWB & HMWSSB Telemetry Grid"
            })
            wsi = WaterStressIndicator(
                locality_id=l.id,
                groundwater_level_m=metric["gw"],
                reservoir_storage_pct=metric["res"],
                stress_level=metric["level"],
                stress_label=metric["label"],
                data_source=metric["source"],
                source_url="https://www.hmwssb.gov.in",
                is_official=(metric["level"] in ["critical", "high"]),
                is_demo=True,
                observation_date=date.today(),
            )
            db.add(wsi)

        print("Ensuring Users and Providers...")
        # Check provider3 for East Hyderabad
        p3_user = (await db.execute(select(User).where(User.email == "provider3@wms.demo"))).scalar_one_or_none()
        if not p3_user:
            p3_user = User(
                full_name="East Hyderabad Water Logistics",
                email="provider3@wms.demo",
                phone="9200000003",
                hashed_password=hash_password("Demo@1234"),
                role=UserRole.provider,
                is_active=True,
                city_id=hyd_city.id,
            )
            db.add(p3_user)
            await db.flush()

        p3_profile = (await db.execute(select(ProviderProfile).where(ProviderProfile.user_id == p3_user.id))).scalar_one_or_none()
        if not p3_profile:
            p3_profile = ProviderProfile(
                user_id=p3_user.id,
                business_name="East Hyderabad Water Logistics",
                contact_name="M. Ramana",
                contact_phone="9200000003",
                contact_email="provider3@wms.demo",
                address="Near Sagar Ring Road, LB Nagar, Hyderabad",
                description="Dedicated municipal and emergency tanker fleet serving LB Nagar, Uppal, Dilsukhnagar, Vanasthalipuram, and Nagole.",
                is_verified=True,
                verification_date=NOW,
                operating_hours="24/7 Emergency Dispatch",
            )
            db.add(p3_profile)
            await db.flush()

        p1_profile = (await db.execute(select(ProviderProfile).where(ProviderProfile.business_name == "Srinivas Tanker Services"))).scalar_one_or_none()
        p2_profile = (await db.execute(select(ProviderProfile).where(ProviderProfile.business_name == "Lakshmi Water Suppliers"))).scalar_one_or_none()

        print("Setting up Provider Service Areas...")
        await db.execute(delete(ProviderServiceArea))
        await db.flush()

        # Provider 1 (West & North): Banjara Hills, Jubilee Hills, Kondapur, Madhapur, Kukatpally, Miyapur, Gachibowli
        p1_localities = ["Banjara Hills", "Jubilee Hills", "Kondapur", "Madhapur", "Kukatpally", "Miyapur", "Gachibowli"]
        if p1_profile:
            for lname in p1_localities:
                if lname in loc_map:
                    db.add(ProviderServiceArea(provider_id=p1_profile.id, locality_id=loc_map[lname].id, is_active=True))

        # Provider 2 (Central & North): Kondapur, Madhapur, Secunderabad, Ameerpet, Begumpet
        p2_localities = ["Kondapur", "Madhapur", "Secunderabad", "Ameerpet", "Begumpet"]
        if p2_profile:
            for lname in p2_localities:
                if lname in loc_map:
                    db.add(ProviderServiceArea(provider_id=p2_profile.id, locality_id=loc_map[lname].id, is_active=True))

        # Provider 3 (East): LB Nagar, Uppal, Dilsukhnagar, Vanasthalipuram, Nagole
        p3_localities = ["LB Nagar", "Uppal", "Dilsukhnagar", "Vanasthalipuram", "Nagole"]
        for lname in p3_localities:
            if lname in loc_map:
                db.add(ProviderServiceArea(provider_id=p3_profile.id, locality_id=loc_map[lname].id, is_active=True))

        print("Seeding Tankers with exact coordinates and service areas...")
        await db.execute(delete(Tanker))
        await db.flush()

        tanker_specs = [
            # Provider 1 tankers (West / North)
            {"provider_id": p1_profile.id if p1_profile else 1, "reg": "TS09AB1234", "cap": 5000, "cat": WaterCategory.non_potable, "avail": True, "lat": 17.4180, "lng": 78.4420, "type": "Medium Tanker"},
            {"provider_id": p1_profile.id if p1_profile else 1, "reg": "TS09AB5678", "cap": 10000, "cat": WaterCategory.non_potable, "avail": True, "lat": 17.4820, "lng": 78.4110, "type": "Heavy Tanker"},
            {"provider_id": p1_profile.id if p1_profile else 1, "reg": "TS09XY9012", "cap": 6000, "cat": WaterCategory.potable, "avail": True, "lat": 17.4950, "lng": 78.3560, "type": "Potable Tanker"},

            # Provider 2 tankers (Central / North)
            {"provider_id": p2_profile.id if p2_profile else 2, "reg": "TS09CD1111", "cap": 3000, "cat": WaterCategory.potable, "avail": True, "lat": 17.4380, "lng": 78.4970, "type": "Compact Tanker"},
            {"provider_id": p2_profile.id if p2_profile else 2, "reg": "TS09CD2222", "cap": 8000, "cat": WaterCategory.potable, "avail": True, "lat": 17.4360, "lng": 78.4490, "type": "Potable Tanker"},

            # Provider 3 tankers (East: LB Nagar, Uppal, Dilsukhnagar, Vanasthalipuram, Nagole)
            {"provider_id": p3_profile.id, "reg": "TS08EL4401", "cap": 6000, "cat": WaterCategory.potable, "avail": True, "lat": 17.3475, "lng": 78.5510, "type": "Potable Tanker"},
            {"provider_id": p3_profile.id, "reg": "TS08EL4402", "cap": 10000, "cat": WaterCategory.non_potable, "avail": True, "lat": 17.3450, "lng": 78.5540, "type": "Heavy Industrial Tanker"},
            {"provider_id": p3_profile.id, "reg": "TS08UP8810", "cap": 5000, "cat": WaterCategory.potable, "avail": True, "lat": 17.4025, "lng": 78.5615, "type": "Express Potable Tanker"},
            {"provider_id": p3_profile.id, "reg": "TS08UP8811", "cap": 8000, "cat": WaterCategory.non_potable, "avail": False, "lat": 17.4005, "lng": 78.5580, "type": "Dispatched Municipal Tanker"},
            {"provider_id": p3_profile.id, "reg": "TS08VN9920", "cap": 4000, "cat": WaterCategory.potable, "avail": True, "lat": 17.3320, "lng": 78.5720, "type": "Neighborhood Potable Tanker"},
        ]

        for ts in tanker_specs:
            t = Tanker(
                provider_id=ts["provider_id"],
                registration_number=ts["reg"],
                capacity_liters=ts["cap"],
                water_category=ts["cat"],
                vehicle_type=ts["type"],
                is_available=ts["avail"],
                current_latitude=ts["lat"],
                current_longitude=ts["lng"],
                last_location_update=NOW - timedelta(minutes=10),
                is_active=True,
            )
            db.add(t)

        print("Seeding diverse Supply Reports across localities...")
        # Get an admin user and consumer users
        admin_user = (await db.execute(select(User).where(User.role == UserRole.admin))).scalars().first()
        consumers = (await db.execute(select(User).where(User.role == UserRole.consumer))).scalars().all()
        c1 = consumers[0] if consumers else admin_user
        c2 = consumers[1] if len(consumers) > 1 else c1

        reports_data = [
            # 1. Uppal - Official Notice
            {
                "locality": "Uppal", "user": admin_user, "type": ReportType.supply_delayed,
                "obs": NOW - timedelta(minutes=45), "status": ReportStatus.verified,
                "is_official": True, "is_broadcast": True, "v_status": "official",
                "status_str": "Feeder Line Isolation",
                "source": "HMWSSB East Circle Emergency Desk",
                "note": "OFFICIAL STATUTORY NOTICE: 1200mm diameter transmission feeder pipe undergoing emergency valve replacement near Uppal Ring Road. Piped water supply delayed by 3 hours. Emergency municipal tankers dispatched to inner colonies.",
                "exp": "07:00 - 10:00",
            },
            # 2. LB Nagar - Official Notice
            {
                "locality": "LB Nagar", "user": admin_user, "type": ReportType.emergency_shortage,
                "obs": NOW - timedelta(hours=1, minutes=15), "status": ReportStatus.verified,
                "is_official": True, "is_broadcast": True, "v_status": "official",
                "status_str": "Booster Pump Maintenance",
                "source": "HMWSSB South-East Zone",
                "note": "OFFICIAL ADVISORY: Overhaul of secondary booster pump at LB Nagar reservoir. Supply operating at reduced pressure for Wards 10 and 11. Tanker booking desk activated.",
                "exp": "06:00 - 08:30",
            },
            # 3. LB Nagar - Community Ground Report
            {
                "locality": "LB Nagar", "user": c1, "type": ReportType.supply_started,
                "obs": NOW - timedelta(minutes=25), "status": ReportStatus.verified,
                "is_official": False, "is_broadcast": False, "v_status": "community_reported",
                "status_str": "Low Pressure Flowing",
                "source": "Resident Ground Report",
                "note": "Water began trickling into ground floor sumps at 6:45 AM. Pressure is low but continuous in Chintalkunta area.",
                "exp": "06:30 - 08:30",
            },
            # 4. Dilsukhnagar - Community Verified Report
            {
                "locality": "Dilsukhnagar", "user": c2, "type": ReportType.supply_started,
                "obs": NOW - timedelta(minutes=30), "status": ReportStatus.verified,
                "is_official": False, "is_broadcast": False, "v_status": "community_reported",
                "status_str": "Full Pressure Normal Supply",
                "source": "Verified RWA Observation",
                "note": "Regular morning municipal cycle completed smoothly between 6:00 AM and 8:00 AM with adequate head pressure across Ward 15.",
                "exp": "06:00 - 08:00",
            },
            # 5. Kukatpally - Conflicting Reports
            {
                "locality": "Kukatpally", "user": c1, "type": ReportType.no_supply,
                "obs": NOW - timedelta(minutes=18), "status": ReportStatus.pending,
                "is_official": False, "is_broadcast": False, "v_status": "conflicting",
                "status_str": "Zero Supply at Overhead Tank",
                "source": "Citizen Report",
                "note": "No piped supply arrived in Phase 1 housing board colony as of 7:30 AM.",
                "exp": "06:00 - 08:00",
            },
            {
                "locality": "Kukatpally", "user": c2, "type": ReportType.supply_started,
                "obs": NOW - timedelta(minutes=15), "status": ReportStatus.pending,
                "is_official": False, "is_broadcast": False, "v_status": "conflicting",
                "status_str": "Supply Active at Sump",
                "source": "Citizen Report",
                "note": "Water flowing normally into ground level sumps on Main Road lane 4.",
                "exp": "06:00 - 08:00",
            },
            # 6. Jubilee Hills - Official Notice
            {
                "locality": "Jubilee Hills", "user": admin_user, "type": ReportType.emergency_shortage,
                "obs": NOW - timedelta(hours=2), "status": ReportStatus.verified,
                "is_official": True, "is_broadcast": True, "v_status": "official",
                "status_str": "Distribution Main Repair",
                "source": "HMWSSB West Zone Emergency Desk",
                "note": "OFFICIAL BULLETIN: Distribution main leak isolated near Road No. 36. Emergency water tankers deployed at Jubilee Hills Club parking. Repair ETA 4 hours.",
                "exp": "07:00 - 09:00",
            },
            # 7. Banjara Hills - Community Verified
            {
                "locality": "Banjara Hills", "user": c1, "type": ReportType.supply_started,
                "obs": NOW - timedelta(minutes=40), "status": ReportStatus.verified,
                "is_official": False, "is_broadcast": False, "v_status": "community_reported",
                "status_str": "Flowing Normally",
                "source": "Resident Observation (Verified)",
                "note": "Water started as scheduled at 6:10 AM, clean water and good pressure in Road No. 12.",
                "exp": "06:00 - 08:00",
            },
            # 8. Secunderabad - Outdated Report
            {
                "locality": "Secunderabad", "user": c2, "type": ReportType.supply_stopped,
                "obs": NOW - timedelta(hours=5), "status": ReportStatus.verified,
                "is_official": False, "is_broadcast": False, "v_status": "outdated",
                "status_str": "Morning Cycle Completed",
                "source": "Citizen Observation (Earlier)",
                "note": "Piped supply closed at 8:15 AM after 2-hour morning allocation.",
                "exp": "06:00 - 08:00",
            },
            # 9. Vanasthalipuram - Community Report
            {
                "locality": "Vanasthalipuram", "user": c1, "type": ReportType.low_pressure,
                "obs": NOW - timedelta(minutes=50), "status": ReportStatus.verified,
                "is_official": False, "is_broadcast": False, "v_status": "community_reported",
                "status_str": "Severe Low Pressure",
                "source": "RWA Ground Observation",
                "note": "Low pressure on distribution tail-end in Phase 2. Tankers required for high-rise apartments.",
                "exp": "06:30 - 08:30",
            },
        ]

        # Delete existing demo reports to prevent clutter and keep clean stable records
        await db.execute(delete(SupplyReport))
        await db.flush()

        for rd in reports_data:
            loc = loc_map.get(rd["locality"])
            if loc:
                rep = SupplyReport(
                    locality_id=loc.id,
                    reporter_id=rd["user"].id if rd["user"] else admin_user.id,
                    report_type=rd["type"],
                    observed_at=rd["obs"],
                    submitted_at=rd["obs"] + timedelta(minutes=2),
                    expected_supply_time=rd.get("exp"),
                    water_availability_status=rd["status_str"],
                    source=rd["source"],
                    source_url="https://www.hmwssb.gov.in" if rd["is_official"] else None,
                    is_official=rd["is_official"],
                    is_broadcast=rd["is_broadcast"],
                    verification_status=rd["v_status"],
                    affected_locality_ids=[loc.id],
                    note=rd["note"],
                    status=rd["status"],
                    is_demo=True,
                )
                db.add(rep)

        await db.commit()

        print("Recalculating reliability scores for all localities...")
        for name, loc in loc_map.items():
            loc_reports = (await db.execute(select(SupplyReport).where(SupplyReport.locality_id == loc.id))).scalars().all()
            rel = calculate_reliability(loc_reports, has_official_schedule=True)

            rs_obj = (await db.execute(select(ReliabilityScore).where(ReliabilityScore.locality_id == loc.id))).scalar_one_or_none()
            if not rs_obj:
                rs_obj = ReliabilityScore(locality_id=loc.id)
                db.add(rs_obj)

            rs_obj.score = rel["score"]
            rs_obj.supply_status = rel["supply_status"]
            rs_obj.report_count = rel["report_count"]
            rs_obj.agreeing_count = rel["agreeing_count"]
            rs_obj.conflicting_count = rel["conflicting_count"]
            rs_obj.freshest_report_age_minutes = rel["freshest_age_minutes"]
            rs_obj.explanation = rel["explanation"]
            rs_obj.last_calculated = NOW

        await db.commit()
        print("Database populated successfully with verified Hyderabad operations data!")

if __name__ == "__main__":
    asyncio.run(populate())
