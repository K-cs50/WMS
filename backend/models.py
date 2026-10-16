import enum
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Text,
    ForeignKey, Enum as SAEnum, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

# ─── Enums ───────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    consumer = "consumer"
    provider = "provider"
    admin = "admin"

class ReportType(str, enum.Enum):
    supply_started = "supply_started"
    supply_stopped = "supply_stopped"
    no_supply = "no_supply"
    supply_delayed = "supply_delayed"
    low_pressure = "low_pressure"
    emergency_shortage = "emergency_shortage"
    tanker_availability = "tanker_availability"
    general_note = "general_note"

class VerificationStatus(str, enum.Enum):
    official = "official"                   # Verified by authority (e.g. HMWSSB, GHMC)
    community_reported = "community_reported" # Verified by multi-neighbor consensus
    unverified = "unverified"               # Fresh user submission, awaiting confirmation
    conflicting = "conflicting"             # Disagreeing reports in locality window
    outdated = "outdated"                   # > 2h old or past supply timing

class ReportStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    flagged = "flagged"

class SupplyStatus(str, enum.Enum):
    expected = "expected"
    reported_on = "reported_on"
    reported_off = "reported_off"
    delayed = "delayed"
    conflicting = "conflicting"
    stale = "stale"
    no_data = "no_data"

class BookingStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    in_progress = "in_progress"
    delivered = "delivered"
    cancelled = "cancelled"

class WaterCategory(str, enum.Enum):
    potable = "potable"
    non_potable = "non_potable"
    irrigation = "irrigation"
    industrial = "industrial"

class AlertType(str, enum.Enum):
    supply_start = "supply_start"
    supply_stop = "supply_stop"
    delay = "delay"
    conflict = "conflict"
    stale = "stale"
    weather = "weather"
    booking_update = "booking_update"
    bulk_threshold = "bulk_threshold"

class NotificationChannel(str, enum.Enum):
    in_app = "in_app"
    sms = "sms"

class BulkRequestStatus(str, enum.Enum):
    open = "open"
    threshold_met = "threshold_met"
    provider_quotes = "provider_quotes"
    confirmed = "confirmed"
    cancelled = "cancelled"

# ─── Models ──────────────────────────────────────────────────────────────────

class City(Base):
    __tablename__ = "cities"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    state = Column(String(100), nullable=False)
    country = Column(String(50), default="India")
    latitude = Column(Float)
    longitude = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    localities = relationship("Locality", back_populates="city")

class Locality(Base):
    __tablename__ = "localities"
    id = Column(Integer, primary_key=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    name = Column(String(200), nullable=False)
    district = Column(String(200))
    postal_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    zone = Column(String(100))
    ward = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    city = relationship("City", back_populates="localities")
    reports = relationship("SupplyReport", back_populates="locality")
    schedules = relationship("SupplySchedule", back_populates="locality")
    alert_subscriptions = relationship("AlertSubscription", back_populates="locality")
    reliability_scores = relationship("ReliabilityScore", back_populates="locality")
    bulk_requests = relationship("BulkWaterRequest", back_populates="locality")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.consumer, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_locality_rep = Column(Boolean, default=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=True)
    preferred_alert_channel = Column(SAEnum(NotificationChannel), default=NotificationChannel.in_app)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    city = relationship("City")
    locality = relationship("Locality")
    reports = relationship("SupplyReport", back_populates="reporter", foreign_keys="SupplyReport.reporter_id")
    notifications = relationship("Notification", back_populates="user")
    alert_subscriptions = relationship("AlertSubscription", back_populates="user")
    bookings = relationship("Booking", back_populates="consumer", foreign_keys="Booking.consumer_id")
    bulk_memberships = relationship("BulkRequestMember", back_populates="user")
    provider_profile = relationship("ProviderProfile", back_populates="user", uselist=False, foreign_keys="ProviderProfile.user_id")
    audit_events = relationship("AuditEvent", back_populates="user")

class ProviderProfile(Base):
    __tablename__ = "provider_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    business_name = Column(String(200), nullable=False)
    registration_number = Column(String(100))
    contact_name = Column(String(200))
    contact_phone = Column(String(20))
    contact_email = Column(String(255))
    address = Column(Text)
    description = Column(Text)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime(timezone=True))
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operating_hours = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="provider_profile", foreign_keys=[user_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
    tankers = relationship("Tanker", back_populates="provider")
    service_areas = relationship("ProviderServiceArea", back_populates="provider")
    bookings = relationship("Booking", back_populates="provider")

class Tanker(Base):
    __tablename__ = "tankers"
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey("provider_profiles.id"), nullable=False)
    registration_number = Column(String(50), unique=True)
    capacity_liters = Column(Integer, nullable=False)
    water_category = Column(SAEnum(WaterCategory), nullable=False)
    vehicle_type = Column(String(100))
    is_available = Column(Boolean, default=True)
    current_latitude = Column(Float)
    current_longitude = Column(Float)
    last_location_update = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    provider = relationship("ProviderProfile", back_populates="tankers")
    bookings = relationship("Booking", back_populates="tanker")

