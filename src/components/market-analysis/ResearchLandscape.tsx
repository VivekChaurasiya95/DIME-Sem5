"use client";

import React from "react";
import { BarChart3, Info, BookOpen } from "lucide-react";
import type { ResearchLandscapeData } from "@/types/market-analysis";

interface ResearchLandscapeProps {
  data?: ResearchLandscapeData;
}

export function ResearchLandscape({ data }: ResearchLandscapeProps) {
  if (!data) return null;

  const {
    totalPapersAnalyzed,
    datedWorksCount = 0,
    undatedCount = 0,
    publicationsByYear = [],
    interpretation,
    topVenues = [],
    totalVenuesCount = 0,
  } = data;

  // Compute maximum count for scaling bar heights
  const maxCount = publicationsByYear.length > 0
    ? Math.max(...publicationsByYear.map((p) => p.count), 1)
    : 1;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-border-default p-6 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="space-y-1.5 pb-4 border-b border-border-subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-text-strong">
              Research Landscape: Publications by Year
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
              {datedWorksCount} of {totalPapersAnalyzed} works dated
            </span>
            {undatedCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {undatedCount} undated excluded
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-text-secondary">
          Unique eligible research works plotted by verified publication year from academic providers.
        </p>
      </div>

      {/* Bar Chart Visualization */}
      <div className="py-6">
        {publicationsByYear.length > 0 ? (
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-3 sm:gap-6 h-48 px-2 sm:px-6 border-b border-neutral-200 dark:border-neutral-800">
              {publicationsByYear.map((item) => {
                const heightPercent = Math.max(12, Math.round((item.count / maxCount) * 100));
                return (
                  <div
                    key={item.year}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Count above bar */}
                    <span className="text-xs font-mono font-bold text-text-strong mb-1.5 group-hover:text-primary transition-colors">
                      {item.count}
                    </span>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[44px] bg-[#F97316] hover:bg-[#EA580C] rounded-t-md transition-all duration-300 shadow-2xs"
                    />

                    {/* Year label below */}
                    <span className="text-[11px] font-mono text-text-secondary mt-2.5 whitespace-nowrap">
                      {item.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-text-muted border border-dashed border-border-default rounded-xl">
            No verified publication dates available for temporal plotting.
          </div>
        )}
      </div>

      {/* Inset Analytical Interpretation & Scope Boundary */}
      {interpretation && (
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 space-y-2 mb-6">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-strong">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{interpretation.heading}</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {interpretation.text}
          </p>
          <p className="text-[11px] text-text-muted italic leading-relaxed pt-1 border-t border-neutral-200/60 dark:border-neutral-700/50">
            {interpretation.methodologicalNote}
          </p>
        </div>
      )}

      {/* Top Academic Venues in Corpus */}
      <div className="pt-4 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-text-strong text-[11px]">
            TOP ACADEMIC VENUES IN CORPUS
          </span>
          <span className="text-[11px] text-text-muted font-medium">
            {totalVenuesCount} identified venues
          </span>
        </div>

        {topVenues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topVenues.map((venue, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs hover:border-neutral-300 transition-colors"
                title={venue.name}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <BookOpen className="w-3 h-3 text-text-muted shrink-0" />
                  <span className="truncate text-text-secondary text-[11px]">
                    {venue.name}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-text-strong shrink-0">
                  {venue.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted italic py-1">
            No specific publication venues indexed in corpus metadata.
          </div>
        )}
      </div>
    </div>
  );
}
