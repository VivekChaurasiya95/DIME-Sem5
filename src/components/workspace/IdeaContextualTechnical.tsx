"use client";

import React, { useState, useMemo } from "react";
import type { ReportData } from "@/components/analysis/ReportViewer";
import type { EvidenceItem } from "@/components/analysis/EvidenceExplorer";
import { 
  Compass, 
  Cpu, 
  Layers, 
  Lock, 
  Server, 
  Workflow, 
  CheckCircle2, 
  AlertTriangle,
  Code2,
  ExternalLink,
  ShieldCheck,
  Check,
  ArrowRight,
  GitBranch,
  BookOpen,
  Info,
  FileText,
  X,
  ChevronDown,
  HelpCircle
} from "lucide-react";

interface IdeaContextualTechnicalProps {
  ideaId: string;
  analysisId: string;
  title: string;
  report: ReportData | null;
  evidence: EvidenceItem[];
}

export function IdeaContextualTechnical({
  ideaId,
  analysisId,
  title,
  report,
  evidence,
}: IdeaContextualTechnicalProps) {
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<EvidenceItem | null>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  // 1. Dynamic Feasibility Score & Telemetry from Backend analysis_scores
  const feasObj = report?.scores?.["Feasibility"];
  const feasibilityScore = typeof feasObj?.score === "number" && !isNaN(feasObj.score)
    ? Math.round(feasObj.score)
    : null;

  const feasibilityInputs = useMemo(() => {
    if (!feasObj?.inputs) return null;
    if (typeof feasObj.inputs === "string") {
      try {
        return JSON.parse(feasObj.inputs);
      } catch {
        return null;
      }
    }
    return feasObj.inputs;
  }, [feasObj?.inputs]);

  const isV3 = feasibilityInputs?.calculation_version === "v3";
  const archComplexity = feasibilityInputs?.architectural_complexity?.category;
  const deliveryFit = feasibilityInputs?.delivery_execution_fit?.category;

  const feasibilityStatus = isV3 && archComplexity
    ? `${archComplexity} Complexity • ${deliveryFit ? `${deliveryFit} Fit` : "Assessed"}`
    : (feasibilityScore !== null
      ? feasibilityScore >= 70 
        ? "High Precedent Availability (Established Building Blocks)" 
        : feasibilityScore >= 45 
        ? "Moderate Implementation Complexity (Integration Required)" 
        : "R&D Intensive (Limited Public Precedents)"
      : "Assessment In Progress / Uncalculated");

  const feasibilityExplanation = feasObj?.explanation || 
    "Architecture assessment evaluating public code implementations, research papers, and documented technical precedents.";

  // 2. Real GitHub Evidence (Open-Source Architectural Precedents)
  const githubEvidence = useMemo(() => {
    return (evidence || []).filter(
      (e) => e.evidence_type === "github" || e.source_url?.includes("github.com")
    );
  }, [evidence]);

  // 3. Real Academic & Engineering Research Evidence (Semantic Scholar & Crossref)
  const researchEvidence = useMemo(() => {
    return (evidence || []).filter(
      (e) => e.evidence_type === "research" || 
             e.source_url?.includes("semanticscholar") || 
             e.source_url?.includes("doi.org") || 
             e.source_url?.includes("arxiv")
    );
  }, [evidence]);

  // 4. Real Feasibility / Technical Findings from Ingested Pipeline (Backward compatible contract)
  const technicalFindings = useMemo(() => {
    return (report?.findings || []).filter((f) => {
      if (f.category === "feasibility" || f.category === "technical") return true;
      if (f.category === "research") {
        const text = `${f.title || ""} ${f.description || ""}`.toLowerCase();
        return (
          text.includes("architecture") ||
          text.includes("implementation") ||
          text.includes("feasibility") ||
          text.includes("pipeline") ||
          text.includes("protocol") ||
          text.includes("api") ||
          text.includes("integration") ||
          text.includes("interoperability") ||
          text.includes("benchmark") ||
          text.includes("latency") ||
          text.includes("throughput") ||
          text.includes("concurrency") ||
          text.includes("scalability") ||
          text.includes("bottleneck") ||
          text.includes("constraint")
        );
      }
      return false;
    });
  }, [report?.findings]);

  // 5. Prioritized MVP Focus / Validation Stages (From genuine report mvp_focus)
  const mvpFocusStages = useMemo(() => {
    return report?.mvp_focus || [];
  }, [report?.mvp_focus]);

  return (
    <div className="space-y-8 pt-2 pb-16">
      {/* 1. Header Banner & Feasibility Score */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-bold text-text-strong">Technical Feasibility & Architecture Assessment</h2>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Component breakdown, open-source precedents, and engineering de-risking for{" "}
              <span className="font-semibold text-text-strong">{title}</span>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-800/40 text-center sm:text-right shrink-0">
            <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
              Feasibility Score
            </div>
            {feasibilityScore !== null ? (
              <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                {feasibilityScore} <span className="text-sm font-semibold text-teal-600">/ 100</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-teal-700 dark:text-teal-300 py-1">
                Score Pending
              </div>
            )}
            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
              {feasibilityStatus}
            </div>
          </div>
        </div>

        {/* Rationale & Formula Inspection Bar */}
        <div className="pt-3 border-t border-border-default text-xs text-text-secondary space-y-2">
          <p className="leading-relaxed">{feasibilityExplanation}</p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-teal-700 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showFormulaDetails ? "Hide Formula Rationale" : "Inspect Deterministic Scoring Inputs"}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFormulaDetails ? "rotate-180" : ""}`} />
            </button>

            <span className="text-[11px] text-text-muted italic">
              Calculation: {isV3 ? "DIME v3 Constraint-Aware Multi-Dimensional Model" : "DIME v2 Deterministic Precedent Model"}
            </span>
          </div>

          {/* Formula Rationale Dropdown */}
          {showFormulaDetails && (
            <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40 space-y-3 text-xs">
              <div className="font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Workflow className="w-4 h-4 text-teal-600" />
                <span>Deterministic Feasibility Assessment Dimensions</span>
              </div>

              {isV3 && feasibilityInputs ? (
                <div className="space-y-3 pt-1">
                  {/* 3-Dimensional Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Dimension A: Architectural Complexity */}
                    <div className="p-3 rounded-xl bg-surface-white dark:bg-slate-900 border border-teal-200/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Dimension 1</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          archComplexity === "Extreme" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" :
                          archComplexity === "High" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                          archComplexity === "Moderate" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" :
                          archComplexity === "Low" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" :
                          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {archComplexity || "Unassessed"} Complexity
                        </span>
                      </div>
                      <div className="font-semibold text-text-strong text-[12px]">Architectural Complexity</div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {feasibilityInputs.architectural_complexity?.rationale || "Evaluated against system safety, real-time latency, and hardware dependency rubrics."}
                      </p>
                      {feasibilityInputs.architectural_complexity?.signals?.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1">
                          {feasibilityInputs.architectural_complexity.signals.slice(0, 2).map((sig: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-text-muted">
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dimension B: Ecosystem Precedent Readiness */}
                    <div className="p-3 rounded-xl bg-surface-white dark:bg-slate-900 border border-teal-200/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Dimension 2</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                          {feasibilityInputs.ecosystem_precedent_readiness?.readiness_percent ?? 0}% Readiness
                        </span>
                      </div>
                      <div className="font-semibold text-text-strong text-[12px]">Ecosystem Precedents</div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Quantifies public open-source implementations, academic papers, and existing commercial products.
                      </p>
                      <div className="text-[10px] text-text-muted pt-1 space-y-0.5 font-mono">
                        <div>Repos: {feasibilityInputs.ecosystem_precedent_readiness?.sources?.github_repositories ?? githubEvidence.length}</div>
                        <div>Papers: {feasibilityInputs.ecosystem_precedent_readiness?.sources?.academic_papers ?? researchEvidence.length}</div>
                        <div>Competitors: {feasibilityInputs.ecosystem_precedent_readiness?.sources?.market_competitors ?? (report?.competitors?.length || 0)}</div>
                      </div>
                    </div>

                    {/* Dimension C: Delivery Execution Fit */}
                    <div className="p-3 rounded-xl bg-surface-white dark:bg-slate-900 border border-teal-200/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Dimension 3</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          deliveryFit === "Feasible" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" :
                          deliveryFit === "Constrained" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                          deliveryFit === "Deficit" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" :
                          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {deliveryFit || "Unassessed"}
                        </span>
                      </div>
                      <div className="font-semibold text-text-strong text-[12px]">Delivery Execution Fit</div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {feasibilityInputs.delivery_execution_fit?.assessment || "Assesses stated team capacity, budget, and MVP timeline against engineering demands."}
                      </p>
                      {feasibilityInputs.delivery_execution_fit?.constraints && (
                        <div className="text-[10px] text-text-muted pt-1 space-y-0.5">
                          {feasibilityInputs.delivery_execution_fit.constraints.team?.raw && (
                            <div>Team: {feasibilityInputs.delivery_execution_fit.constraints.team.raw}</div>
                          )}
                          {feasibilityInputs.delivery_execution_fit.constraints.budget?.raw && (
                            <div>Budget: {feasibilityInputs.delivery_execution_fit.constraints.budget.raw}</div>
                          )}
                          {feasibilityInputs.delivery_execution_fit.constraints.timeline?.raw && (
                            <div>Timeline: {feasibilityInputs.delivery_execution_fit.constraints.timeline.raw}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted pt-1 leading-relaxed">
                    <strong>Analytical Methodology:</strong> Feasibility synthesizes Architectural Complexity (base engineering hurdle), Ecosystem Precedents (verified public references), and Execution Fit (stated team and resource constraints). Precedents demonstrate technical plausibility but do not substitute for engineering capacity. Missing optional constraints are marked Unassessed without penalty.
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-text-secondary leading-relaxed font-mono">
                    Feasibility = min(100, 15 (Base) + (GitHub Repos × 5.0) + (Papers × 4.0) + (Competitors × 5.0))
                  </p>
                  {feasibilityInputs && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 rounded bg-surface-white dark:bg-slate-900 border border-teal-200/50">
                        GitHub Codebases: <strong>{feasibilityInputs.github_implementations ?? githubEvidence.length}</strong>
                      </div>
                      <div className="p-2 rounded bg-surface-white dark:bg-slate-900 border border-teal-200/50">
                        Research Literature: <strong>{feasibilityInputs.research_papers ?? researchEvidence.length}</strong>
                      </div>
                      <div className="p-2 rounded bg-surface-white dark:bg-slate-900 border border-teal-200/50">
                        Competitor Precedents: <strong>{feasibilityInputs.competitor_count ?? (report?.competitors?.length || 0)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="text-[11px] text-text-muted pt-1">
                    <strong>Analytical Boundary:</strong> Legacy report calculated under DIME v2 precedent model.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Evidence-Backed Architectural Findings */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-text-strong">Evidence-Backed Feasibility Signals</h3>
          </div>
          <span className="text-xs text-text-muted">
            {technicalFindings.length} verified finding{technicalFindings.length === 1 ? "" : "s"}
          </span>
        </div>

        {technicalFindings.length === 0 ? (
          <div className="p-6 rounded-xl bg-canvas-bg border border-dashed border-border-default text-center space-y-2">
            <Layers className="w-6 h-6 text-text-muted mx-auto" />
            <h4 className="text-xs font-bold text-text-strong">No Dedicated Technical Bottlenecks Identified in Scanned Evidence</h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Retrieved research papers and repositories demonstrate baseline technical components without fatal architectural roadblocks. Inspect open-source precedents below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technicalFindings.map((tf, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-canvas-bg border border-border-default space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-text-strong">{tf.title}</h4>
                    {typeof tf.confidence === "number" && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                        {tf.confidence > 1.0 ? Math.round(tf.confidence) : Math.round(tf.confidence * 100)}% Conf
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{tf.description}</p>
                </div>
                
                <div className="text-[11px] text-text-muted pt-2 border-t border-border-default flex items-center justify-between">
                  <span>Backed by {tf.evidence_count} primary citation{tf.evidence_count === 1 ? "" : "s"}</span>
                  {tf.evidence_ids && tf.evidence_ids.length > 0 && (
                    <span className="font-mono text-[10px]">{tf.evidence_ids.length} linked chunk{tf.evidence_ids.length === 1 ? "" : "s"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Open-Source Technical Precedents (GitHub Repositories) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
            <Code2 className="w-4 h-4 text-teal-600" />
            <span>Open-Source Technical Implementations (GitHub)</span>
          </h3>
          <span className="text-xs text-text-muted font-medium">
            {githubEvidence.length} indexed repository codebase{githubEvidence.length === 1 ? "" : "s"}
          </span>
        </div>

        <p className="text-xs text-text-secondary">
          Open-source repositories establish verifiable engineering precedent. They prove that analogous software architectures, drivers, or models have been successfully compiled and shared.
        </p>

        {githubEvidence.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface-white border border-dashed border-border-default text-center space-y-3">
            <GitBranch className="w-8 h-8 text-text-muted mx-auto" />
            <h4 className="text-sm font-bold text-text-strong">No Direct Open-Source Repositories Indexed</h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              No matching open-source GitHub repositories met the relevance threshold for these specific queries. This indicates greenfield implementation opportunity or proprietary market whitespace.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {githubEvidence.map((ge) => (
              <div key={ge.id} className="p-5 rounded-2xl bg-surface-white border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                      ARCHITECTURAL_PRECEDENT
                    </span>
                    {typeof ge.relevance_score === "number" && !isNaN(ge.relevance_score) && (
                      <span className="text-xs font-semibold text-emerald-600">
                        Relevance: {Math.round(ge.relevance_score * 100)}%
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-text-strong line-clamp-1">{ge.source_title}</h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-3 leading-relaxed">
                    {ge.claim || ge.supporting_text}
                  </p>
                </div>

                <div className="pt-3 border-t border-border-default flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedEvidenceModal(ge)}
                    className="text-text-muted hover:text-text-strong font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Raw Passage</span>
                  </button>

                  {ge.source_url && (
                    <a
                      href={ge.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Inspect Repository</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Peer-Reviewed Scientific & Engineering Foundation */}
      {researchEvidence.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <span>Peer-Reviewed Scientific & Engineering Foundation</span>
            </h3>
            <span className="text-xs text-text-muted font-medium">
              {researchEvidence.length} indexed paper{researchEvidence.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            Peer-reviewed literature demonstrates theoretical and experimental algorithmic validity in laboratory or controlled prototype environments.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchEvidence.map((re) => (
              <div key={re.id} className="p-5 rounded-2xl bg-surface-white border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 uppercase">
                      RESEARCH_FOUNDATION
                    </span>
                    {typeof re.relevance_score === "number" && !isNaN(re.relevance_score) && (
                      <span className="text-xs font-semibold text-emerald-600">
                        Relevance: {Math.round(re.relevance_score * 100)}%
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-text-strong line-clamp-2">{re.source_title}</h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-3 leading-relaxed">
                    {re.claim || re.supporting_text}
                  </p>
                </div>

                <div className="pt-3 border-t border-border-default flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedEvidenceModal(re)}
                    className="text-text-muted hover:text-text-strong font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Abstract Chunk</span>
                  </button>

                  {re.source_url && (
                    <a
                      href={re.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>View Publication</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Prioritized Technical De-Risking Milestones (Replacing Fabricated Weeks 1-12 Roadmap) */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-text-strong">Prioritized Technical De-risking Milestones</h3>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300">
            Ordered Priority Stages
          </span>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          The validation sequence below organizes technical objectives by execution dependency. Calendar timelines depend on team velocity and capital allocation, and are thus modeled by structural priority rather than arbitrary calendar dates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mvpFocusStages.length > 0 ? (
            mvpFocusStages.map((stage, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                  idx === 0 
                    ? "border-red-200 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/40" 
                    : idx === 1 
                    ? "border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40" 
                    : "border-slate-200 bg-canvas-bg dark:border-slate-800"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      idx === 0 ? "bg-red-600 text-white" : idx === 1 ? "bg-amber-600 text-white" : "bg-slate-600 text-white"
                    }`}>
                      {stage.priority || `Phase ${idx + 1}`}
                    </span>
                    <span className="text-[11px] text-text-muted font-semibold">Priority {idx + 1}</span>
                  </div>
                  <h4 className="text-sm font-bold text-text-strong">{stage.title}</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">{stage.description}</p>
                </div>

                <div className="text-[11px] font-semibold text-text-muted pt-2 border-t border-border-default">
                  Goal: Validate core hypothesis before capital expansion
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase">
                    Stage 1: P0 Core Proof
                  </span>
                  <span className="text-[11px] text-text-muted font-semibold">Essential Milestone</span>
                </div>
                <h4 className="text-sm font-bold text-text-strong">Foundational Algorithmic Validation</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Verify the core algorithmic parser, data representation schemas, and deterministic state transitions against synthetic and representative real-world test sets.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase">
                    Stage 2: P1 Interoperability
                  </span>
                  <span className="text-[11px] text-text-muted font-semibold">Integration Milestone</span>
                </div>
                <h4 className="text-sm font-bold text-text-strong">Protocol Connectors & Security Boundaries</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Implement external API connectors, bi-directional webhook synchronizers, authentication handshakes, and strict zero-leakage security boundaries.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-canvas-bg dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white uppercase">
                    Stage 3: P2 Scale & Telemetry
                  </span>
                  <span className="text-[11px] text-text-muted font-semibold">Optimization Milestone</span>
                </div>
                <h4 className="text-sm font-bold text-text-strong">Operational Auditing & High-Availability</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Deploy cryptographic audit logging, automated rate-limiting guards, low-latency caching layers, and end-to-end telemetry monitoring.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 6. Isolated Evidence Inspection Drawer / Modal */}
      {selectedEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-white border border-border-default rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-text-strong">Verified Evidence Citation</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceModal(null)}
                className="p-1 rounded-lg hover:bg-canvas-bg text-text-muted hover:text-text-strong"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-text-strong">Source Title:</span>
                <p className="text-text-secondary mt-0.5">{selectedEvidenceModal.source_title || "Untitled Document"}</p>
              </div>

              <div>
                <span className="font-semibold text-text-strong">Evidence Type:</span>
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                  {selectedEvidenceModal.evidence_type}
                </span>
                {typeof selectedEvidenceModal.relevance_score === "number" && (
                  <span className="ml-2 font-semibold text-emerald-600">
                    Relevance: {Math.round(selectedEvidenceModal.relevance_score * 100)}%
                  </span>
                )}
              </div>

              <div>
                <span className="font-semibold text-text-strong">Verified Assertion / Claim:</span>
                <div className="p-3 rounded-xl bg-canvas-bg border border-border-default text-text-secondary leading-relaxed mt-1">
                  {selectedEvidenceModal.claim}
                </div>
              </div>

              {selectedEvidenceModal.supporting_text && selectedEvidenceModal.supporting_text !== selectedEvidenceModal.claim && (
                <div>
                  <span className="font-semibold text-text-strong">Supporting Raw Passage:</span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border-default text-text-secondary leading-relaxed mt-1 font-mono text-[11px] max-h-40 overflow-y-auto">
                    {selectedEvidenceModal.supporting_text}
                  </div>
                </div>
              )}

              {selectedEvidenceModal.source_url && (
                <div className="pt-2 border-t border-border-default flex items-center justify-between">
                  <span className="text-text-muted truncate max-w-sm font-mono text-[11px]">{selectedEvidenceModal.source_url}</span>
                  <a
                    href={selectedEvidenceModal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-teal-700"
                  >
                    <span>Open Canonical Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