class ProviderServiceArea(Base):
    __tablename__ = "provider_service_areas"
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey("provider_profiles.id"), nullable=False)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    provider = relationship("ProviderProfile", back_populates="service_areas")
    locality = relationship("Locality")
    __table_args__ = (UniqueConstraint("provider_id", "locality_id"),)

class SupplySchedule(Base):
    __tablename__ = "supply_schedules"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    day_of_week = Column(Integer)  # 0=Mon, 6=Sun, None=daily
    expected_start_time = Column(String(10))  # HH:MM
    expected_end_time = Column(String(10))    # HH:MM
    duration_minutes = Column(Integer)
    frequency_notes = Column(Text)
    source = Column(String(500))
    source_url = Column(String(1000))
    is_official = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    valid_from = Column(Date)
    valid_until = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    locality = relationship("Locality", back_populates="schedules")

class SupplyReport(Base):
    __tablename__ = "supply_reports"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(SAEnum(ReportType), nullable=False)
    observed_at = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text)
    status = Column(SAEnum(ReportStatus), default=ReportStatus.pending)
    is_demo = Column(Boolean, default=False)
    reliability_contribution = Column(Float, default=1.0)
    moderated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    moderated_at = Column(DateTime(timezone=True))
    moderation_note = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Broadcast & Source Tracking fields
    is_broadcast = Column(Boolean, default=False)
    is_official = Column(Boolean, default=False)
    verification_status = Column(String(50), default="unverified")
    expected_supply_time = Column(String(50))
    actual_start_time = Column(String(50))
    actual_stop_time = Column(String(50))
    water_availability_status = Column(String(50))
    source = Column(String(300))
    source_url = Column(String(1000))
    affected_locality_ids = Column(JSON)

    locality = relationship("Locality", back_populates="reports")
    reporter = relationship("User", back_populates="reports", foreign_keys=[reporter_id])
    moderated_by = relationship("User", foreign_keys=[moderated_by_id])

class ReliabilityScore(Base):
    __tablename__ = "reliability_scores"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False, unique=True)
    score = Column(Float, default=0.0)  # 0.0 to 1.0
    supply_status = Column(SAEnum(SupplyStatus), default=SupplyStatus.no_data)
    report_count = Column(Integer, default=0)
    agreeing_count = Column(Integer, default=0)
    conflicting_count = Column(Integer, default=0)
    freshest_report_age_minutes = Column(Float)
    explanation = Column(JSON)  # list of explanation strings
    last_calculated = Column(DateTime(timezone=True), server_default=func.now())
    locality = relationship("Locality", back_populates="reliability_scores")

class WeatherObservation(Base):
    __tablename__ = "weather_observations"
    id = Column(Integer, primary_key=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    temperature_c = Column(Float)
    humidity_pct = Column(Float)
    rainfall_mm = Column(Float)
    description = Column(String(200))
    wind_speed_kmh = Column(Float)
    is_heat_advisory = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=True)
    source = Column(String(200))
    observed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    city = relationship("City")

class WaterStressIndicator(Base):
    __tablename__ = "water_stress_indicators"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    groundwater_level_m = Column(Float)
    reservoir_storage_pct = Column(Float)
    stress_level = Column(String(20))  # low, moderate, high, critical
    stress_label = Column(String(200))
    data_source = Column(String(500))
    source_url = Column(String(1000))
    is_official = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=True)
    observation_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    locality = relationship("Locality")

