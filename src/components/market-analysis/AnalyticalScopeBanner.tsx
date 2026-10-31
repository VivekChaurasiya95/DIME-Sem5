"use client";

import React, { useState } from "react";
import {
  Database,
  Compass,
  RefreshCw,
  Download,
  X,
  FileText,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import type { ScopeBannerData } from "@/types/market-analysis";

interface AnalyticalScopeBannerProps {
  data: ScopeBannerData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExportCsv?: () => void;
}

export function AnalyticalScopeBanner({
  data,
  onRefresh,
  isRefreshing = false,
  onExportCsv,
}: AnalyticalScopeBannerProps) {
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  return (
    <>
      <div className="w-full rounded-2xl bg-[#f8f9fa] dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 p-4 md:px-5 md:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all">
        {/* Left: Analytical Context & Provenance */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-strong leading-normal">
            <span className="font-semibold text-text-strong">Analytical Scope:</span>
            <span className="text-text-secondary">{data.scopeText}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-amber-600/80 shrink-0" />
              <span>{data.analyzedDateText}</span>
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span>{data.persistenceText}</span>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <span className="font-mono bg-neutral-200/70 dark:bg-neutral-800 text-text-secondary px-1.5 py-0.5 rounded text-[10px]">
              {data.runIdText}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {/* Scope & Methodology */}
          <button
            type="button"
            onClick={() => setShowMethodologyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-white dark:bg-neutral-800 text-xs font-medium text-text-strong hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>Scope &amp; Methodology</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-white dark:bg-neutral-800 text-xs font-medium text-text-strong hover:bg-neutral-50 dark:hover:bg-neutral-700/60 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-text-secondary ${
                isRefreshing ? "animate-spin text-primary" : ""
              }`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scope & Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 border border-border-default rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowMethodologyModal(false)}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-text-strong rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-primary">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-strong">
                  Analytical Scope &amp; Provenance Methodology
                </h3>
                <p className="text-xs text-text-secondary">
                  DIME Evidence Ingestion, Deduplication, and Validation Standards
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed pt-2">
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Corpus Boundaries &amp; Provider Ingestion
                </div>
                <p>
                  Market intelligence for this analysis was ingested from academic literature
                  indexes (Semantic Scholar, Crossref) and public repository registries
                  (GitHub). Every displayed finding and metric is strictly bounded by the
                  canonical records associated with Run ID{" "}
                  <code className="font-mono text-[11px] bg-neutral-200/70 dark:bg-neutral-700 px-1 py-0.5 rounded">
                    {data.runIdText}
                  </code>
                  .
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Canonical Deduplication &amp; Work Identity
                </div>
                <p>
                  Academic papers and preprints are deduplicated via canonical DOI matching and
                  normalized title string comparison. Multiple preprint versions or republishing
                  instances are merged into single canonical works to prevent artificial count inflation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                  Evidence Grounding vs. Market Sizing Distinction
                </div>
                <p>
                  Academic publication volume and GitHub repository activity reflect scientific cadence
                  and open-source developer exploration. They do not constitute verified commercial
                  customer adoption, market share, or corporate willingness to pay.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-text-strong rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
