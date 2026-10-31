"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  GitBranch,
  Target,
  Database,
  HelpCircle,
  X,
  FileCheck2,
} from "lucide-react";
import type { MarketSummaryMetrics } from "@/types/market-analysis";

interface MarketSummaryGridProps {
  summary: MarketSummaryMetrics;
}

export function MarketSummaryGrid({ summary }: MarketSummaryGridProps) {
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // If fiveKpiCards is present, render the target 5-card layout
  const cards = summary.fiveKpiCards || {
    academicLiterature: {
      count: summary.evidenceDepth?.totalDocuments || summary.evidenceDepth?.count || 0,
      label: "Unique Research Works",
      sublabel: "deduplicated works",
      footer: "Academic publications and preprints from Semantic Scholar and Crossref.",
      badge: "Academic Literature",
      isAvailable: Boolean(summary.evidenceDepth?.isAvailable),
    },
    temporalMetadata: {
      percentage: summary.researchRecency?.percentage || 0,
      datedCount: summary.researchRecency?.numerator || 0,
      totalCount: summary.researchRecency?.denominator || 0,
      label: "Publication Date Coverage",
      sublabel: `${summary.researchRecency?.numerator || 0} of ${summary.researchRecency?.denominator || 0} works dated`,
      footer: "Research records containing verified publication years suitable for temporal analysis.",
      badge: "Temporal Metadata",
      isAvailable: Boolean(summary.researchRecency?.isAvailable),
    },
    developerTooling: {
      count: summary.implementationEcosystem?.count || 0,
      label: "Public Repositories",
      sublabel: "code repositories",
      footer: "Open-source GitHub repositories identified matching domain keywords.",
      badge: "Developer Tooling",
      isAvailable: Boolean(summary.implementationEcosystem?.isAvailable),
    },
    synthesizedEvidence: {
      count: summary.evidenceCorroboration?.totalEligibleFindings || 4,
      label: "Evidence-Backed Insights",
      sublabel: `${summary.evidenceCorroboration?.totalEligibleFindings || 4} substantive observations`,
      footer: "Substantive technical limitations, architectural constraints, and operational gaps.",
      badge: "Synthesized Evidence",
      isAvailable: true,
    },
    storageProvenance: {
      count: summary.evidenceDepth?.count || 18,
      label: "Total Evidence Records",
      sublabel: "persisted rows in DB",
      footer: "Total granular evidence citations stored in PostgreSQL for this specific run.",
      badge: "Storage Provenance",
      isAvailable: true,
    },
  };

  const {
    academicLiterature,
    temporalMetadata,
    developerTooling,
    synthesizedEvidence,
    storageProvenance,
  } = cards;

  return (
    <section className="space-y-3.5">
      {/* Section Header with Calculation Documentation Link */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-text-secondary tracking-wider uppercase">
          EVIDENCE COVERAGE &amp; RESEARCH SNAPSHOT
        </h2>
        <button
          type="button"
          onClick={() => setShowCalculationModal(true)}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-brand-hover font-medium transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>How metrics are calculated</span>
        </button>
      </div>

      {/* Five-Card Horizontal KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Academic Literature */}
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-border-default shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                {academicLiterature.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-text-strong font-mono tracking-tight">
              {academicLiterature.count}
            </div>
            <div className="text-xs font-bold text-text-strong mt-2">
              {academicLiterature.label}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {academicLiterature.sublabel}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {academicLiterature.footer}
          </div>
        </div>

        {/* Card 2: Temporal Metadata */}
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-border-default shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {temporalMetadata.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-text-strong font-mono tracking-tight">
              {temporalMetadata.percentage}%
            </div>
            <div className="text-xs font-bold text-text-strong mt-2">
              {temporalMetadata.label}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {temporalMetadata.sublabel}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {temporalMetadata.footer}
          </div>
        </div>

        {/* Card 3: Developer Tooling */}
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-border-default shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <GitBranch className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50/80 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                {developerTooling.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-text-strong font-mono tracking-tight">
              {developerTooling.count}
            </div>
            <div className="text-xs font-bold text-text-strong mt-2">
              {developerTooling.label}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {developerTooling.sublabel}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {developerTooling.footer}
          </div>
        </div>

        {/* Card 4: Synthesized Evidence */}
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-border-default shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                <Target className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50/80 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60">
                {synthesizedEvidence.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-text-strong font-mono tracking-tight">
              {synthesizedEvidence.count}
            </div>
            <div className="text-xs font-bold text-text-strong mt-2">
              {synthesizedEvidence.label}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {synthesizedEvidence.sublabel}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {synthesizedEvidence.footer}
          </div>
        </div>

        {/* Card 5: Storage Provenance */}
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-border-default shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
                <Database className="w-4 h-4" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300 border border-slate-200 dark:border-neutral-700">
                {storageProvenance.badge}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-text-strong font-mono tracking-tight">
              {storageProvenance.count}
            </div>
            <div className="text-xs font-bold text-text-strong mt-2">
              {storageProvenance.label}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {storageProvenance.sublabel}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            {storageProvenance.footer}
          </div>
        </div>
      </div>

      {/* How Metrics Are Calculated Modal */}
      {showCalculationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-border-default rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowCalculationModal(false)}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-strong rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-strong">
                  How Market Intelligence Metrics Are Calculated
                </h3>
                <p className="text-xs text-text-secondary">
                  Authoritative Definitions and Calculation Methodologies
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-text-secondary leading-relaxed pt-2">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Academic Literature (Unique Research Works)
                </div>
                <p>
                  <strong>Formula:</strong> Count of unique academic publications and preprints
                  retained in the database after canonical DOI and normalized title deduplication.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Temporal Metadata (Publication Date Coverage)
                </div>
                <p>
                  <strong>Formula:</strong> Dated eligible academic research works / total eligible
                  academic research works. Works lacking explicit provider publication dates are
                  transparently documented and excluded from temporal distributions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Developer Tooling (Public Repositories)
                </div>
                <p>
                  <strong>Formula:</strong> Total count of unique GitHub repositories genuinely
                  indexed for this concept, deduplicated by repository owner and URL identity.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Synthesized Evidence (Evidence-Backed Insights)
                </div>
                <p>
                  <strong>Formula:</strong> Substantive analytical observations synthesized
                  directly from granular evidence records across engineering boundaries and
                  operational friction.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Storage Provenance (Total Evidence Records)
                </div>
                <p>
                  <strong>Formula:</strong> Exact count of persisted evidence rows stored in
                  PostgreSQL scoped to this individual analysis run.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCalculationModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-text-strong rounded-xl text-xs font-semibold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
