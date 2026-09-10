def calculate_emergency_priority(
    risk_score: float,
    ai_severity: str,
    nearby_reports: int = 1,
    affected_population: int = 500,
    critical_infra: list = None
):
    """
    Generates an Emergency Priority Score (1, 2, or 3) and status label
    for the Disaster Management Authority dashboard.
    """
    infra = critical_infra or []
    has_highway = any("Highway" in item or "Road" in item for item in infra)
    has_hospital_school = any("Hospital" in item or "School" in item for item in infra)

    priority_points = 0

    # Risk score weight
    if risk_score >= 76.0:
        priority_points += 40
    elif risk_score >= 51.0:
        priority_points += 25
    elif risk_score >= 26.0:
        priority_points += 10

    # AI severity weight
    if ai_severity == "Critical":
        priority_points += 25
    elif ai_severity == "High":
        priority_points += 15
    elif ai_severity == "Moderate":
        priority_points += 5

    # Citizen report consensus weight
    if nearby_reports >= 3:
        priority_points += 15
    elif nearby_reports >= 2:
        priority_points += 10

    # Impacted infrastructure weight
    if has_hospital_school:
        priority_points += 15
    if has_highway:
        priority_points += 10

    # Determine priority level
    if priority_points >= 60 or risk_score >= 76.0:
        level = 1
        label = "Priority 1: Immediate Response Required"
        color = "red"
        action_summary = "Deploy NDRF/SDRF teams immediately, dispatch traffic diversion onto safer routes, and issue emergency cell broadcast alerts."
    elif priority_points >= 35 or risk_score >= 51.0:
        level = 2
        label = "Priority 2: High Attention Needed"
        color = "orange"
        action_summary = "Alert district field officers, inspect ground crack progression, and prepare emergency relief shelters."
    else:
        level = 3
        label = "Priority 3: Continuous Monitoring"
        color = "yellow"
        action_summary = "Log incident report into GIS monitoring system and track localized 6-hour rainfall trends."

    return {
        "priority_level": level,
        "priority_label": label,
        "priority_score_points": priority_points,
        "color": color,
        "recommended_action": action_summary
    }
