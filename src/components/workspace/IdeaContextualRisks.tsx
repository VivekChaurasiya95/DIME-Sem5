"use client";

import React, { useState, useMemo } from "react";
import type { ReportData } from "@/components/analysis/ReportViewer";
import type { EvidenceItem } from "@/components/analysis/EvidenceExplorer";
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  Shield,
  Layers,
  Compass,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Search,
  BookOpen,
  GitBranch,
  Target,
  Database,
  Calculator,
  Flame,
  CheckCircle
} from "lucide-react";
import type { WorkspaceTabId } from "./IdeaWorkspaceTabs";

interface IdeaContextualRisksProps {
  ideaId: string;
  analysisId: string;
  title: string;
  report: ReportData | null;
  evidence: EvidenceItem[];
  onSwitchTab?: (tab: WorkspaceTabId) => void;
}

export function IdeaContextualRisks({
  ideaId,
  analysisId,
  title,
  report,
  evidence,
  onSwitchTab,
}: IdeaContextualRisksProps) {
  // State for Evidence Inspection Drawer
  const [selectedRiskEvidence, setSelectedRiskEvidence] = useState<{
    riskTitle: string;
    items: EvidenceItem[];
  } | null>(null);

  // State for Formula Transparency Card
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // 1. Genuine Risk Score & Pipeline Telemetry
  const riskObj = report?.scores?.["Risk Indicator"] || report?.scores?.["Risk"];
  const hasRiskScore = typeof riskObj?.score === "number";
  const riskScore = typeof riskObj?.score === "number" ? Math.round(riskObj.score) : null;
  const riskConfidence = riskObj?.confidence !== undefined && riskObj?.confidence !== null 
    ? (riskObj.confidence > 1.0 ? Math.round(riskObj.confidence) : Math.round(riskObj.confidence * 100))
    : null;

  // Extract component scores feeding into the Risk Formula
  const satObj = report?.scores?.["Market Saturation"] || report?.scores?.["Saturation"];
  const satScore = typeof satObj?.score === "number" ? Math.round(satObj.score) : null;

  const feasObj = report?.scores?.["Technical Feasibility"] || report?.scores?.["Feasibility"];
  const feasScore = typeof feasObj?.score === "number" ? Math.round(feasObj.score) : null;

  const novObj = report?.scores?.["Novelty Score"] || report?.scores?.["Novelty"];
  const novScore = typeof novObj?.score === "number" ? Math.round(novObj.score) : null;

  // 2. Real Risk & Uncertainty Findings from Ingested Pipeline
  const realRiskFindings = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.filter(
      (f) => f.category === "risk" || f.category === "uncertainty"
    );
  }, [report?.findings]);

  // 3. Evidence Corpus Breakdown for Gap Analysis
  const corpusStats = useMemo(() => {
    let papers = 0;
    let repos = 0;
    let other = 0;
    evidence.forEach((ev) => {
      const type = ((ev as any).source_type || ev.evidence_type || "").toLowerCase();
      const url = (ev.source_url || (ev as any).url || "").toLowerCase();
      if (type.includes("scholar") || type.includes("crossref") || type.includes("paper") || url.includes("doi.org") || url.includes("arxiv.org")) {
        papers++;
      } else if (type.includes("github") || url.includes("github.com")) {
        repos++;
      } else {
        other++;
      }
    });
    return {
      total: evidence.length,
      papers,
      repos,
      other,
    };
  }, [evidence]);

  // 4. Actionable Prioritized De-risking Milestones from Ingested Data
  // Safely normalizes both MVPFocusItem objects and primitive strings
  const prioritizedMilestones = useMemo(() => {
    const mvpItems = report?.mvp_focus || [];
    const gaps = report?.strategic_gaps || [];

    const milestones: Array<{
      priority: "P0" | "P1" | "P2";
      stageLabel: string;
      title: string;
      description: string;
      timeline?: string;
      sourceCategory: string;
    }> = [];

    // Safe extraction helper to guarantee renderable string primitives
    const parseMvpItem = (
      item: any,
      fallbackPriority: "P0" | "P1" | "P2",
      defaultTitle: string,
      stageLabel: string
    ) => {
      if (!item) return null;
      if (typeof item === "string") {
        return {
          priority: fallbackPriority,
          stageLabel,
          title: defaultTitle,
          description: item,
          sourceCategory: "Synthesis MVP Directive",
        };
      }
      if (typeof item === "object") {
        const prio = (item.priority === "P0" || item.priority === "P1" || item.priority === "P2")
          ? item.priority
          : fallbackPriority;
        return {
          priority: prio as "P0" | "P1" | "P2",
          stageLabel: `${prio} Priority: ${item.timeline ? item.timeline : "Direct Action"}`,
          title: typeof item.title === "string" ? item.title : defaultTitle,
          description: typeof item.description === "string" 
            ? item.description 
            : typeof item.title === "string" 
            ? item.title 
            : "",
          timeline: typeof item.timeline === "string" ? item.timeline : undefined,
          sourceCategory: "Synthesis MVP Directive",
        };
      }
      return null;
    };

    const parseGapItem = (
      item: any,
      fallbackPriority: "P0" | "P1" | "P2",
      defaultTitle: string,
      stageLabel: string
    ) => {
      if (!item) return null;
      if (typeof item === "string") {
        return {
          priority: fallbackPriority,
          stageLabel,
          title: defaultTitle,
          description: item,
          sourceCategory: "Strategic Gap Analysis",
        };
      }
      if (typeof item === "object") {
        return {
          priority: fallbackPriority,
          stageLabel,
          title: typeof item.title === "string" ? item.title : defaultTitle,
          description: typeof item.gap === "string"
            ? item.gap
            : typeof item.opportunity === "string"
            ? item.opportunity
            : typeof item.why_it_matters === "string"
            ? item.why_it_matters
            : typeof item.title === "string"
            ? item.title
            : "",
          sourceCategory: "Strategic Gap Analysis",
        };
      }
      return null;
    };

    if (mvpItems.length > 0) {
      const parsed = parseMvpItem(
        mvpItems[0],
        "P0",
        "Immediate Architectural & Technical Validation",
        "P0 Priority: Core De-risking"
      );
      if (parsed) milestones.push(parsed);
    }

    if (mvpItems.length > 1) {
      const parsed = parseMvpItem(
        mvpItems[1],
        "P1",
        "Differentiated Workflow & Defensibility Bridge",
        "P1 Priority: Workflow Integration"
      );
      if (parsed) milestones.push(parsed);
    } else if (gaps.length > 0) {
      const parsed = parseGapItem(
        gaps[0],
        "P1",
        "Exploiting Identified Strategic Moats",
        "P1 Priority: White Space Capture"
      );
      if (parsed) milestones.push(parsed);
    }

    if (mvpItems.length > 2) {
      const parsed = parseMvpItem(
        mvpItems[2],
        "P2",
        "Scaling & Ecosystem Expansion",
        "P2 Priority: Operational Scaling"
      );
      if (parsed) milestones.push(parsed);
    } else if (gaps.length > 1) {
      const parsed = parseGapItem(
        gaps[1],
        "P2",
        "Locking In Identified Architecture Advantages",
        "P2 Priority: Long-Term Defensibility"
      );
      if (parsed) milestones.push(parsed);
    }

    return milestones;
  }, [report?.mvp_focus, report?.strategic_gaps]);

  // Handler to inspect citations for a finding
  const handleOpenEvidence = (findingTitle: string, findingDesc: string) => {
    const searchTerms = `${findingTitle} ${findingDesc}`.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    
    // Find matching evidence items or default to top relevant items
    const matched = evidence.filter(ev => {
      const text = `${ev.source_title || ""} ${ev.claim || ""} ${ev.supporting_text || ""}`.toLowerCase();
      return searchTerms.some(term => text.includes(term));
    });

    const displayItems = matched.length > 0 ? matched.slice(0, 8) : evidence.slice(0, 5);

    setSelectedRiskEvidence({
      riskTitle: findingTitle,
      items: displayItems,
    });
  };

  return (
    <div className="space-y-8 pt-2 pb-16">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-xl font-bold text-text-strong">Risks, Evidence Gaps & Mitigations</h2>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary">
              Deterministic threat modeling, known evidence voids, and verified de-risking priorities for{" "}
              <span className="font-semibold text-text-strong">{title}</span>.
            </p>
          </div>

          {/* Genuine Score Container */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-center sm:text-right shrink-0">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Composite Risk Index
            </div>
            {hasRiskScore ? (
              <>
                <div className="text-2xl font-bold text-text-strong">
                  {riskScore} <span className="text-xs font-semibold text-text-muted">/ 100</span>
                </div>
                <div className="text-[11px] text-text-secondary font-medium">
                  {riskConfidence !== null ? `${riskConfidence}% Model Confidence` : "Verified Synthesis"}
                </div>
              </>
            ) : (
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 py-1">
                Score Pending Synthesis
              </div>
            )}
          </div>
        </div>

        {/* Formula Transparency Explainer Bar */}
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-text-strong uppercase tracking-wider">
                Risk Metric Lineage & Deterministic Calculation
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>{showFormulaDetails ? "Hide Formula" : "Inspect Formula & Inputs"}</span>
              {showFormulaDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            DIME derives the Composite Risk Index deterministically from three peer pipeline scores:
            <span className="font-mono font-semibold text-text-strong ml-1">
              (Saturation × 0.30) + ((100 - Feasibility) × 0.40) + ((100 - Novelty) × 0.30)
            </span>.
            Lower scores reflect defensible novelty with demonstrated technical feasibility; higher scores indicate incumbent saturation or high implementation barriers.
          </p>

          {showFormulaDetails && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-white border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-text-muted uppercase">1. Market Saturation (Weight: 30%)</div>
                <div className="text-sm font-bold text-text-strong">
                  {satScore !== null ? `${satScore} / 100` : "Not Available"}
                </div>
                <p className="text-[11px] text-text-muted">
                  Measures density of commercial and open-source competitors identified.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-white border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-text-muted uppercase">2. Inverted Feasibility (Weight: 40%)</div>
                <div className="text-sm font-bold text-text-strong">
                  {feasScore !== null ? `${100 - feasScore} / 100 (100 - ${feasScore})` : "Not Available"}
                </div>
                <p className="text-[11px] text-text-muted">
                  Higher technical friction increases the composite execution threat.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-white border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-text-muted uppercase">3. Inverted Novelty (Weight: 30%)</div>
                <div className="text-sm font-bold text-text-strong">
                  {novScore !== null ? `${100 - novScore} / 100 (100 - ${novScore})` : "Not Available"}
                </div>
                <p className="text-[11px] text-text-muted">
                  Lower conceptual novelty exposes the idea to rapid incumbent replication.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Categorized Risk & Uncertainty Findings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-text-strong">
              Pipeline Identified Threat Vectors & Uncertainties
            </h3>
          </div>
          <span className="text-xs text-text-muted font-medium">
            {realRiskFindings.length} Verified Finding{realRiskFindings.length === 1 ? "" : "s"}
          </span>
        </div>

        {realRiskFindings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {realRiskFindings.map((finding, idx) => {
              const confPct = finding.confidence !== undefined && finding.confidence !== null
                ? (finding.confidence > 1.0 ? Math.round(finding.confidence) : Math.round(finding.confidence * 100))
                : null;

              // Intelligent risk taxonomy classification based on title and description
              const textContent = `${finding.title || ""} ${finding.description || ""}`.toLowerCase();
              let badgeLabel = "Operational Threat";
              let badgeColor = "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";

              if (textContent.includes("regulatory") || textContent.includes("compliance") || textContent.includes("hipaa") || textContent.includes("fda") || textContent.includes("gdpr") || textContent.includes("legal")) {
                badgeLabel = "Regulatory & Compliance";
                badgeColor = "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40";
              } else if (textContent.includes("security") || textContent.includes("privacy") || textContent.includes("breach") || textContent.includes("authentication") || textContent.includes("vulnerability")) {
                badgeLabel = "Security & Privacy";
                badgeColor = "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40";
              } else if (textContent.includes("technical") || textContent.includes("integration") || textContent.includes("interoperability") || textContent.includes("ehr") || textContent.includes("api") || textContent.includes("latency")) {
                badgeLabel = "Technical & Integration";
                badgeColor = "text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40";
              } else if (textContent.includes("financial") || textContent.includes("cost") || textContent.includes("roi") || textContent.includes("tco") || textContent.includes("budget") || textContent.includes("pricing")) {
                badgeLabel = "Financial Viability";
                badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
              } else if (finding.category === "uncertainty" || textContent.includes("evidence gap") || textContent.includes("missing") || textContent.includes("unclear") || textContent.includes("void")) {
                badgeLabel = "Evidence Gap";
                badgeColor = "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
              }

              // Contextual title if title is generic
              const displayTitle = finding.title && finding.title !== "Uncertainty / Evidence Gap"
                ? finding.title
                : (finding.description.length > 70 
                    ? finding.description.split(".")[0].slice(0, 65) + "..." 
                    : finding.description);

              return (
                <div 
                  key={`risk-finding-${(finding as any).id || idx}-${idx}`}
                  className="p-5 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                        {badgeLabel}
                      </span>
                      {confPct !== null && (
                        <span className="text-xs text-text-muted font-medium">
                          {confPct}% Model Confidence
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted font-medium">
                        {finding.evidence_count} primary citation{finding.evidence_count === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEvidence(finding.title, finding.description)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer ml-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Inspect Sources</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-text-strong">{displayTitle}</h4>
                    <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                      {finding.description}
                    </p>
                  </div>

                  {/* Sources Preview if available */}
                  {(finding.evidence_ids || (finding as any).sources) && (finding.evidence_ids || (finding as any).sources).length > 0 && (
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs text-text-muted">
                      <span className="font-semibold text-[11px] uppercase tracking-wider shrink-0">Source IDs:</span>
                      {(finding.evidence_ids || (finding as any).sources).map((src: string, sIdx: number) => (
                        <span 
                          key={`src-ref-${idx}-${sIdx}-${src}`}
                          className="px-2 py-0.5 rounded bg-canvas-bg border border-border-default font-mono text-[11px] shrink-0"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-surface-white border border-border-default text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-text-muted mx-auto" />
            <h4 className="text-sm font-bold text-text-strong">No Specific Threat Vectors Extracted</h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
              The automated extraction pipeline did not categorize explicit risk or uncertainty findings for this analysis. 
              Review the complete raw corpus in the Evidence Explorer for detailed technical papers and repository discussions.
            </p>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("evidence")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-95 transition-opacity cursor-pointer mt-2"
              >
                <span>Open Evidence Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Information Voids & Pipeline Limitations Warning */}
      <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Info className="w-5 h-5 shrink-0" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Evidence Pipeline Boundaries & Known Information Gaps
          </h3>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          DIME bases this risk analysis strictly on the <span className="font-semibold text-text-strong">{corpusStats.total} verified documents</span> currently ingested in your workspace corpus 
          ({corpusStats.papers} peer-reviewed research papers via Semantic Scholar & Crossref, {corpusStats.repos} open-source repositories via GitHub REST API).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-surface-white/80 dark:bg-slate-900/50 border border-amber-200/60 dark:border-amber-800/30 space-y-1">
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Observed & Verified Coverage</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Algorithmic feasibility, code implementation patterns, architectural dependencies, benchmark performance metrics, and open-source license compatibility.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-white/80 dark:bg-slate-900/50 border border-amber-200/60 dark:border-amber-800/30 space-y-1">
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Unverified Commercial Variables</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Private SaaS pricing, customer contract sizes, CAC/LTV benchmarks, and proprietary vendor enterprise SLAs. These cannot be inferred from repository code or academic papers.
            </p>
          </div>
        </div>
      </div>

      {/* Prioritized De-risking Milestones (P0, P1, P2) */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text-strong">Prioritized De-risking Sequence</h3>
          </div>
          <span className="text-xs text-text-muted font-medium">
            Derived from Ingested MVP Directives
          </span>
        </div>

        {prioritizedMilestones.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {prioritizedMilestones.map((stage, idx) => {
              const badgeStyle = stage.priority === "P0"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300"
                : stage.priority === "P1"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300"
                : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300";

              return (
                <div 
                  key={`stage-${stage.priority}-${idx}`}
                  className="p-4 rounded-xl border border-border-default bg-canvas-bg space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                        {stage.stageLabel}
                      </span>
                      <span className="text-[10px] text-text-muted font-medium">
                        {stage.sourceCategory}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-text-strong">
                      {stage.title}
                    </h4>

                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      {stage.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
                    <span>Validation Directive</span>
                    {stage.timeline && (
                      <span className="font-semibold text-text-strong px-2 py-0.5 rounded bg-surface-white border border-border-subtle text-[10px]">
                        {stage.timeline}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-canvas-bg border border-border-default text-center space-y-2">
            <p className="text-xs text-text-secondary">
              No MVP execution directives or strategic gaps recorded in the current synthesis output.
            </p>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab("technical")}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                Review Technical Feasibility Architecture &rarr;
              </button>
            )}
          </div>
        )}
      </div>

      {/* Slide-out Modal / Drawer for Inspecting Citations */}
      {selectedRiskEvidence && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-xl bg-surface-white h-full shadow-2xl flex flex-col border-l border-border-default">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between gap-3 bg-surface-white">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Evidence Passage Verification</span>
                </div>
                <h3 className="text-sm font-bold text-text-strong line-clamp-1">
                  {selectedRiskEvidence.riskTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRiskEvidence(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-strong hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="text-xs text-text-secondary">
                Showing primary citations matched from your ingested research corpus ({selectedRiskEvidence.items.length} passages):
              </div>

              {selectedRiskEvidence.items.map((item, idx) => (
                <div 
                  key={`ev-item-${item.id || idx}-${idx}`}
                  className="p-4 rounded-xl border border-border-default bg-canvas-bg space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-text-strong">
                      {(item as any).source_type || item.evidence_type || "Corpus Document"}
                    </span>
                    {item.confidence !== undefined && (
                      <span className="text-[11px] font-medium text-text-muted">
                        Relevance: {Math.round(item.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-text-strong">
                    {item.source_title || "Untitled Source Document"}
                  </div>

                  <blockquote className="text-xs text-text-secondary italic border-l-2 border-primary/40 pl-3 py-1 bg-surface-white rounded-r">
                    &ldquo;{item.supporting_text || item.claim || (item as any).text}&rdquo;
                  </blockquote>

                  {(item.source_url || (item as any).url) && (
                    <div className="pt-1">
                      <a 
                        href={item.source_url || (item as any).url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <span>View Original Publication / Repository</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border-default bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <span className="text-[11px] text-text-muted">
                DIME Vector Retrieval via Qdrant
              </span>
              <button
                type="button"
                onClick={() => setSelectedRiskEvidence(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-text-strong text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