class OfficialDataSource(Base):
    __tablename__ = "official_data_sources"
    id = Column(Integer, primary_key=True)
    organization = Column(String(300), nullable=False)
    source_code = Column(String(50), index=True)
    source_url = Column(String(1000))
    data_category = Column(String(200))
    geographic_coverage = Column(String(300))
    last_retrieved = Column(DateTime(timezone=True))
    verification_status = Column(String(50))
    connection_status = Column(String(50), default="Connected")  # Connected, Partially Available, Demo Data, Unavailable
    is_automated_sync = Column(Boolean, default=False)
    last_sync_at = Column(DateTime(timezone=True))
    sync_frequency_minutes = Column(Integer, default=60)
    sync_message = Column(String(500))
    disclaimer = Column(Text)
    api_endpoint = Column(String(1000))
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ContactDirectory(Base):
    __tablename__ = "contact_directory"
    id = Column(Integer, primary_key=True)
    organization = Column(String(300), nullable=False)
    service_purpose = Column(String(500))
    phone_number = Column(String(50))
    is_toll_free = Column(Boolean, default=False)
    email = Column(String(255))
    website_url = Column(String(1000))
    official_source_url = Column(String(1000))
    geographic_coverage = Column(String(300))
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    verification_date = Column(Date)
    is_verified = Column(Boolean, default=False)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    city = relationship("City")

class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    alert_types = Column(JSON)  # list of AlertType values
    channel = Column(SAEnum(NotificationChannel), default=NotificationChannel.in_app)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="alert_subscriptions")
    locality = relationship("Locality", back_populates="alert_subscriptions")
    __table_args__ = (UniqueConstraint("user_id", "locality_id"),)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(SAEnum(AlertType))
    channel = Column(SAEnum(NotificationChannel), default=NotificationChannel.in_app)
    is_read = Column(Boolean, default=False)
    delivery_status = Column(String(50), default="delivered")
    related_locality_id = Column(Integer, ForeignKey("localities.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="notifications")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    consumer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("provider_profiles.id"), nullable=False)
    tanker_id = Column(Integer, ForeignKey("tankers.id"), nullable=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)
    water_category = Column(SAEnum(WaterCategory), nullable=False)
    quantity_liters = Column(Integer, nullable=False)
    quoted_price = Column(Float)
    agreed_price = Column(Float)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.pending)
    is_bulk = Column(Boolean, default=False)
    bulk_request_id = Column(Integer, ForeignKey("bulk_water_requests.id"), nullable=True)
    requested_date = Column(Date)
    scheduled_time = Column(String(10))
    consumer_notes = Column(Text)
    provider_notes = Column(Text)
    booking_reference = Column(String(20), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    consumer = relationship("User", back_populates="bookings", foreign_keys=[consumer_id])
    provider = relationship("ProviderProfile", back_populates="bookings")
    tanker = relationship("Tanker", back_populates="bookings")
    locality = relationship("Locality")
    delivery_updates = relationship("DeliveryUpdate", back_populates="booking")

class DeliveryUpdate(Base):
    __tablename__ = "delivery_updates"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    status = Column(SAEnum(BookingStatus), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    is_simulated = Column(Boolean, default=True)
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    booking = relationship("Booking", back_populates="delivery_updates")

class BulkWaterRequest(Base):
    __tablename__ = "bulk_water_requests"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    water_category = Column(SAEnum(WaterCategory), nullable=False)
    quantity_liters_per_unit = Column(Integer, nullable=False)
    threshold = Column(Integer, default=10)
    status = Column(SAEnum(BulkRequestStatus), default=BulkRequestStatus.open)
    description = Column(Text)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    locality = relationship("Locality", back_populates="bulk_requests")
    created_by = relationship("User")
    members = relationship("BulkRequestMember", back_populates="bulk_request")
    bookings = relationship("Booking", back_populates="bulk_request_ref", foreign_keys="Booking.bulk_request_id")

# Fix the circular reference
Booking.bulk_request_ref = relationship("BulkWaterRequest", back_populates="bookings", foreign_keys=[Booking.bulk_request_id])

class BulkRequestMember(Base):
    __tablename__ = "bulk_request_members"
    id = Column(Integer, primary_key=True)
    bulk_request_id = Column(Integer, ForeignKey("bulk_water_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quantity_liters = Column(Integer)
    delivery_address = Column(Text)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    bulk_request = relationship("BulkWaterRequest", back_populates="members")
    user = relationship("User", back_populates="bulk_memberships")
    __table_args__ = (UniqueConstraint("bulk_request_id", "user_id"),)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(200), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="audit_events")

class SupplyForecast(Base):
    __tablename__ = "supply_forecasts"
    id = Column(Integer, primary_key=True)
    locality_id = Column(Integer, ForeignKey("localities.id"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    estimated_start_time = Column(String(10))
    estimated_end_time = Column(String(10))
    confidence_level = Column(Float)  # 0 to 1
    historical_sample_count = Column(Integer)
    method = Column(String(100))
    uncertainty_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    locality = relationship("Locality")
