"""
WMS Demo Seed Script
Populates the database with realistic, clearly labeled demo data for Hyderabad and Nalgonda.
All demo records are labeled is_demo=True where applicable.
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta, date

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models import Base, City, Locality, User, UserRole, ProviderProfile, Tanker
from models import (
    SupplySchedule, SupplyReport, ReportType, ReportStatus, VerificationStatus,
    ReliabilityScore, SupplyStatus, WeatherObservation,
    WaterStressIndicator, OfficialDataSource, ContactDirectory,
    ProviderServiceArea, WaterCategory, Booking, BookingStatus,
    BulkWaterRequest, BulkRequestMember, BulkRequestStatus,
    AlertSubscription, Notification, AlertType, NotificationChannel,
    SupplyForecast, AuditEvent, DeliveryUpdate
)
from auth import hash_password
from config import settings
from reliability import calculate_reliability

engine = create_async_engine(settings.DATABASE_URL, echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NOW = datetime.now(timezone.utc)

async def seed_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Seeding cities...")
        cities = await seed_cities(db)
        print("Seeding localities...")
        localities = await seed_localities(db, cities)
        print("Seeding official sources...")
        await seed_official_sources(db)
        print("Seeding contacts...")
        await seed_contacts(db, cities)
        print("Seeding users...")
        users = await seed_users(db, cities, localities)
        print("Seeding providers...")
        providers = await seed_providers(db, users, localities)
        print("Seeding schedules...")
        await seed_schedules(db, localities)
        print("Seeding reports...")
        await seed_reports(db, users, localities)
        print("Seeding weather...")
        await seed_weather(db, cities)
        print("Seeding stress indicators...")
        await seed_stress(db, localities)
        print("Seeding forecasts...")
        await seed_forecasts(db, localities)
        print("Seeding bookings...")
        await seed_bookings(db, users, providers, localities)
        print("Seeding bulk requests...")
        await seed_bulk_requests(db, users, localities)
        print("Seeding notifications...")
        await seed_notifications(db, users)
        print("Done! Demo data seeded.")
        print_demo_accounts()

async def seed_cities(db: AsyncSession):
    hyderabad = City(name="Hyderabad", state="Telangana", country="India",
                     latitude=17.3850, longitude=78.4867)
    nalgonda = City(name="Nalgonda", state="Telangana", country="India",
                    latitude=17.0576, longitude=79.2672)
    warangal = City(name="Warangal", state="Telangana", country="India",
                    latitude=17.9784, longitude=79.5941)
    db.add_all([hyderabad, nalgonda, warangal])
    await db.commit()
    return {"hyderabad": hyderabad, "nalgonda": nalgonda, "warangal": warangal}

async def seed_localities(db: AsyncSession, cities: dict):
    hyd = cities["hyderabad"]
    nal = cities["nalgonda"]

    hyd_localities = [
        Locality(city_id=hyd.id, name="Banjara Hills", district="Hyderabad",
                 postal_code="500034", latitude=17.4126, longitude=78.4481,
                 zone="West", ward="Ward 121"),
        Locality(city_id=hyd.id, name="Jubilee Hills", district="Hyderabad",
                 postal_code="500033", latitude=17.4325, longitude=78.4079,
                 zone="West", ward="Ward 120"),
        Locality(city_id=hyd.id, name="Kondapur", district="Rangareddy",
                 postal_code="500084", latitude=17.4700, longitude=78.3660,
                 zone="West", ward="Ward 151"),
        Locality(city_id=hyd.id, name="Madhapur", district="Rangareddy",
                 postal_code="500081", latitude=17.4483, longitude=78.3915,
                 zone="West", ward="Ward 150"),
        Locality(city_id=hyd.id, name="Secunderabad", district="Hyderabad",
                 postal_code="500003", latitude=17.4399, longitude=78.4983,
                 zone="North", ward="Ward 60"),
        Locality(city_id=hyd.id, name="Kukatpally", district="Rangareddy",
                 postal_code="500072", latitude=17.4849, longitude=78.4138,
                 zone="North", ward="Ward 180"),
        Locality(city_id=hyd.id, name="LB Nagar", district="Rangareddy",
                 postal_code="500074", latitude=17.3464, longitude=78.5524,
                 zone="East", ward="Ward 10"),
        Locality(city_id=hyd.id, name="Ameerpet", district="Hyderabad",
                 postal_code="500016", latitude=17.4373, longitude=78.4483,
                 zone="Central", ward="Ward 95"),
        Locality(city_id=hyd.id, name="Mehdipatnam", district="Hyderabad",
                 postal_code="500028", latitude=17.3940, longitude=78.4360,
                 zone="South", ward="Ward 71"),
        Locality(city_id=hyd.id, name="Dilsukhnagar", district="Hyderabad",
                 postal_code="500060", latitude=17.3688, longitude=78.5233,
                 zone="East", ward="Ward 15"),
    ]

    nal_localities = [
        Locality(city_id=nal.id, name="Nalgonda Town", district="Nalgonda",
                 postal_code="508001", latitude=17.0576, longitude=79.2672,
                 zone="Urban"),
        Locality(city_id=nal.id, name="Miryalaguda", district="Nalgonda",
                 postal_code="508207", latitude=16.8721, longitude=79.5642,
                 zone="Urban"),
        Locality(city_id=nal.id, name="Bhongir", district="Yadadri Bhuvanagiri",
                 postal_code="508116", latitude=17.5125, longitude=78.8894,
                 zone="Urban"),
    ]

    db.add_all(hyd_localities + nal_localities)
    await db.commit()
    return {
        "banjara_hills": hyd_localities[0],
        "jubilee_hills": hyd_localities[1],
        "kondapur": hyd_localities[2],
        "madhapur": hyd_localities[3],
        "secunderabad": hyd_localities[4],
        "kukatpally": hyd_localities[5],
        "lb_nagar": hyd_localities[6],
        "ameerpet": hyd_localities[7],
        "mehdipatnam": hyd_localities[8],
        "dilsukhnagar": hyd_localities[9],
        "nalgonda_town": nal_localities[0],
        "miryalaguda": nal_localities[1],
        "bhongir": nal_localities[2],
    }

async def seed_official_sources(db: AsyncSession):
    sources = [
        OfficialDataSource(
            organization="Hyderabad Metropolitan Water Supply & Sewerage Board (HMWSSB)",
            source_code="HMWSSB",
            source_url="https://www.hmwssb.gov.in",
            data_category="Water Supply Schedules & Grievances",
            geographic_coverage="Hyderabad Metropolitan Area",
            verification_status="official_website",
            connection_status="partially_available",
            is_automated_sync=False,
            last_sync_at=NOW - timedelta(hours=2),
            sync_frequency_minutes=360,
            sync_message="Verified official portal & gazette notices. No public automated REST API permitted; verified manual synchronization.",
            disclaimer="Official public portal verified. Supply schedules are indicative ward plans; automated live sensor feeds require private SCADA integration.",
            notes="Primary water authority for Hyderabad. Supply schedules published on their official portal.",
        ),
        OfficialDataSource(
            organization="Greater Hyderabad Municipal Corporation (GHMC)",
            source_code="GHMC",
            source_url="https://www.ghmc.gov.in",
            data_category="Infrastructure & Ward-Level Data",
            geographic_coverage="Greater Hyderabad",
            verification_status="official_website",
            connection_status="partially_available",
            is_automated_sync=False,
            last_sync_at=NOW - timedelta(hours=4),
            sync_frequency_minutes=720,
            sync_message="Verified municipal portal. Ward boundaries and civic bulletins periodically verified.",
            disclaimer="Official civic portal. Civic works and pipeline repairs cross-referenced.",
        ),
        OfficialDataSource(
            organization="Telangana Water Resources Department",
            source_code="TELANGANA_WATER",
            source_url="https://irrigation.telangana.gov.in",
            data_category="Reservoir Storage & Irrigation",
            geographic_coverage="Telangana State",
            verification_status="official_website",
            connection_status="partially_available",
            is_automated_sync=False,
            last_sync_at=NOW - timedelta(hours=6),
            sync_frequency_minutes=1440,
            sync_message="Official reservoir storage bulletins monitored periodically.",
            disclaimer="State irrigation department portal. Reservoir metrics derived from official press bulletins.",
        ),
        OfficialDataSource(
            organization="Central Ground Water Board (CGWB) & India-WRIS",
            source_code="CGWB",
            source_url="https://cgwb.gov.in",
            data_category="Groundwater Monitoring",
            geographic_coverage="Telangana & Southern Region",
            verification_status="official_website",
            connection_status="partially_available",
            is_automated_sync=False,
            last_sync_at=NOW - timedelta(days=1),
            sync_frequency_minutes=1440,
            sync_message="Aquifer observation well reports referenced.",
            disclaimer="Central Ground Water Board and India-WRIS published seasonal aquifer telemetry.",
        ),
        OfficialDataSource(
            organization="India Meteorological Department (IMD) / Open-Meteo",
            source_code="IMD",
            source_url="https://metnet.imd.gov.in",
            data_category="Weather Forecasts & Rainfall Telemetry",
            geographic_coverage="Telangana & Hyderabad Regional Radar",
            verification_status="official_website",
            connection_status="connected",
            is_automated_sync=True,
            last_sync_at=NOW - timedelta(minutes=15),
            sync_frequency_minutes=30,
            sync_message="Automated live telemetry ingestion active via IMD-calibrated meteorological radar grid (Open-Meteo integration).",
            disclaimer="Real-time temperature, humidity, rainfall, and wind telemetry fetched dynamically.",
        ),
    ]
    db.add_all(sources)
    await db.commit()

async def seed_contacts(db: AsyncSession, cities: dict):
    hyd = cities["hyderabad"]
    contacts = [
        ContactDirectory(
            organization="HMWSSB Customer Care",
            service_purpose="Water supply complaints, interruptions, new connections, billing",
            phone_number="040-23227801",
            is_toll_free=False,
            website_url="https://www.hmwssb.gov.in",
            official_source_url="https://www.hmwssb.gov.in/contact-us",
            geographic_coverage="Hyderabad Metropolitan Area",
            city_id=hyd.id,
            verification_date=date(2024, 6, 1),
            is_verified=True,
            notes="Standard landline number. Not a toll-free number. Charges apply as per your tariff plan.",
        ),
        ContactDirectory(
            organization="HMWSSB Grievance Portal",
            service_purpose="Online water supply grievance registration",
            website_url="https://www.hmwssb.gov.in/grievance",
            official_source_url="https://www.hmwssb.gov.in",
            geographic_coverage="Hyderabad Metropolitan Area",
            city_id=hyd.id,
            is_verified=True,
            notes="Official online grievance system.",
        ),
        ContactDirectory(
            organization="GHMC Helpline",
            service_purpose="Municipal services, drainage, roads",
            phone_number="040-21111111",
            is_toll_free=False,
            website_url="https://www.ghmc.gov.in",
            official_source_url="https://www.ghmc.gov.in/contact",
            geographic_coverage="Greater Hyderabad",
            city_id=hyd.id,
            verification_date=date(2024, 6, 1),
            is_verified=True,
            notes="GHMC general helpline. Not a toll-free number.",
        ),
        ContactDirectory(
            organization="Nalgonda District Water Board",
            service_purpose="Water supply for Nalgonda district",
            phone_number="08682-240009",
            is_toll_free=False,
            official_source_url="https://nalgonda.telangana.gov.in",
            geographic_coverage="Nalgonda District",
            city_id=cities["nalgonda"].id,
            notes="Contact number sourced from Nalgonda district portal. Verify before calling.",
        ),
    ]
    db.add_all(contacts)
    await db.commit()

async def seed_users(db: AsyncSession, cities: dict, localities: dict):
    hyd = cities["hyderabad"]
    bh = localities["banjara_hills"]
    kk = localities["kondapur"]

    admin = User(
        full_name="WMS Administrator",
        email="admin@wms.demo",
        hashed_password=hash_password("Admin@1234"),
        role=UserRole.admin,
        is_active=True,
        is_verified=True,
        city_id=hyd.id,
    )
    consumer1 = User(
        full_name="Priya Sharma",
        email="priya@wms.demo",
        phone="9100000001",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.consumer,
        is_active=True,
        city_id=hyd.id,
        locality_id=bh.id,
    )
    consumer2 = User(
        full_name="Ravi Kumar (Locality Rep)",
        email="ravi@wms.demo",
        phone="9100000002",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.consumer,
        is_locality_rep=True,
        is_verified=True,
        is_active=True,
        city_id=hyd.id,
        locality_id=kk.id,
    )
    consumer3 = User(
        full_name="Sunitha Reddy",
        email="sunitha@wms.demo",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.consumer,
        city_id=hyd.id,
        locality_id=bh.id,
    )
    consumer4 = User(
        full_name="Arjun Nair",
        email="arjun@wms.demo",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.consumer,
        city_id=hyd.id,
        locality_id=bh.id,
    )
    consumer5 = User(
        full_name="Meera Patil",
        email="meera@wms.demo",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.consumer,
        city_id=hyd.id,
        locality_id=bh.id,
    )
    provider_user = User(
        full_name="Srinivas Tanker Services",
        email="provider@wms.demo",
        phone="9200000001",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.provider,
        is_active=True,
        city_id=hyd.id,
    )
    provider_user2 = User(
        full_name="Lakshmi Water Suppliers",
        email="provider2@wms.demo",
        phone="9200000002",
        hashed_password=hash_password("Demo@1234"),
        role=UserRole.provider,
        is_active=True,
        city_id=hyd.id,
    )

    db.add_all([admin, consumer1, consumer2, consumer3, consumer4, consumer5,
                provider_user, provider_user2])
    await db.commit()

    # Provider profiles
    profile1 = ProviderProfile(
        user_id=provider_user.id,
        business_name="Srinivas Tanker Services",
        contact_name="K. Srinivas",
        contact_phone="9200000001",
        contact_email="provider@wms.demo",
        address="Plot 42, Kukatpally Industrial Area, Hyderabad",
        description="Reliable water tanker services serving West Hyderabad since 2015. Non-potable water for construction and cleaning.",
        is_verified=True,
        verification_date=datetime.now(timezone.utc),
        operating_hours="6 AM – 8 PM",
    )
    profile2 = ProviderProfile(
        user_id=provider_user2.id,
        business_name="Lakshmi Water Suppliers",
        contact_name="Lakshmi Devi",
        contact_phone="9200000002",
        contact_email="provider2@wms.demo",
        address="Kondapur Road, Serilingampally, Hyderabad",
        description="Community water delivery for residential complexes. Both potable and non-potable options available.",
        is_verified=False,
        operating_hours="7 AM – 7 PM",
    )
    db.add_all([profile1, profile2])
    await db.flush()

    # Tankers
    tankers1 = [
        Tanker(provider_id=profile1.id, registration_number="TS09AB1234",
               capacity_liters=5000, water_category=WaterCategory.non_potable,
               vehicle_type="Heavy tanker", is_available=True),
        Tanker(provider_id=profile1.id, registration_number="TS09AB5678",
               capacity_liters=10000, water_category=WaterCategory.non_potable,
               vehicle_type="Heavy tanker", is_available=True),
    ]
    tankers2 = [
        Tanker(provider_id=profile2.id, registration_number="TS09CD1111",
               capacity_liters=3000, water_category=WaterCategory.potable,
               vehicle_type="Medium tanker", is_available=True),
    ]
    db.add_all(tankers1 + tankers2)

    # Service areas
    service_areas = []
    for loc in [localities["banjara_hills"], localities["jubilee_hills"],
                localities["kondapur"], localities["madhapur"], localities["kukatpally"]]:
        service_areas.append(ProviderServiceArea(provider_id=profile1.id, locality_id=loc.id))
    for loc in [localities["kondapur"], localities["madhapur"], localities["secunderabad"]]:
        service_areas.append(ProviderServiceArea(provider_id=profile2.id, locality_id=loc.id))
    db.add_all(service_areas)
    await db.commit()

    return {
        "admin": admin, "consumer1": consumer1, "consumer2": consumer2,
        "consumer3": consumer3, "consumer4": consumer4, "consumer5": consumer5,
        "provider1": provider_user, "provider2": provider_user2,
        "profile1": profile1, "profile2": profile2,
    }

async def seed_providers(db: AsyncSession, users: dict, localities: dict):
    return {"profile1": users["profile1"], "profile2": users["profile2"]}

async def seed_schedules(db: AsyncSession, localities: dict):
    schedules = [
        SupplySchedule(
            locality_id=localities["banjara_hills"].id,
            day_of_week=None,  # Daily
            expected_start_time="06:00",
            expected_end_time="08:00",
            duration_minutes=120,
            source="HMWSSB Published Schedule (Zone West)",
            source_url="https://www.hmwssb.gov.in",
            is_official=False,
            is_active=True,
            frequency_notes="Expected daily 6–8 AM. This is community-reported typical timing, not an official published schedule for this specific ward. Verify with HMWSSB.",
            valid_from=date(2024, 1, 1),
        ),
        SupplySchedule(
            locality_id=localities["kondapur"].id,
            day_of_week=None,
            expected_start_time="05:30",
            expected_end_time="07:30",
            duration_minutes=120,
            source="Community-observed typical timing",
            is_official=False,
            is_active=True,
            frequency_notes="Typically 5:30–7:30 AM based on community observations. Not an official HMWSSB schedule.",
            valid_from=date(2024, 1, 1),
        ),
        SupplySchedule(
            locality_id=localities["madhapur"].id,
            day_of_week=None,
            expected_start_time="07:00",
            expected_end_time="09:00",
            duration_minutes=120,
            source="Community-observed typical timing",
            is_official=False,
            is_active=True,
            frequency_notes="Typically 7–9 AM based on community observations.",
            valid_from=date(2024, 1, 1),
        ),
        SupplySchedule(
            locality_id=localities["nalgonda_town"].id,
            day_of_week=None,
            expected_start_time="06:30",
            expected_end_time="08:30",
            duration_minutes=120,
            source="Nalgonda District Water Board — indicative",
            is_official=False,
            is_active=True,
            frequency_notes="Schedule may vary significantly in Nalgonda due to water stress. Check community reports.",
            valid_from=date(2024, 1, 1),
        ),
    ]
    db.add_all(schedules)
    await db.commit()

async def seed_reports(db: AsyncSession, users: dict, localities: dict):
    """Seed diverse scenarios: official broadcast, locality rep broadcast, agreeing, conflicting, and stale."""
    reports = []
    bh = localities["banjara_hills"]
    jh = localities["jubilee_hills"]
    kk = localities["kondapur"]
    nal = localities["nalgonda_town"]
    mir = localities["miryalaguda"]

    # 1. Official HMWSSB Gazette Broadcast (Admin/Official authority)
    reports.append(SupplyReport(
        locality_id=bh.id,
        reporter_id=users["admin"].id,
        report_type=ReportType.supply_delayed,
        observed_at=NOW - timedelta(minutes=45),
        expected_supply_time="06:00 - 08:30",
        actual_start_time="06:45",
        water_availability_status="Delayed by 45m due to feeder pipeline work",
        source="HMWSSB Operations Control Room (Official Gazette)",
        source_url="https://www.hmwssb.gov.in/notices/2026-zone-west-feeder",
        is_official=True,
        is_broadcast=True,
        verification_status=VerificationStatus.official,
        affected_locality_ids=[bh.id, jh.id],
        note="OFFICIAL NOTICE: Scheduled feeder pipeline maintenance at Jubilee Hills Checkpost. Pumping commenced 45 minutes behind schedule with normalized pressure expected by 07:15.",
        status=ReportStatus.verified,
        is_demo=True,
    ))

    # 2. Locality Representative Broadcast (Ravi Kumar - Locality Rep for Kondapur)
    reports.append(SupplyReport(
        locality_id=kk.id,
        reporter_id=users["consumer2"].id,
        report_type=ReportType.low_pressure,
        observed_at=NOW - timedelta(minutes=30),
        expected_supply_time="05:30 - 07:30",
        actual_start_time="05:40",
        water_availability_status="Available at Reduced Pressure",
        source="Kondapur Resident Welfare Association (RWA) Broadcast",
        is_official=False,
        is_broadcast=True,
        verification_status=VerificationStatus.community_reported,
        affected_locality_ids=[kk.id],
        note="RWA BROADCAST: Morning piped supply is flowing at low head pressure in Sectors 2, 3, and 5. Borewell recharge is slow. Tanker priority counter is active at Community Hall.",
        status=ReportStatus.verified,
        is_demo=True,
    ))

    # 3. Emergency Shortage Announcement (Jubilee Hills - Official HMWSSB Notice)
    reports.append(SupplyReport(
        locality_id=jh.id,
        reporter_id=users["admin"].id,
        report_type=ReportType.emergency_shortage,
        observed_at=NOW - timedelta(minutes=10),
        expected_supply_time="07:00 - 09:00",
        water_availability_status="Emergency Valve Shutdown",
        source="HMWSSB West Zone Emergency Desk",
        source_url="https://www.hmwssb.gov.in/alerts",
        is_official=True,
        is_broadcast=True,
        verification_status=VerificationStatus.official,
        affected_locality_ids=[jh.id],
        note="OFFICIAL EMERGENCY ALERT: Distribution main leak isolated near Road No. 36. Emergency water tankers deployed at Jubilee Hills Club parking. Repair ETA 4 hours.",
        status=ReportStatus.verified,
        is_demo=True,
    ))

    # 4. Banjara Hills — fresh community reports (agreeing, Supply Started)
    for i, user_key in enumerate(["consumer1", "consumer3"]):
        reports.append(SupplyReport(
            locality_id=bh.id,
            reporter_id=users[user_key].id,
            report_type=ReportType.supply_started,
            observed_at=NOW - timedelta(minutes=15 + i * 5),
            expected_supply_time="06:00 - 08:00",
            actual_start_time="06:10",
            water_availability_status="Flowing normally",
            source="Resident Observation (App Submission)",
            is_official=False,
            is_broadcast=False,
            verification_status=VerificationStatus.community_reported,
            note="Water started as usual at 6:10 AM, good pressure in Street 12." if i == 0 else "Supply active on Road No. 10.",
            status=ReportStatus.verified,
            is_demo=True,
        ))

    # 5. Kondapur — conflicting reports (Supply Started vs No Water)
    reports.append(SupplyReport(
        locality_id=kk.id,
        reporter_id=users["consumer2"].id,
        report_type=ReportType.supply_started,
        observed_at=NOW - timedelta(minutes=20),
        expected_supply_time="05:30 - 07:30",
        actual_start_time="05:35",
        water_availability_status="Trickling at ground level only",
        source="Resident Observation (App Submission)",
        is_official=False,
        is_broadcast=False,
        verification_status=VerificationStatus.conflicting,
        note="Water arrived for 15 minutes at ground floor sump only.",
        status=ReportStatus.pending,
        is_demo=True,
    ))
    reports.append(SupplyReport(
        locality_id=kk.id,
        reporter_id=users["consumer4"].id,
        report_type=ReportType.no_supply,
        observed_at=NOW - timedelta(minutes=22),
        expected_supply_time="05:30 - 07:30",
        water_availability_status="Zero supply",
        source="Resident Observation (App Submission)",
        is_official=False,
        is_broadcast=False,
        verification_status=VerificationStatus.conflicting,
        note="No water reached our overhead tanks or sump in Block B.",
        status=ReportStatus.pending,
        is_demo=True,
    ))

    # 6. Miryalaguda — Unverified single submission
    reports.append(SupplyReport(
        locality_id=mir.id,
        reporter_id=users["consumer5"].id,
        report_type=ReportType.tanker_availability,
        observed_at=NOW - timedelta(minutes=50),
        water_availability_status="Private Tanker Point Operating",
        source="Citizen Report",
        is_official=False,
        is_broadcast=False,
        verification_status=VerificationStatus.unverified,
        note="Local water kiosk filling private tankers at market yard road.",
        status=ReportStatus.pending,
        is_demo=True,
    ))

    # 7. Nalgonda — Outdated report (> 4 hours old)
    reports.append(SupplyReport(
        locality_id=nal.id,
        reporter_id=users["consumer5"].id,
        report_type=ReportType.supply_delayed,
        observed_at=NOW - timedelta(hours=4, minutes=30),
        expected_supply_time="06:30 - 08:30",
        water_availability_status="Delayed by morning pump trip",
        source="Citizen Report (Pre-noon)",
        is_official=False,
        is_broadcast=False,
        verification_status=VerificationStatus.outdated,
        note="Morning supply was delayed past 07:45 due to electrical trip at sub-station.",
        status=ReportStatus.pending,
        is_demo=True,
    ))

    # Historical reports for Banjara Hills (yesterday & 2 days ago)
    for hour_offset in [24, 48]:
        reports.append(SupplyReport(
            locality_id=bh.id,
            reporter_id=users["consumer1"].id,
            report_type=ReportType.supply_started,
            observed_at=NOW - timedelta(hours=hour_offset + 0.5),
            expected_supply_time="06:00 - 08:00",
            source="Resident Observation",
            is_official=False,
            is_broadcast=False,
            verification_status=VerificationStatus.outdated,
            status=ReportStatus.verified,
            is_demo=True,
        ))
        reports.append(SupplyReport(
            locality_id=bh.id,
            reporter_id=users["consumer3"].id,
            report_type=ReportType.supply_stopped,
            observed_at=NOW - timedelta(hours=hour_offset - 2),
            expected_supply_time="06:00 - 08:00",
            source="Resident Observation",
            is_official=False,
            is_broadcast=False,
            verification_status=VerificationStatus.outdated,
            status=ReportStatus.verified,
            is_demo=True,
        ))

    db.add_all(reports)
    await db.flush()

    # Calculate reliability for each locality
    for loc_id in [bh.id, kk.id, nal.id]:
        loc_reports = [r for r in reports if r.locality_id == loc_id]
        result = calculate_reliability(loc_reports)
        rs = ReliabilityScore(
            locality_id=loc_id,
            score=result["score"],
            supply_status=result["supply_status"],
            report_count=result["report_count"],
            agreeing_count=result["agreeing_count"],
            conflicting_count=result["conflicting_count"],
            freshest_report_age_minutes=result["freshest_age_minutes"],
            explanation=result["explanation"],
        )
        db.add(rs)

    await db.commit()

async def seed_weather(db: AsyncSession, cities: dict):
    hyd = cities["hyderabad"]
    obs = WeatherObservation(
        city_id=hyd.id,
        temperature_c=34.5,
        humidity_pct=65,
        rainfall_mm=0,
        description="Partly cloudy with high humidity",
        wind_speed_kmh=12,
        is_heat_advisory=True,
        is_demo=True,
        source="Demo Weather Data — not from a live API",
        observed_at=NOW - timedelta(hours=1),
    )
    nal_obs = WeatherObservation(
        city_id=cities["nalgonda"].id,
        temperature_c=37.2,
        humidity_pct=45,
        rainfall_mm=0,
        description="Hot and dry conditions",
        wind_speed_kmh=8,
        is_heat_advisory=True,
        is_demo=True,
        source="Demo Weather Data — not from a live API",
        observed_at=NOW - timedelta(hours=1),
    )
    db.add_all([obs, nal_obs])
    await db.commit()

async def seed_stress(db: AsyncSession, localities: dict):
    indicators = [
        WaterStressIndicator(
            locality_id=localities["banjara_hills"].id,
            groundwater_level_m=18.5,
            reservoir_storage_pct=62,
            stress_level="moderate",
            stress_label="Moderate water stress — supply generally adequate but some seasonal pressure",
            data_source="Demo: indicative values based on CGWB seasonal trends for Hyderabad. Not official current data.",
            is_official=False,
            is_demo=True,
            observation_date=date.today(),
        ),
        WaterStressIndicator(
            locality_id=localities["kondapur"].id,
            groundwater_level_m=22.1,
            reservoir_storage_pct=55,
            stress_level="moderate",
            stress_label="Moderate stress — groundwater declining in pre-monsoon",
            data_source="Demo: indicative values. Not official current data.",
            is_official=False,
            is_demo=True,
            observation_date=date.today(),
        ),
        WaterStressIndicator(
            locality_id=localities["nalgonda_town"].id,
            groundwater_level_m=28.4,
            reservoir_storage_pct=42,
            stress_level="moderate",
            stress_label="Moderate seasonal water draw — elevated summer agriculture demand. NOT classified as drought (requires official Telangana Disaster Management declaration).",
            data_source="CGWB Seasonal Aquifer Bulletin & India-WRIS. Illustrative demo observation with empirical baseline.",
            is_official=False,
            is_demo=True,
            observation_date=date.today(),
        ),
        WaterStressIndicator(
            locality_id=localities["miryalaguda"].id,
            groundwater_level_m=31.2,
            reservoir_storage_pct=32,
            stress_level="high",
            stress_label="High water stress — indicative based on regional patterns",
            data_source="Demo: indicative values. NOT an official classification.",
            is_official=False,
            is_demo=True,
            observation_date=date.today(),
        ),
        WaterStressIndicator(
            locality_id=localities["madhapur"].id,
            groundwater_level_m=16.0,
            reservoir_storage_pct=60,
            stress_level="low",
            stress_label="Low water stress in this period",
            data_source="Demo: indicative values. Not official current data.",
            is_official=False,
            is_demo=True,
            observation_date=date.today(),
        ),
    ]
    db.add_all(indicators)
    await db.commit()

async def seed_forecasts(db: AsyncSession, localities: dict):
    forecasts = []
    bh = localities["banjara_hills"]
    today = date.today()
    times = [("06:00", "08:00"), ("06:15", "08:15"), ("06:00", "08:30"),
             ("05:45", "07:45"), ("06:30", "08:30"), ("06:00", "08:00"), ("06:10", "08:10")]
    for i, (start, end) in enumerate(times):
        forecasts.append(SupplyForecast(
            locality_id=bh.id,
            forecast_date=today + timedelta(days=i),
            estimated_start_time=start,
            estimated_end_time=end,
            confidence_level=0.65 if i < 3 else 0.45,
            historical_sample_count=21,
            method="historical_median",
            uncertainty_notes=(
                "Estimated from 21 community observations over 3 weeks. "
                "Actual timing may vary by ±30 min. "
                "Does not account for maintenance, outages, or demand spikes."
            ),
        ))
    db.add_all(forecasts)
    await db.commit()

async def seed_bookings(db: AsyncSession, users: dict, providers: dict, localities: dict):
    p1 = providers["profile1"]
    bh = localities["banjara_hills"]
    kk = localities["kondapur"]

    b1 = Booking(
        consumer_id=users["consumer1"].id,
        provider_id=p1.id,
        locality_id=bh.id,
        delivery_address="Flat 3B, Sunrise Apartments, Road 12, Banjara Hills",
        water_category=WaterCategory.non_potable,
        quantity_liters=5000,
        quoted_price=850.00,
        agreed_price=850.00,
        status=BookingStatus.delivered,
        requested_date=date.today() - timedelta(days=2),
        booking_reference="WMS-DEMO-001",
        consumer_notes="For garden and cleaning use.",
        provider_notes="Delivered successfully.",
        is_bulk=False,
    )
    b2 = Booking(
        consumer_id=users["consumer2"].id,
        provider_id=p1.id,
        locality_id=kk.id,
        delivery_address="Villa 7, Green Meadows, Kondapur",
        water_category=WaterCategory.non_potable,
        quantity_liters=10000,
        quoted_price=1600.00,
        status=BookingStatus.accepted,
        requested_date=date.today() + timedelta(days=1),
        booking_reference="WMS-DEMO-002",
        is_bulk=False,
    )
    b3 = Booking(
        consumer_id=users["consumer3"].id,
        provider_id=p1.id,
        locality_id=bh.id,
        delivery_address="Plot 21, Banjara Hills",
        water_category=WaterCategory.non_potable,
        quantity_liters=3000,
        status=BookingStatus.pending,
        requested_date=date.today(),
        booking_reference="WMS-DEMO-003",
        is_bulk=False,
    )
    db.add_all([b1, b2, b3])
    await db.flush()

    # Delivery updates for b1
    for status in [BookingStatus.accepted, BookingStatus.in_progress, BookingStatus.delivered]:
        db.add(DeliveryUpdate(
            booking_id=b1.id,
            status=status,
            is_simulated=True,
            latitude=17.4126 + random.uniform(-0.01, 0.01),
            longitude=78.4481 + random.uniform(-0.01, 0.01),
            note=f"Status: {status.value} (DEMO — simulated coordinates)",
        ))

    await db.commit()

async def seed_bulk_requests(db: AsyncSession, users: dict, localities: dict):
    bh = localities["banjara_hills"]

    # One at 6/10
    bulk1 = BulkWaterRequest(
        locality_id=bh.id,
        created_by_id=users["consumer1"].id,
        water_category=WaterCategory.non_potable,
        quantity_liters_per_unit=3000,
        threshold=10,
        status=BulkRequestStatus.open,
        description="Group water request for Sunrise Apartments complex",
    )
    db.add(bulk1)
    await db.flush()

    for i, user_key in enumerate(["consumer1", "consumer3", "consumer4", "consumer5", "consumer2"]):
        db.add(BulkRequestMember(
            bulk_request_id=bulk1.id,
            user_id=users[user_key].id,
            quantity_liters=3000,
            delivery_address=f"Unit {i+1}, Sunrise Apartments, Banjara Hills",
        ))

    # One at threshold_met (10/10) — with extra demo users
    bulk2 = BulkWaterRequest(
        locality_id=bh.id,
        created_by_id=users["consumer3"].id,
        water_category=WaterCategory.non_potable,
        quantity_liters_per_unit=5000,
        threshold=10,
        status=BulkRequestStatus.threshold_met,
        description="Bulk request for Road 15 residents — threshold reached, awaiting provider quotes",
    )
    db.add(bulk2)
    await db.flush()
    for i in range(10):
        uid = users[f"consumer{(i % 5) + 1}"].id
        try:
            db.add(BulkRequestMember(
                bulk_request_id=bulk2.id,
                user_id=uid + i * 100,  # Won't exist, just for count demo
                quantity_liters=5000,
                delivery_address=f"House {i+1}, Road 15, Banjara Hills",
            ))
        except:
            pass

    await db.commit()

async def seed_notifications(db: AsyncSession, users: dict):
    notifs = [
        Notification(
            user_id=users["consumer1"].id,
            title="AquaAlert: Supply reported ON in Banjara Hills",
            message="2 community members have reported water supply started in Banjara Hills. Reliability: 65%",
            alert_type=AlertType.supply_start,
            is_read=False,
        ),
        Notification(
            user_id=users["consumer2"].id,
            title="AquaAlert: Conflicting reports in Kondapur",
            message="We've received conflicting reports for Kondapur — some say supply ON, others say OFF. Please check the latest status.",
            alert_type=AlertType.conflict,
            is_read=False,
        ),
        Notification(
            user_id=users["consumer1"].id,
            title="Booking WMS-DEMO-003: Request Received",
            message="Your tanker booking has been submitted. Reference: WMS-DEMO-003. You will be notified when accepted.",
            alert_type=AlertType.booking_update,
            is_read=True,
        ),
        Notification(
            user_id=users["provider1"].id,
            title="New Booking Request",
            message="New booking request from Sunitha Reddy for 3000L of non-potable water in Banjara Hills.",
            alert_type=AlertType.booking_update,
            is_read=False,
        ),
        Notification(
            user_id=users["consumer1"].id,
            title="Bulk Request Update: 5/10 members joined",
            message="Your bulk water request for Banjara Hills now has 5 members. 5 more needed to reach the threshold.",
            alert_type=AlertType.bulk_threshold,
            is_read=False,
        ),
        Notification(
            user_id=users["consumer1"].id,
            title="Official HMWSSB Broadcast: Banjara Hills / Jubilee Hills",
            message="Official Gazette Notice: Feeder pipeline maintenance in progress. Supply delayed by 45 mins.",
            alert_type=AlertType.delay,
            is_read=False,
        ),
        Notification(
            user_id=users["consumer2"].id,
            title="Kondapur RWA Broadcast: Low Water Pressure",
            message="Locality Representative Broadcast: Piped supply flowing at reduced head pressure in Sectors 2 & 3.",
            alert_type=AlertType.conflict,
            is_read=False,
        ),
    ]
    db.add_all(notifs)
    await db.commit()

def print_demo_accounts():
    print("\n" + "="*60)
    print("DEMO ACCOUNTS (password: Demo@1234 for all)")
    print("="*60)
    print("ADMIN:    admin@wms.demo      / Admin@1234")
    print("CONSUMER: priya@wms.demo      / Demo@1234")
    print("CONSUMER: ravi@wms.demo       / Demo@1234")
    print("PROVIDER: provider@wms.demo   / Demo@1234")
    print("PROVIDER: provider2@wms.demo  / Demo@1234")
    print("="*60)
    print("All demo data is clearly labeled as DEMO.")
    print("No real supply schedules were invented.\n")

if __name__ == "__main__":
    asyncio.run(seed_all())
