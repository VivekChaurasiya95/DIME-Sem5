"""
Unit and regression tests for DIME's Targeted Technical Feasibility Evaluation Enhancement (v3).

Verifies:
1. Safe natural-language team size parsing without float() crash
2. Safe budget and timeline normalization
3. Architectural Complexity rubric classification (Extreme vs High vs Moderate vs Low)
4. Ecosystem Precedent Readiness normalization
5. Delivery Execution Fit (Deficit vs Constrained vs Feasible vs Unassessed)
6. Prevention of precedent-inflation bug (Lunar-OS must not score 95/100)
7. Non-penalization of missing optional constraints
8. Downstream ScoreResult structure and calculation version v3
"""

import pytest
from backend.scoring.feasibility import (
    parse_team_size,
    parse_budget,
    parse_timeline,
    evaluate_architectural_complexity,
    evaluate_delivery_fit,
    calculate_feasibility,
)
from backend.scoring.models import ScoreStatus


def test_team_size_parsing_natural_language():
    """Verify team size parser handles diverse natural language expressions safely without crashing."""
    # Multi-role breakdown
    count, roles = parse_team_size("2 engineers, 1 designer")
    assert count == 3
    assert len(roles) == 2
    assert "2 engineer" in roles[0]
    assert "1 designer" in roles[1]

    # Solo founder
    count, roles = parse_team_size("Solo founder")
    assert count == 1
    assert "solo founder" in roles

    count, roles = parse_team_size("single founder")
    assert count == 1

    # 3 developers
    count, roles = parse_team_size("3 developers")
    assert count == 3

    # 2 engineers and 1 ML researcher
    count, roles = parse_team_size("2 engineers and 1 ML researcher")
    assert count == 3

    # Pure numeric
    count, roles = parse_team_size(5)
    assert count == 5
    count, roles = parse_team_size("4")
    assert count == 4

    # Ambiguous free text without numbers
    count, roles = parse_team_size("early stage startup squad")
    assert count is None
    assert "early stage startup squad" in roles

    # Empty / None
    assert parse_team_size(None) == (None, [])
    assert parse_team_size("") == (None, [])


def test_budget_parsing():
    """Verify budget parsing handles currency formats, abbreviations, and qualitative descriptions."""
    amount, tier = parse_budget("$5,000")
    assert amount == 5000.0
    assert tier == "micro"

    amount, tier = parse_budget("25k")
    assert amount == 25000.0
    assert tier == "seed"

    amount, tier = parse_budget("$1.5M")
    assert amount == 1500000.0
    assert tier == "growth"

    amount, tier = parse_budget("Bootstrapped")
    assert amount == 0.0
    assert tier == "bootstrapped"

    amount, tier = parse_budget(None)
    assert amount is None
    assert tier == "unspecified"


def test_timeline_parsing():
    """Verify timeline parsing handles months, weeks, years, and days."""
    months, raw = parse_timeline("3 months")
    assert months == 3.0

    months, raw = parse_timeline("6 weeks")
    assert months == 1.5

    months, raw = parse_timeline("1 year")
    assert months == 12.0

    months, raw = parse_timeline(None)
    assert months is None


def test_architectural_complexity_classification():
    """Verify architectural complexity correctly identifies Extreme, High, and Moderate systems."""
    # Extreme: Lunar RTOS
    lunar_idea = {
        "title": "Lunar-OS: Fault-Tolerant RTOS for Lunar Surface Operations",
        "description": "A hard real-time operating system for space avionics with SEU mitigation, rad-hard architecture, and microsecond deterministic latency bounds.",
        "domain": "Aerospace & Defense / Embedded Systems",
    }
    cat, score, signals, rationale = evaluate_architectural_complexity(lunar_idea)
    assert cat == "Extreme"
    assert score == 25.0
    assert any("real-time" in s.lower() or "rtos" in s.lower() or "aerospace" in s.lower() for s in signals)

    # High: Robotics firmware
    robotics_idea = {
        "title": "RoboGrip: Autonomous Robotic Arm Firmware",
        "description": "Low-level firmware and embedded control algorithms for autonomous multi-axis robotic manipulation.",
        "domain": "Robotics & Hardware",
    }
    cat, score, signals, rationale = evaluate_architectural_complexity(robotics_idea)
    assert cat == "High"
    assert score == 45.0

    # Moderate: Cloud SaaS
    saas_idea = {
        "title": "SupportFlow: AI Customer Support Triage",
        "description": "An LLM-powered multi-tenant SaaS that classifies inbound customer support tickets and connects to Zendesk APIs.",
        "domain": "B2B SaaS / Customer Support",
    }
    cat, score, signals, rationale = evaluate_architectural_complexity(saas_idea)
    assert cat == "Moderate"
    assert score == 70.0

    # Low: Standard web app
    web_idea = {
        "title": "DevDirectory: Curated Tech Jobs Board",
        "description": "A clean directory listing remote developer job postings with email alerts.",
        "domain": "Web Publishing",
    }
    cat, score, signals, rationale = evaluate_architectural_complexity(web_idea)
    assert cat == "Low"
    assert score == 88.0


