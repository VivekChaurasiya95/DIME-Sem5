"use client";

import React, { useState } from "react";
import {
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Quote,
} from "lucide-react";
import type { EvidenceBackedInsightsData } from "@/types/market-analysis";

interface EvidenceBackedInsightsProps {
  data?: EvidenceBackedInsightsData;
  ideaTitle?: string;
}

export function EvidenceBackedInsights({
  data,
}: EvidenceBackedInsightsProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "technical" | "operational">("all");
  const [expandedInsightIds, setExpandedInsightIds] = useState<Set<string>>(new Set());

  if (!data || !data.items || data.items.length === 0) {
    return (
      <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-border-default p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
          <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
            <Target className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-text-strong">Evidence-Backed Insights</h2>
        </div>
        <p className="text-xs text-text-muted py-6 text-center">
          No substantive evidence observations recorded for this concept run.
        </p>
      </section>
    );
  }

  const { items, filterCounts, totalObservations } = data;

  const filteredItems = items.filter((item) => {
    if (activeFilter === "all") return true;
    return item.filterCategory === activeFilter;
  });

  const toggleExpand = (id: string) => {
    setExpandedInsightIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-text-strong">Evidence-Backed Insights</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
              {totalObservations} supported observations
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Research-supported observations relevant to this idea, with source traceability and evidence limitations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === "all"
                ? "bg-primary text-white shadow-xs"
                : "bg-white dark:bg-neutral-800 text-text-secondary hover:text-text-strong border border-border-default hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
            }`}
          >
            All Insights {filterCounts.all}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("technical")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === "technical"
                ? "bg-primary text-white shadow-xs"
                : "bg-white dark:bg-neutral-800 text-text-secondary hover:text-text-strong border border-border-default hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
            }`}
          >
            Technical Limitations {filterCounts.technical}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("operational")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === "operational"
                ? "bg-primary text-white shadow-xs"
                : "bg-white dark:bg-neutral-800 text-text-secondary hover:text-text-strong border border-border-default hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
            }`}
          >
            Operational Friction {filterCounts.operational}
          </button>
        </div>
      </div>

      {/* Stacked Insight Cards */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isExpanded = expandedInsightIds.has(item.id);

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-border-default shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-neutral-700 transition-all"
            >
              {/* Top Row: Rank, Category Badge, Strength Badge, Toggle Action */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-400">
                    #{item.rank}
                  </span>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      item.filterCategory === "technical"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60"
                        : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60"
                    }`}
                  >
                    {item.category}
                  </span>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
                    {item.strengthBadge}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-brand-hover transition-colors shrink-0"
                >
                  <span>{isExpanded ? "Hide Supporting Evidence" : "View Supporting Evidence"}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Bold Title */}
              <h3 className="text-sm font-bold text-text-strong leading-snug">
                {item.title}
              </h3>

              {/* Full Statement */}
              <p className="text-xs text-text-secondary leading-relaxed">
                {item.statement}
              </p>

              {/* Relevance Inset Box */}
              {item.relevanceExplanation && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-text-strong leading-relaxed flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>{item.relevanceExplanation}</div>
                </div>
              )}

              {/* Sources Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-text-secondary">
                <span className="text-[11px] text-text-muted font-medium">Sources:</span>
                {item.sources.map((src) => (
                  <span
                    key={src.id}
                    onClick={() => toggleExpand(item.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] text-text-secondary hover:text-primary hover:border-neutral-300 transition-colors cursor-pointer"
                    title={src.title}
                  >
                    <BookOpen className="w-3 h-3 text-text-muted" />
                    <span className="truncate max-w-[200px]">{src.title}</span>
                  </span>
                ))}
              </div>

              {/* Interactive Evidence Inspector (Expanded Dropdown) */}
              {isExpanded && (
                <div className="pt-4 border-t border-border-subtle space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-text-strong">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Verified Source Excerpts &amp; Citations
                    </span>
                    <span className="text-[11px] text-text-muted font-normal">
                      PostgreSQL Granular Evidence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-text-strong line-clamp-2">
                              {src.title}
                            </span>
                            {src.url && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-brand-hover shrink-0 p-1"
                                title="Open Source URL"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {src.excerpt && (
                            <div className="text-[11px] text-text-secondary italic bg-white dark:bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800 leading-relaxed flex items-start gap-1.5">
                              <Quote className="w-3 h-3 text-neutral-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-4">{src.excerpt}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/50 flex flex-wrap items-center justify-between text-[10px] text-text-muted gap-1">
                          <span className="truncate max-w-[150px]">
                            {src.authorOrVenue || src.sourceType}
                          </span>
                          {src.doi && (
                            <span className="font-mono text-neutral-400">
                              DOI: {src.doi}
                            </span>
                          )}
                          {src.relevanceScore && (
                            <span className="text-emerald-600 font-semibold">
                              Rel: {Math.round(src.relevanceScore * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
