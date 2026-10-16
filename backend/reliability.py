"""
WMS Community Reliability Engine

Evaluates the confidence in available supply information for a locality.

Score factors:
  1. Report freshness   (age of the most recent report)
  2. Agreement          (multiple independent reporters saying the same thing)
  3. Conflict           (contradictory recent reports lower confidence)
  4. Official source    (official announcements are weighted separately)

The score (0.0–1.0) represents confidence in the information quality,
NOT a guarantee that water is physically available.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from models import SupplyReport, ReportType, SupplyStatus, ReportStatus


# Configurable thresholds
FRESH_WINDOW_MINUTES = 30        # reports within this window are "fresh"
STALE_THRESHOLD_MINUTES = 120    # reports older than this are "stale"
CONFLICT_WINDOW_MINUTES = 60     # window within which conflicting reports matter
MIN_REPORTS_FOR_HIGH_CONFIDENCE = 3

# Report types that indicate supply ON
ON_TYPES = {ReportType.supply_started}
# Report types that indicate supply OFF
OFF_TYPES = {ReportType.supply_stopped, ReportType.no_supply, ReportType.supply_delayed}


def _age_factor(age_minutes: float) -> float:
    """Returns a freshness weight 1.0 → 0.0 as age increases."""
    if age_minutes <= FRESH_WINDOW_MINUTES:
        return 1.0
    if age_minutes >= STALE_THRESHOLD_MINUTES:
        return 0.0
    # Linear decay between fresh and stale window
    span = STALE_THRESHOLD_MINUTES - FRESH_WINDOW_MINUTES
    return 1.0 - (age_minutes - FRESH_WINDOW_MINUTES) / span


def _deduplicate_by_user(reports: List[SupplyReport]) -> List[SupplyReport]:
    """Keep only the most recent report per user to prevent artificial inflation."""
    seen = {}
    for r in sorted(reports, key=lambda x: x.submitted_at, reverse=True):
        if r.reporter_id not in seen:
            seen[r.reporter_id] = r
    return list(seen.values())


def calculate_reliability(
    reports: List[SupplyReport],
    has_official_schedule: bool = False
) -> dict:
    """
    Returns a dict with:
      score           float 0–1
      supply_status   SupplyStatus
      report_count    int
      agreeing_count  int
      conflicting_count int
      freshest_age_minutes float|None
      explanation     list[str]
    """
    now = datetime.now(timezone.utc)
    explanation = []

    # Filter to only accepted/pending reports (not rejected)
    valid_reports = [r for r in reports if r.status != ReportStatus.rejected]

    if not valid_reports:
        if has_official_schedule:
            return {
                "score": 0.3,
                "supply_status": SupplyStatus.expected,
                "report_count": 0,
                "agreeing_count": 0,
                "conflicting_count": 0,
                "freshest_age_minutes": None,
                "explanation": [
                    "No community reports available.",
                    "A published schedule exists but has not been confirmed by community reports.",
                    "Confidence is low — schedule adherence is unknown.",
                ]
            }
        return {
            "score": 0.0,
            "supply_status": SupplyStatus.no_data,
            "report_count": 0,
            "agreeing_count": 0,
            "conflicting_count": 0,
            "freshest_age_minutes": None,
            "explanation": ["No reports are available for this locality."]
        }

    # Deduplicate by user
    unique_reports = _deduplicate_by_user(valid_reports)
    explanation.append(
        f"{len(valid_reports)} total report(s) from {len(unique_reports)} unique reporter(s)."
    )

    # Compute ages and weights
    weighted_reports = []
    for r in unique_reports:
        if r.submitted_at.tzinfo is None:
            submitted_utc = r.submitted_at.replace(tzinfo=timezone.utc)
        else:
            submitted_utc = r.submitted_at
        age_min = (now - submitted_utc).total_seconds() / 60
        weight = _age_factor(age_min)
        weighted_reports.append((r, age_min, weight))

    freshest_age = min(x[1] for x in weighted_reports)

    if freshest_age > STALE_THRESHOLD_MINUTES:
        explanation.append(
            f"The most recent report is {int(freshest_age)} minutes old — this is stale information."
        )
        return {
            "score": 0.1,
            "supply_status": SupplyStatus.stale,
            "report_count": len(valid_reports),
            "agreeing_count": 0,
            "conflicting_count": 0,
            "freshest_age_minutes": freshest_age,
            "explanation": explanation
        }

    if freshest_age <= FRESH_WINDOW_MINUTES:
        explanation.append(
            f"The most recent report is {int(freshest_age)} minutes old — considered fresh."
        )
    else:
        explanation.append(
            f"The most recent report is {int(freshest_age)} minutes old — aging."
        )

    # Focus on recent reports within conflict window
    recent = [(r, age, w) for r, age, w in weighted_reports if age <= CONFLICT_WINDOW_MINUTES]

    on_reports = [(r, age, w) for r, age, w in recent if r.report_type in ON_TYPES]
    off_reports = [(r, age, w) for r, age, w in recent if r.report_type in OFF_TYPES]

    has_conflict = bool(on_reports) and bool(off_reports)

    if has_conflict:
        explanation.append(
            f"Conflicting reports detected: {len(on_reports)} report(s) say water is ON, "
            f"{len(off_reports)} report(s) say water is OFF or delayed."
        )
        explanation.append("Confidence is reduced because independent reporters disagree.")
        score = 0.2
        status = SupplyStatus.conflicting
        agreeing_count = 0
        conflicting_count = len(on_reports) + len(off_reports)
    else:
        # Determine dominant direction
        on_weight = sum(w for _, _, w in on_reports)
        off_weight = sum(w for _, _, w in off_reports)

        if on_weight > off_weight:
            dominant = on_reports
            status = SupplyStatus.reported_on
            label = "supply is ON"
        elif off_weight > on_weight:
            dominant = off_reports
            # Check if any delayed specifically
            has_delay = any(r.report_type == ReportType.supply_delayed for r, _, _ in off_reports)
            status = SupplyStatus.delayed if has_delay else SupplyStatus.reported_off
            label = "supply is delayed" if has_delay else "supply is OFF"
        else:
            dominant = []
            status = SupplyStatus.no_data
            label = "mixed"

        agreeing_count = len(dominant)
        conflicting_count = 0
        total_weight = sum(w for _, _, w in recent) if recent else 0

        if agreeing_count == 1:
            explanation.append(f"Only 1 independent report says {label}.")
            score = 0.4 * (total_weight / max(total_weight, 1))
        elif agreeing_count == 2:
            explanation.append(f"2 independent reports agree that {label}.")
            score = 0.65
        elif agreeing_count >= MIN_REPORTS_FOR_HIGH_CONFIDENCE:
            explanation.append(
                f"{agreeing_count} independent reports agree that {label} — high agreement."
            )
            score = min(0.95, 0.65 + 0.1 * (agreeing_count - 2))
        else:
            score = 0.2

    if has_official_schedule and not has_conflict:
        score = min(1.0, score + 0.05)
        explanation.append("An official schedule exists, which slightly increases confidence.")

    explanation.append(
        f"Reliability score: {round(score * 100)}%. "
        "This represents confidence in available information, not a guarantee of supply."
    )

    return {
        "score": round(score, 3),
        "supply_status": status,
        "report_count": len(valid_reports),
        "agreeing_count": agreeing_count,
        "conflicting_count": conflicting_count,
        "freshest_age_minutes": round(freshest_age, 1),
        "explanation": explanation
    }
