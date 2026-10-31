"use client";

import React, { useState } from "react";
import {
  Database,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
} from "lucide-react";
import type { SourceCoverageData } from "@/types/market-analysis";

interface DataCoverageProvenanceProps {
  data?: SourceCoverageData;
}

export function DataCoverageProvenance({ data }: DataCoverageProvenanceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;

  const {
    totalProviders = 3,
    activeProviders = 2,
    totalRecordsFound = 18,
    totalRecordsIndexed = 18,
    providers = [],
    providersIndexedText,
    summaryText,
    methodology,
  } = data;

  const badgeText = providersIndexedText || `${activeProviders} of ${totalProviders} providers indexed`;
  const subText =
    summaryText ||
    `This analysis consulted ${totalRecordsFound} eligible source records across academic and open-source providers. • ${totalRecordsIndexed} total indexed records`;

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-border-default p-6 shadow-xs space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-text-strong">
              Data Coverage &amp; Source Provenance
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
              {badgeText}
            </span>
          </div>
          <p className="text-xs text-text-secondary">{subText}</p>
        </div>

        {/* Toggle Action */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-brand-hover transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>
            {isExpanded ? "Hide Methodology & Source Coverage" : "View Methodology & Source Coverage"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Collapsible Expanded Body */}
      {isExpanded && (
        <div className="pt-4 border-t border-border-subtle space-y-6 animate-in fade-in duration-200">
          {/* Provider Telemetry Table */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-strong">
              DATA PROVIDER INGESTION TELEMETRY
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border-default">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-text-strong font-semibold border-b border-border-default">
                  <tr>
                    <th className="py-2.5 px-4">Provider / Data Source</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Records Found</th>
                    <th className="py-2.5 px-4 text-center">Records Indexed</th>
                    <th className="py-2.5 px-4">Coverage</th>
                    <th className="py-2.5 px-4 text-right">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {providers.map((p, idx) => {
                    const isCompleted = p.status.toUpperCase() === "COMPLETED";
                    const isSkipped = p.status.toUpperCase() === "SKIPPED";
                    const isNotConfigured = p.status.toUpperCase() === "NOT_CONFIGURED";

                    let statusClass = "bg-neutral-100 text-text-secondary border-neutral-200";
                    if (isCompleted) {
                      statusClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                    } else if (isSkipped) {
                      statusClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                    } else if (isNotConfigured) {
                      statusClass = "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 border-slate-200 dark:border-neutral-700";
                    }

                    return (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                        <td className="py-3 px-4 font-medium text-text-strong flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{p.providerName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusClass}`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : isSkipped ? (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-neutral-400" />
                            )}
                            <span>{p.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-text-secondary">
                          {p.recordsFound}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-text-strong">
                          {p.recordsIndexed}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.coveragePercentage >= 80 ? "bg-emerald-500" : "bg-primary"
                                }`}
                                style={{ width: `${p.coveragePercentage}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-text-secondary">
                              {p.coveragePercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-text-muted">
                          {p.latencyText || "Direct API"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology Details Disclosure */}
          <div className="space-y-3 pt-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-strong">
              METHODOLOGY &amp; ELIGIBILITY CRITERIA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-secondary leading-relaxed">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Canonical Deduplication Algorithm
                </div>
                <p>
                  {methodology?.deduplicationMethod ||
                    "Multi-version preprints and republications are normalized via canonical DOI lookup and normalized title string equivalence. Each work is counted once."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Publication Eligibility &amp; Scope
                </div>
                <p>
                  {methodology?.eligibilityRules ||
                    "Only verified academic works from Semantic Scholar and Crossref, and public repositories matching concept keywords are eligible for inclusion."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Temporal Boundaries &amp; Window
                </div>
                <p>
                  {methodology?.dateWindow ||
                    "Temporal publication plotting includes all verified provider publication years. Works without explicit date metadata are excluded from histograms to prevent distortion."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                <div className="font-semibold text-text-strong flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Analytical Limitations
                </div>
                <p>
                  {methodology?.limitations ||
                    "Academic publication volume and GitHub stars reflect research momentum and developer tooling; they do not represent commercial market demand or consumer willingness to pay."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
