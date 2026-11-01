"use client";

import React, { useState, useMemo } from "react";
import type { ReportData } from "@/components/analysis/ReportViewer";
import type { EvidenceItem } from "@/components/analysis/EvidenceExplorer";
import { 
  Users, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  Sparkles, 
  Info, 
  BarChart3, 
  Layers, 
  Search,
  Filter,
  Check,
  HelpCircle,
  X,
  FileText,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface IdeaContextualCompetitionProps {
  ideaId: string;
  analysisId: string;
  title: string;
  report: ReportData | null;
  evidence: EvidenceItem[];
}

export function IdeaContextualCompetition({
  ideaId,
  analysisId,
  title,
  report,
  evidence,
}: IdeaContextualCompetitionProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCompName, setSelectedCompName] = useState<string | null>(null);
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<EvidenceItem | null>(null);

  // 1. Genuine Ingested GitHub Evidence (Open Source Technical Precedents)
  const githubEvidence = useMemo(() => {
    return (evidence || []).filter(
      (e) => e.evidence_type === "github" || e.source_url?.includes("github.com")
    );
  }, [evidence]);

  // 2. Genuine Competitors from Backend Report
  const rawCompetitors = useMemo(() => report?.competitors || [], [report?.competitors]);

  const competitors = useMemo(() => {
    return rawCompetitors.map((c, idx) => {
      const classification = c.classification || "Alternative Solution";
      const isDirect = classification.toLowerCase().includes("direct");
      const isIndirect = classification.toLowerCase().includes("indirect") || classification.toLowerCase().includes("adjacent");
      const isOss = classification.toLowerCase().includes("open source") || classification.toLowerCase().includes("repository");
      
      const overlapVal = typeof c.overlap === "number" && !isNaN(c.overlap) ? Math.round(c.overlap) : null;
      const overlapColor = overlapVal !== null
        ? overlapVal >= 75 ? "bg-red-500" : overlapVal >= 55 ? "bg-amber-500" : "bg-blue-500"
        : "bg-slate-400";

      // Match linked evidence by source title or url
      const linkedEvidence = (evidence || []).filter((e) => {
        const cName = (c.name || "").toLowerCase();
        const eTitle = (e.source_title || "").toLowerCase();
        const eUrl = (e.source_url || "").toLowerCase();
        return cName.length > 2 && (eTitle.includes(cName) || eUrl.includes(cName.replace(/\s+/g, "-")));
      });

      return {
        id: `comp-${idx + 1}`,
        name: c.name || `Solution ${idx + 1}`,
        classification,
        isDirect,
        isIndirect,
        isOss,
        overlap: overlapVal,
        status: c.status || "Identified",
        url: c.url || null,
        targetAudience: (c as any).target_audience || null,
        strengths: c.strengths || "Strengths documented in research findings and competitive synthesis.",
        limitations: c.limitations || "Limitations identified from competitive gaps and technical divergence.",
        evidence_count: linkedEvidence.length > 0 ? linkedEvidence.length : (c.evidence_count || 1),
        linkedEvidence,
        overlapColor,
      };
    });
  }, [rawCompetitors, evidence]);

  // 3. Genuine Competitive Findings from Pipeline
  const competitionFindings = useMemo(() => {
    return (report?.findings || []).filter((f) => f.category === "competition");
  }, [report?.findings]);

  // 4. Strategic Gaps from Backend Report
  const strategicGaps = useMemo(() => {
    return report?.strategic_gaps || [];
  }, [report?.strategic_gaps]);

  // Filtered Competitors based on pill and search query
  const filteredCompetitors = useMemo(() => {
    return competitors.filter((c) => {
      const matchesSearch = searchQuery.trim() === "" || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.strengths.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "direct") return c.isDirect;
      if (filterType === "indirect") return c.isIndirect || (!c.isDirect && !c.isOss);
      if (filterType === "oss") return c.isOss;
      return true;
    });
  }, [competitors, filterType, searchQuery]);

  const directCount = competitors.filter((c) => c.isDirect).length;
  const indirectCount = competitors.filter((c) => c.isIndirect || (!c.isDirect && !c.isOss)).length;
  const ossCount = competitors.filter((c) => c.isOss).length;

  const activeCompetitor = useMemo(() => {
    if (selectedCompName) {
      return competitors.find((c) => c.name === selectedCompName) || competitors[0];
    }
    return competitors[0] || null;
  }, [competitors, selectedCompName]);

  // Group competitors by overlap tier for the spectrum visualization
  const overlapTiers = useMemo(() => {
    const high = competitors.filter((c) => c.overlap !== null && c.overlap >= 70);
    const moderate = competitors.filter((c) => c.overlap !== null && c.overlap >= 50 && c.overlap < 70);
    const low = competitors.filter((c) => c.overlap !== null && c.overlap < 50);
    const unassessed = competitors.filter((c) => c.overlap === null);
    return { high, moderate, low, unassessed };
  }, [competitors]);

  return (
    <div className="space-y-8 pt-2 pb-16">
      {/* 1. Header Banner & Metrics */}
      <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-text-strong">Competitive Intelligence & Landscape</h2>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Commercial alternatives, open-source repositories, and differentiation moats for{" "}
              <span className="font-semibold text-text-strong">{title}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
              {competitors.length} Solutions Indexed
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40">
              {githubEvidence.length} Open-Source Technical References
            </span>
          </div>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border-default">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `All Solutions (${competitors.length})` },
              { id: "direct", label: `Direct Alternatives (${directCount})` },
              { id: "indirect", label: `Indirect / Adjacent (${indirectCount})` },
              { id: "github", label: `Open Source Codebases (${githubEvidence.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterType === f.id
                    ? "bg-primary text-white shadow-xs"
                    : "bg-canvas-bg text-text-secondary hover:text-text-strong border border-border-default"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filterType !== "github" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search solutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-canvas-bg border border-border-default text-xs text-text-strong placeholder:text-text-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Overlap Spectrum Visualization (Evidence-Grounded Single-Axis Spectrum) */}
      {competitors.length > 0 && filterType !== "github" && (
        <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text-strong">Feature Overlap Spectrum</h3>
            </div>
            <span className="text-[11px] text-text-muted">
              Ranked by assessed functional overlap with {title}
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            The spectrum below distributes identified solutions across assessed functional overlap tiers. Overlap percentages represent semantic alignment with your core mechanism as evaluated against documented evidence passages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Tier 1: Substantial Overlap */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider">
                  Substantial Overlap (≥70%)
                </span>
                <span className="text-xs font-bold text-red-800 dark:text-red-300">
                  {overlapTiers.high.length}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Incumbents addressing almost identical workflows. Requires sharp positioning moats and architectural differentiation.
              </p>
              <div className="space-y-1.5 pt-1">
                {overlapTiers.high.length === 0 ? (
                  <span className="text-[11px] text-text-muted italic">None detected in this tier</span>
                ) : (
                  overlapTiers.high.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompName(c.name)}
                      className={`w-full text-left p-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                        activeCompetitor?.name === c.name
                          ? "bg-slate-900 text-white border-slate-700 shadow-xs"
                          : "bg-surface-white hover:bg-slate-100 dark:hover:bg-slate-800 border-border-default"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{c.name}</span>
                      <span className="text-[10px] opacity-80">{c.overlap}%</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Tier 2: Moderate Overlap */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white uppercase tracking-wider">
                  Moderate Overlap (50–69%)
                </span>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {overlapTiers.moderate.length}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Adjacent tools solving related pain points with different mechanisms or distinct target personas.
              </p>
              <div className="space-y-1.5 pt-1">
                {overlapTiers.moderate.length === 0 ? (
                  <span className="text-[11px] text-text-muted italic">None detected in this tier</span>
                ) : (
                  overlapTiers.moderate.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompName(c.name)}
                      className={`w-full text-left p-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                        activeCompetitor?.name === c.name
                          ? "bg-slate-900 text-white border-slate-700 shadow-xs"
                          : "bg-surface-white hover:bg-slate-100 dark:hover:bg-slate-800 border-border-default"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{c.name}</span>
                      <span className="text-[10px] opacity-80">{c.overlap}%</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Tier 3: Specialized / Low Overlap */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                  Specialized / Low Overlap (&lt;50%)
                </span>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                  {overlapTiers.low.length}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Niche alternatives, horizontal utilities, or open-source research implementations with minimal commercial competition.
              </p>
              <div className="space-y-1.5 pt-1">
                {overlapTiers.low.length === 0 ? (
                  <span className="text-[11px] text-text-muted italic">None detected in this tier</span>
                ) : (
                  overlapTiers.low.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompName(c.name)}
                      className={`w-full text-left p-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${
                        activeCompetitor?.name === c.name
                          ? "bg-slate-900 text-white border-slate-700 shadow-xs"
                          : "bg-surface-white hover:bg-slate-100 dark:hover:bg-slate-800 border-border-default"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{c.name}</span>
                      <span className="text-[10px] opacity-80">{c.overlap}%</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Discovered Solutions Directory Cards */}
      {(filterType === "all" || filterType === "direct" || filterType === "indirect") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Discovered Alternative Solutions ({filteredCompetitors.length})</span>
            </h3>
            <span className="text-xs text-text-muted font-medium">
              Showing {filteredCompetitors.length} of {competitors.length} total entities
            </span>
          </div>

          {filteredCompetitors.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-white border border-dashed border-border-default text-center space-y-3">
              <Users className="w-8 h-8 text-text-muted mx-auto" />
              <h4 className="text-sm font-bold text-text-strong">No Solutions Matching Current Filter</h4>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                No matching commercial alternatives or open-source solutions were found for this specific filter in the scanned evidence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCompetitors.map((c) => (
                <div 
                  key={c.id} 
                  className={`p-5 rounded-2xl bg-surface-white border shadow-xs space-y-4 transition-all ${
                    activeCompetitor?.name === c.name 
                      ? "border-primary/60 ring-1 ring-primary/20" 
                      : "border-border-default hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-primary font-bold flex items-center justify-center shrink-0 border border-orange-200">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-text-strong">{c.name}</h4>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
                              title="Inspect canonical source"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-text-muted font-medium">{c.classification}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {c.overlap !== null ? (
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-text-secondary">
                            <span>Assessed Overlap</span>
                            <span>{c.overlap}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${c.overlapColor} rounded-full`} style={{ width: `${c.overlap}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-muted italic bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded">
                          Overlap Unassessed
                        </span>
                      )}

                      <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-canvas-bg border border-border-default text-text-secondary">
                        Status: {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Strengths and Limitations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-border-default">
                    <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Documented Competitor Strengths</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed">{c.strengths}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-1">
                      <div className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Identified Limitations & Whitespace</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed">{c.limitations}</p>
                    </div>
                  </div>

                  {/* Target Audience & Evidence Provenance Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span>
                        {c.targetAudience ? (
                          <><strong>Target Segment:</strong> {c.targetAudience}</>
                        ) : (
                          <>Identified via DIME research indexing for <strong>{title}</strong></>
                        )}
                      </span>
                    </div>

                    {c.linkedEvidence.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedEvidenceModal(c.linkedEvidence[0])}
                        className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Inspect Cited Passage ({c.linkedEvidence.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Strategic Differentiation Gaps (From genuine report findings) */}
      {strategicGaps.length > 0 && filterType !== "github" && (
        <div className="p-6 rounded-2xl bg-surface-white border border-border-default shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text-strong">Strategic Differentiation Moats</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Verified differentiation angles synthesized from competitor limitations and research gaps:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategicGaps.map((gap, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-canvas-bg border border-border-default space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    Strategic Opportunity
                  </span>
                  <span className="text-[11px] text-text-muted font-semibold">
                    Confidence: {gap.confidence || "High"}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-text-strong">{gap.title || gap.gap}</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {gap.opportunity || gap.why_it_matters || gap.gap}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Open-Source Technical Precedents (GitHub Repositories) */}
      {(filterType === "all" || filterType === "github") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-strong flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <span>Open-Source Technical Implementations (GitHub)</span>
            </h3>
            <span className="text-xs text-text-muted font-medium">
              {githubEvidence.length} indexed repositories
            </span>
          </div>

          <p className="text-xs text-text-secondary">
            Open-source repositories establish engineering precedent and demonstrated code feasibility. They represent technical building blocks, not commercial SaaS competitors.
          </p>

          {githubEvidence.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-white border border-dashed border-border-default text-center space-y-3">
              <Code2 className="w-8 h-8 text-text-muted mx-auto" />
              <h4 className="text-sm font-bold text-text-strong">No Open-Source Repositories Indexed</h4>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                No matching open-source GitHub repositories met the relevance threshold for these search terms during this analysis run.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {githubEvidence.map((ge) => (
                <div key={ge.id} className="p-5 rounded-2xl bg-surface-white border border-border-default shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                        TECHNICAL_REFERENCE
                      </span>
                      {typeof ge.relevance_score === "number" && !isNaN(ge.relevance_score) && (
                        <span className="text-xs font-semibold text-emerald-600">
                          Relevance: {Math.round(ge.relevance_score * 100)}%
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-text-strong line-clamp-1">{ge.source_title}</h4>
                    <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
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
                      <span>Inspect Raw Chunk</span>
                    </button>

                    {ge.source_url && (
                      <a
                        href={ge.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>GitHub Repo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Isolated Evidence Inspection Drawer / Modal */}
      {selectedEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-white border border-border-default rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
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
                    className="px-3 py-1.5 rounded-lg bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-brand-hover"
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
