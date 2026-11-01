"""
DIME Backend — Feasibility Scoring Engine (Targeted Enhancement v3).

Constraint-aware, evidence-backed, analytically defensible Technical Feasibility assessment.

Separates feasibility evaluation into three transparent dimensions:
1. Architectural Complexity (Categorical: Low / Moderate / High / Extreme / Unassessed)
2. Ecosystem Precedent Readiness (0-100% normalized verified implementation precedent)
3. Delivery Execution Fit (Categorical: Feasible / Constrained / Deficit / Unassessed)

Grounding Rules:
- High precedent availability does NOT automatically imply high feasibility for extreme systems.
- Missing optional user constraints are marked Unassessed, NEVER penalized as deficits.
- Robust parsing guarantees natural-language inputs (e.g. "2 engineers, 1 designer") do not crash.
- Backwards compatible: outputs composite score (10.0-95.0) and full structured dimensions.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from backend.scoring.models import ScoreResult, ScoreStatus
from backend.workflow.state import AnalysisState

logger = logging.getLogger(__name__)


# ── Robust Constraint Parsers ─────────────────────────────────────────────

def parse_team_size(raw_value: Any) -> tuple[int | None, list[str]]:
    """
    Safely parse team size and composition from free text or numeric inputs.
    
    Returns:
        (headcount: int | None, roles: list[str])
    """
    if raw_value is None:
        return None, []
    
    if isinstance(raw_value, (int, float)):
        val = int(raw_value)
        return (val if val >= 0 else None), []
    
    text = str(raw_value).strip()
    if not text:
        return None, []
    
    # Check for direct numeric string
    if text.isdigit():
        return int(text), []
    
    text_lower = text.lower()
    roles: list[str] = []
    
    # Solo founder patterns
    if any(s in text_lower for s in ("solo", "single founder", "just me", "individual", "1 person", "solo founder")):
        return 1, ["solo founder"]
    
    # Specific role extraction patterns: e.g. "2 engineers, 1 designer"
    matches = re.findall(
        r"(\d+)\s*(engineers?|developers?|devs?|designers?|ml\s*researchers?|data\s*scientists?|founders?|members?|people)",
        text_lower
    )
    if matches:
        total_headcount = 0
        for count_str, role_name in matches:
            count = int(count_str)
            total_headcount += count
            roles.append(f"{count} {role_name}")
        return total_headcount, roles
    
    # Single number pattern inside string, e.g. "team of 4", "3 developers"
    num_match = re.search(r"\b(\d+)\b", text_lower)
    if num_match:
        count = int(num_match.group(1))
        return count, [text]
    
    # Free-text without identifiable numbers (e.g., "small agile group")
    return None, [text]


def parse_budget(raw_value: Any) -> tuple[float | None, str]:
    """
    Safely parse budget amount and category from free text or numeric inputs.
    
    Returns:
        (amount_usd: float | None, category: str)
    """
    if raw_value is None:
        return None, "unspecified"
    
    if isinstance(raw_value, (int, float)):
        amount = float(raw_value)
        tier = "bootstrapped" if amount <= 0 else ("micro" if amount < 10000 else ("seed" if amount < 100000 else "growth"))
        return amount, tier
    
    text = str(raw_value).strip()
    if not text:
        return None, "unspecified"
    
    text_lower = text.lower()
    
    # Zero or bootstrapped indicators
    if any(k in text_lower for k in ("bootstrap", "self-funded", "$0", "zero", "none", "no budget")):
        return 0.0, "bootstrapped"
    
    # Match patterns like $10k, $10,000, 50k, 1.5M, 20000
    cleaned = re.sub(r"[,\$]", "", text_lower)
    
    k_match = re.search(r"(\d+(?:\.\d+)?)\s*k\b", cleaned)
    if k_match:
        amount = float(k_match.group(1)) * 1000.0
        return amount, "micro" if amount < 10000 else ("seed" if amount < 100000 else "growth")
        
    m_match = re.search(r"(\d+(?:\.\d+)?)\s*m\b", cleaned)
    if m_match:
        amount = float(m_match.group(1)) * 1000000.0
        return amount, "growth"
        
    num_match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if num_match:
        amount = float(num_match.group(1))
        return amount, "micro" if amount < 10000 else ("seed" if amount < 100000 else "growth")
        
    return None, text


def parse_timeline(raw_value: Any) -> tuple[float | None, str]:
    """
    Safely parse timeline duration into normalized months.
    
    Returns:
        (months: float | None, raw_or_period: str)
    """
    if raw_value is None:
        return None, "unspecified"
    
    if isinstance(raw_value, (int, float)):
        return float(raw_value), f"{raw_value} months"
    
    text = str(raw_value).strip()
    if not text:
        return None, "unspecified"
    
    text_lower = text.lower()
    
    # Months
    m_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:month|mo|m\b)", text_lower)
    if m_match:
        return float(m_match.group(1)), text
    
    # Weeks
    w_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:week|wk|w\b)", text_lower)
    if w_match:
        return round(float(w_match.group(1)) / 4.0, 2), text
    
    # Years
    y_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:year|yr|y\b)", text_lower)
    if y_match:
        return float(y_match.group(1)) * 12.0, text
        
    # Days
    d_match = re.search(r"(\d+(?:\.\d+)?)\s*days?", text_lower)
    if d_match:
        return round(float(d_match.group(1)) / 30.0, 2), text
        
    # Bare number fallback (assumed months)
    bare_match = re.match(r"^(\d+(?:\.\d+)?)$", text)
    if bare_match:
        return float(bare_match.group(1)), f"{bare_match.group(1)} months"
        
    return None, text


# ── Dimension A: Architectural Complexity Rubric ──────────────────────────

def evaluate_architectural_complexity(
    idea: dict[str, Any],
    structured_idea: dict[str, Any] | None = None
) -> tuple[str, float, list[str], str]:
    """
    Evaluate engineering difficulty of proposed system.
    
    Returns:
        (category: str, score: float, signals: list[str], rationale: str)
        where score represents feasibility ease (100 = easiest, 0 = hardest).
    """
    title = str(idea.get("title") or "")
    description = str(idea.get("description") or "")
    domain = str(idea.get("domain") or "")
    form_factors = str(idea.get("formFactors") or idea.get("form_factors") or "")
    
    text_corpus = f"{title} {description} {domain} {form_factors}".lower()
    if structured_idea:
        tech_concepts = " ".join(structured_idea.get("technical_concepts", []))
        core_caps = " ".join(structured_idea.get("core_capabilities", []))
        text_corpus = f"{text_corpus} {tech_concepts} {core_caps}".lower()
    
    signals: list[str] = []
    
    # 1. Extreme Complexity Signals (Space, safety-critical RTOS, ASICs, rad-hard)
    extreme_keywords = [
        ("real-time operating system", "Hard real-time RTOS requirements"),
        ("rtos", "RTOS kernel architecture"),
        ("aerospace", "Aerospace-grade operational environment"),
        ("radiation", "Radiation-hardening / SEU mitigation"),
        ("lunar", "Extraterrestrial / space surface deployment"),
        ("satellite", "Orbital / satellite avionics constraints"),
        ("asic", "Custom ASIC / silicon design"),
        ("fpga", "FPGA hardware synthesis"),
        ("do-178", "DO-178C avionics safety certification"),
        ("sub-millisecond", "Sub-millisecond deterministic latency bounds"),
        ("microsecond", "Microsecond-level latency constraints"),
        ("pacemaker", "Implantable medical safety-critical constraints"),
    ]
    def has_word(pattern: str) -> bool:
        return bool(re.search(r"\b" + re.escape(pattern) + r"\b", text_corpus))

    for kw, sig in extreme_keywords:
        if has_word(kw):
            signals.append(sig)
            
    if len(signals) >= 2 or any(has_word(k) for k in ("lunar", "radiation-hard", "aerospace", "do-178", "asic")):
        rationale = f"Classified as Extreme Complexity due to critical hardware/safety constraints: {', '.join(signals[:3])}."
        return "Extreme", 25.0, signals, rationale

    # 2. High Complexity Signals (Autonomous robotics, distributed consensus, compilers, custom engines)
    high_keywords = [
        ("autonomous", "Autonomous vehicle or drone control systems"),
        ("robotics", "Physical robotics hardware kinematics & control"),
        ("firmware", "Low-level embedded hardware firmware"),
        ("compiler", "Custom compiler / bytecode virtual machine"),
        ("distributed consensus", "Distributed consensus protocols (Raft/Paxos/BFT)"),
        ("blockchain", "Decentralized consensus validation"),
        ("kernel driver", "OS kernel device driver implementation"),
        ("cryptographic protocol", "Novel cryptographic protocol design"),
        ("computer vision in hardware", "On-device embedded computer vision"),
        ("sensor fusion", "Multi-sensor Kalman filtering / fusion"),
    ]
    for kw, sig in high_keywords:
        if has_word(kw):
            signals.append(sig)
            
    if len(signals) >= 1 or any(has_word(k) for k in ("robot", "drone", "firmware", "driver", "consensus", "compiler")):
        rationale = f"Classified as High Complexity due to embedded, distributed, or specialized systems engineering: {', '.join(signals[:3])}."
        return "High", 45.0, signals, rationale

    # 3. Moderate Complexity Signals (Multi-tenant SaaS, ML/LLM pipelines, WebSockets, complex APIs)
    mod_keywords = [
        ("llm", "Large language model / agent orchestration pipeline"),
        ("ai-powered", "Applied machine learning / AI model integration"),
        ("fhir", "Healthcare SMART-on-FHIR / EHR integration compliance"),
        ("hipaa", "HIPAA-compliant healthcare data security requirements"),
        ("pipeline", "High-throughput data ingestion pipeline"),
        ("websocket", "Real-time bi-directional streaming"),
        ("streaming", "Continuous media or event streaming"),
        ("multi-tenant", "Multi-tenant B2B SaaS architecture"),
        ("analytics", "Complex data aggregation and analytics engine"),
        ("billing", "Usage-based metering and billing infrastructure"),
    ]
    for kw, sig in mod_keywords:
        if has_word(kw):
            signals.append(sig)
            
    if len(signals) >= 1 or any(has_word(k) for k in ("saas", "api", "apis", "platform", "ai", "cloud", "integration")):
        rationale = f"Classified as Moderate Complexity typical of cloud SaaS, ML orchestration, or API integrations: {', '.join(signals[:3])}."
        return "Moderate", 70.0, signals, rationale

    # 4. Low Complexity Signals (Standard web CRUD, directory, content, landing pages)
    if len(text_corpus.strip()) > 30:
        signals.append("Standard web/mobile architecture with established patterns")
        rationale = "Classified as Low Complexity; standard web/CRUD workflows with mature frameworks."
        return "Low", 88.0, signals, rationale

    return "Unassessed", 65.0, ["Insufficient architectural specifications"], "Insufficient detail provided to evaluate architectural complexity."


# ── Dimension B: Ecosystem Precedent Readiness ───────────────────────────

def evaluate_ecosystem_readiness(
    state: AnalysisState
) -> tuple[float, dict[str, int], list[str]]:
    """
    Assess availability and maturity of technical precedents (repos, papers, competitors).
    
    Returns:
        (readiness_score: float, counts: dict[str, int], sources: list[str])
    """
    retrieval_diag = state.get("retrieval_diagnostics") or {}
    raw_docs = state.get("_raw_documents") or []
    competition_findings = state.get("competition_findings") or {}

    # 1. GitHub repositories retrieved
    github_diag = retrieval_diag.get("github", {})
    github_selected = github_diag.get("selected", 0) if isinstance(github_diag, dict) else 0
    if github_selected == 0 and raw_docs:
        github_selected = sum(
            1 for d in raw_docs 
            if getattr(d, "source_type", None) == "github" or (isinstance(d, dict) and d.get("source_type") == "github")
        )

    # 2. Peer-reviewed papers retrieved
    s2_diag = retrieval_diag.get("semantic_scholar", {})
    s2_papers = s2_diag.get("selected", 0) if isinstance(s2_diag, dict) else 0
    cr_diag = retrieval_diag.get("crossref", {})
    cr_papers = cr_diag.get("selected", 0) if isinstance(cr_diag, dict) else 0
    ieee_diag = retrieval_diag.get("ieee_xplore", {})
    ieee_papers = ieee_diag.get("selected", 0) if isinstance(ieee_diag, dict) else 0
    papers_found = s2_papers + cr_papers + ieee_papers
    if papers_found == 0 and raw_docs:
        papers_found = sum(
            1 for d in raw_docs 
            if getattr(d, "source_type", None) in ("semantic_scholar", "crossref", "ieee_xplore") 
            or (isinstance(d, dict) and d.get("source_type") in ("semantic_scholar", "crossref", "ieee_xplore"))
        )

    # 3. Market competitors
    competitors = competition_findings.get("competitors", []) if isinstance(competition_findings, dict) else []
    competitor_count = len(competitors)

    counts = {
        "github_repositories": github_selected,
        "academic_papers": papers_found,
        "market_competitors": competitor_count,
    }

    # Normalized 0-100% readiness:
    # GitHub: up to 40% (8% per repo, max 5)
    # Academic: up to 30% (6% per paper, max 5)
    # Competitor proof: up to 30% (10% per competitor, max 3)
    repo_contrib = min(github_selected * 8.0, 40.0)
    paper_contrib = min(papers_found * 6.0, 30.0)
    comp_contrib = min(competitor_count * 10.0, 30.0)

    total_readiness = repo_contrib + paper_contrib + comp_contrib
    if total_readiness == 0.0:
        total_readiness = 15.0  # Novel or unindexed baseline

    readiness_score = round(min(100.0, total_readiness), 1)

    sources = []
    if github_selected > 0:
        sources.append(f"{github_selected} open-source repositories")
    if papers_found > 0:
        sources.append(f"{papers_found} academic research papers")
    if competitor_count > 0:
        sources.append(f"{competitor_count} commercial market precedents")

    return readiness_score, counts, sources


# ── Dimension C: Delivery Execution Fit ────────────────────────────────────

def evaluate_delivery_fit(
    complexity_category: str,
    idea: dict[str, Any]
) -> tuple[str, dict[str, Any], str]:
    """
    Evaluate whether proposed implementation appears achievable under user's stated constraints.
    
    Returns:
        (category: str, parsed_constraints: dict[str, Any], assessment: str)
        where category is: 'Feasible' | 'Constrained' | 'Deficit' | 'Unassessed'.
    """
    raw_team = idea.get("team_size") or idea.get("teamSize")
    raw_budget = idea.get("budget")
    raw_timeline = idea.get("timeline") or idea.get("timeline_months")
    
    headcount, roles = parse_team_size(raw_team)
    budget_usd, budget_tier = parse_budget(raw_budget)
    timeline_months, timeline_raw = parse_timeline(raw_timeline)
    
    parsed = {
        "team": {"headcount": headcount, "roles": roles, "raw": str(raw_team) if raw_team else None},
        "budget": {"amount_usd": budget_usd, "tier": budget_tier, "raw": str(raw_budget) if raw_budget else None},
        "timeline": {"months": timeline_months, "raw": str(timeline_raw) if raw_timeline else None},
    }

    # Critical rule: If all constraints are missing/unspecified, DO NOT fabricate a deficit.
    if headcount is None and budget_usd is None and timeline_months is None:
        return (
            "Unassessed",
            parsed,
            "Execution constraints (team, budget, timeline) were not explicitly provided. Assessed as neutral feasibility."
        )

    deficits: list[str] = []
    constraints: list[str] = []

    # 1. Capacity vs Complexity checks
    if complexity_category == "Extreme":
        # Space RTOS, ASICs, kernels
        if headcount is not None and headcount <= 1:
            deficits.append("Solo founder attempting extreme-complexity aerospace/RTOS architecture")
        elif headcount is not None and headcount < 4:
            constraints.append(f"Small team of {headcount} for safety-critical systems development")
            
        if budget_usd is not None and budget_usd < 25000:
            deficits.append(f"Budget of ${budget_usd:,.0f} is insufficient for specialized hardware/avionics testing")
            
        if timeline_months is not None and timeline_months < 9:
            deficits.append(f"Target timeline of {timeline_months} months is unrealistic for aerospace certification/RTOS")
            
    elif complexity_category == "High":
        # Robotics, firmware, compilers, distributed consensus
        if headcount is not None and headcount <= 1:
            constraints.append("Solo developer for multi-component systems engineering")
        if budget_usd is not None and budget_usd < 10000:
            constraints.append(f"Tight budget (${budget_usd:,.0f}) for hardware/firmware prototyping")
        if timeline_months is not None and timeline_months < 4:
            constraints.append(f"Aggressive timeline ({timeline_months} months) for high-complexity engineering")
            
    elif complexity_category in ("Moderate", "Low", "Unassessed"):
        # Cloud SaaS, web apps, tools
        if headcount is not None and headcount >= 1:
            pass  # 1 developer can easily build an MVP web app or SaaS
        if budget_usd is not None and budget_usd == 0:
            constraints.append("Bootstrapped execution requiring zero-marginal-cost infrastructure")
        if timeline_months is not None and timeline_months < 1:
            constraints.append(f"Sub-month timeline ({timeline_months} mo) requires strict MVP scoping")

    if deficits:
        assessment = f"Critical delivery deficit detected: {'; '.join(deficits)}."
        return "Deficit", parsed, assessment
        
    if constraints:
        assessment = f"Operationally constrained: {'; '.join(constraints)}. Requires phased milestone delivery."
        return "Constrained", parsed, assessment

    assessment = "Stated team capacity, budget, and timeline are well-matched to the architectural requirements."
    return "Feasible", parsed, assessment


# ── Main Feasibility Evaluator ────────────────────────────────────────────

def calculate_feasibility(state: AnalysisState) -> ScoreResult:
    """
    Calculate constraint-aware, evidence-backed Technical Feasibility.
    
    Synthesizes:
    1. Architectural Complexity (Low / Moderate / High / Extreme / Unassessed)
    2. Ecosystem Precedent Readiness (0-100% normalized verified precedents)
    3. Delivery Execution Fit (Feasible / Constrained / Deficit / Unassessed)
    """
    idea = state.get("idea", {})
    structured_idea = state.get("structured_idea")

    # 1. Dimension A: Architectural Complexity
    comp_category, comp_score, comp_signals, comp_rationale = evaluate_architectural_complexity(
        idea=idea, structured_idea=structured_idea
    )

    # 2. Dimension B: Ecosystem Precedent Readiness
    readiness_score, precedent_counts, precedent_sources = evaluate_ecosystem_readiness(state)

    # 3. Dimension C: Delivery Execution Fit
    fit_category, parsed_constraints, fit_assessment = evaluate_delivery_fit(
        complexity_category=comp_category, idea=idea
    )

    # 4. Composite Score Synthesis (Calibrated 10.0 to 95.0)
    # Base feasibility from architectural engineering hurdle:
    complexity_bases = {
        "Extreme": 30.0,
        "High": 50.0,
        "Moderate": 70.0,
        "Low": 85.0,
        "Unassessed": 65.0,
    }
    base_feasibility = complexity_bases.get(comp_category, 65.0)

    # Precedent readiness adjustment:
    # Having precedents helps (up to +15 pts), but for Extreme complexity it is capped at +10 pts
    # because public repos don't make space-grade kernels simple.
    max_precedent_boost = 10.0 if comp_category == "Extreme" else 15.0
    precedent_boost = (readiness_score / 100.0) * max_precedent_boost

    # Delivery execution adjustment (only applied when user supplied constraints):
    fit_adjustments = {
        "Feasible": 5.0,
        "Constrained": -8.0,
        "Deficit": -20.0,
        "Unassessed": 0.0,
    }
    fit_adj = fit_adjustments.get(fit_category, 0.0)

    raw_composite = base_feasibility + precedent_boost + fit_adj
    composite_score = round(max(10.0, min(95.0, raw_composite)), 1)

    # Build comprehensive explanation
    prec_summary = f"{readiness_score}% precedent readiness ({', '.join(precedent_sources) if precedent_sources else 'baseline'})"
    fit_summary = f"Delivery fit: {fit_category}"
    if parsed_constraints["team"]["raw"]:
        fit_summary += f" ({parsed_constraints['team']['raw']}"
        if parsed_constraints["budget"]["raw"]:
            fit_summary += f", {parsed_constraints['budget']['raw']}"
        if parsed_constraints["timeline"]["raw"]:
            fit_summary += f", {parsed_constraints['timeline']['raw']}"
        fit_summary += ")"

    explanation = (
        f"Architectural Complexity: {comp_category} ({comp_score:.0f}/100) | "
        f"Ecosystem Readiness: {prec_summary} | "
        f"{fit_summary}."
    )

    structured_inputs: dict[str, Any] = {
        "calculation_version": "v3",
        "method": "constraint_aware_feasibility",
        "composite_score": composite_score,
        "architectural_complexity": {
            "category": comp_category,
            "complexity_score": comp_score,
            "signals": comp_signals,
            "rationale": comp_rationale,
        },
        "ecosystem_precedent_readiness": {
            "readiness_percent": readiness_score,
            "sources": precedent_counts,
            "source_descriptions": precedent_sources,
        },
        "delivery_execution_fit": {
            "category": fit_category,
            "constraints": parsed_constraints,
            "assessment": fit_assessment,
        },
    }

    # Extract any evidence IDs from raw documents if available
    raw_docs = state.get("_raw_documents") or []
    evidence_refs: list[str] = []
    for d in raw_docs[:5]:
        doc_id = getattr(d, "id", None) or (d.get("id") if isinstance(d, dict) else None)
        if doc_id:
            evidence_refs.append(str(doc_id))

    return ScoreResult(
        metric="Feasibility",
        score=composite_score,
        status=ScoreStatus.AVAILABLE,
        inputs=structured_inputs,
        evidence_references=evidence_refs,
        explanation=explanation,
        calculation_version="v3"
    )