def test_lunar_os_not_inflated_by_precedents():
    """
    CRITICAL TEST: An extreme complexity project (Lunar-OS) must NOT score 95/100
    simply because GitHub repos and academic papers exist.
    """
    state = {
        "idea": {
            "title": "Lunar-OS: Fault-Tolerant RTOS for Lunar Surface Operations",
            "description": "Hard real-time operating system with rad-hard SEU mitigation for lunar surface payloads.",
            "domain": "Aerospace / RTOS",
            "team_size": "Solo founder",
            "budget": "$5,000",
            "timeline": "3 months",
        },
        "retrieval_diagnostics": {
            "github": {"selected": 5},
            "semantic_scholar": {"selected": 4},
            "crossref": {"selected": 3},
        },
        "competition_findings": {
            "competitors": [{"competitor": "VxWorks"}, {"competitor": "RTEMS"}]
        },
    }

    result = calculate_feasibility(state)

    assert result.status == ScoreStatus.AVAILABLE
    # In the old flawed formula, this would score min(100, 15 + 25 + 28 + 10) = 78-95!
    # With our constraint-aware engine, Extreme complexity + Deficit delivery fit must result in a low score:
    assert result.score <= 30.0, f"Lunar-OS score too high: {result.score} (must reflect extreme complexity and resource deficit)"
    assert result.inputs["architectural_complexity"]["category"] == "Extreme"
    assert result.inputs["delivery_execution_fit"]["category"] == "Deficit"
    assert result.calculation_version == "v3"


def test_missing_constraints_not_penalized():
    """Verify that omitting optional constraints marks Delivery Fit as Unassessed and does NOT penalize the score."""
    state_without_constraints = {
        "idea": {
            "title": "SmartDocs: AI Legal Document Analyzer",
            "description": "Cloud platform using LLM pipelines to summarize commercial lease contracts for legal teams.",
            "domain": "LegalTech",
        },
        "retrieval_diagnostics": {
            "github": {"selected": 3},
            "semantic_scholar": {"selected": 2},
        },
        "competition_findings": {
            "competitors": [{"competitor": "Harvey AI"}]
        },
    }

    result = calculate_feasibility(state_without_constraints)

    assert result.inputs["delivery_execution_fit"]["category"] == "Unassessed"
    # Should evaluate based on Moderate complexity (~70) + Precedents (~10), with NO deficit penalty applied:
    assert 70.0 <= result.score <= 90.0, f"Expected neutral score for standard SaaS without constraints, got {result.score}"


def test_realistic_saas_with_adequate_team_scores_high():
    """Verify that a standard SaaS with an adequate team and reasonable timeline achieves high feasibility."""
    state = {
        "idea": {
            "title": "FeedbackPulse: Product Feedback Aggregator",
            "description": "B2B SaaS application that aggregates user feedback from Discord, Slack, and email into actionable product roadmaps.",
            "domain": "Productivity SaaS",
            "team_size": "2 engineers, 1 designer",
            "budget": "$20,000",
            "timeline": "6 months",
        },
        "retrieval_diagnostics": {
            "github": {"selected": 4},
            "semantic_scholar": {"selected": 2},
        },
        "competition_findings": {
            "competitors": [{"competitor": "Canny"}, {"competitor": "UserVoice"}]
        },
    }

    result = calculate_feasibility(state)

    assert result.inputs["architectural_complexity"]["category"] == "Moderate"
    assert result.inputs["delivery_execution_fit"]["category"] == "Feasible"
    assert result.score >= 75.0, f"Expected strong feasibility for well-resourced SaaS, got {result.score}"
