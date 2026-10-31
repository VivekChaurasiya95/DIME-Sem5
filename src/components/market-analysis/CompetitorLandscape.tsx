"use client";

import React, { useState } from "react";
import {
  Users,
  ExternalLink,
  Check,
  X,
  Star,
  GitFork,
  Shield,
  Layers,
} from "lucide-react";
import type { CompetitorLandscapeData } from "@/types/market-analysis";

interface CompetitorLandscapeProps {
  data?: CompetitorLandscapeData;
}

export function CompetitorLandscape({ data }: CompetitorLandscapeProps) {
  const [filterType, setFilterType] = useState<string>("all");

  if (!data) return null;

  const {
    directCompetitorsCount,
    indirectCompetitorsCount,
    competitors,
    featureMatrix,
    marketConcentration,
    differentiationAngle,
  } = data;

  const filteredCompetitors =
    filterType === "all"
      ? competitors
      : competitors.filter((c) => c.type === filterType);

  const incumbentNames =
    featureMatrix.length > 0
      ? Object.keys(featureMatrix[0].incumbents)
      : [];

  return (
    <div id="sec-competitors" className="bg-surface-white rounded-xl border border-border-default p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-default gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-title-card text-title-card text-text-strong font-semibold">
              Competitor Landscape & Differentiation Matrix
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary font-medium">
              {marketConcentration} Market
            </span>
          </div>
          <p className="font-caption text-caption text-text-secondary mt-0.5">
            Benchmarking {directCompetitorsCount} direct and {indirectCompetitorsCount} indirect incumbents across features, pricing, and architectural tradeoffs.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          {["all", "direct", "indirect", "research_impl"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors font-medium ${
                filterType === t
                  ? "bg-white text-text-strong shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-strong"
              }`}
            >
              {t === "all" ? "All" : t === "research_impl" ? "Open Source" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Differentiation Angle Banner */}
      <div className="mt-4 p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 text-xs text-orange-900 leading-relaxed flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Core Differentiation Angle: </span>
          <span>{differentiationAngle}</span>
        </div>
      </div>

      {/* Competitor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredCompetitors.map((comp) => (
          <div
            key={comp.id}
            className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-text-strong truncate">
                  {comp.name}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    comp.type === "direct"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : comp.type === "indirect"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {comp.type === "research_impl" ? "OSS" : comp.type}
                </span>
              </div>

              <div className="text-[11px] font-mono text-text-secondary mt-1">
                {comp.pricing}
              </div>

              <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                {comp.description}
              </p>

              {/* Strengths & Weaknesses */}
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="text-emerald-700 font-medium">
                  + {comp.strengths[0]}
                </div>
                <div className="text-red-700 font-medium">
                  - {comp.weaknesses[0]}
                </div>
              </div>
            </div>

            {/* Footer with stats / external link */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-text-secondary">
              <div className="flex items-center gap-3 text-[11px]">
                {comp.stars != null && (
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {comp.stars}
                  </span>
                )}
                {comp.forks != null && (
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3 text-slate-400" />
                    {comp.forks}
                  </span>
                )}
              </div>
              {comp.url && comp.url !== "#" && (
                <a
                  href={comp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                >
                  <span>Inspect</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Comparison Matrix Table */}
      {featureMatrix && featureMatrix.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border-default">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-strong mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Capability Comparison Matrix
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-text-strong font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Feature / Dimension</th>
                  <th className="py-2.5 px-4 text-center bg-primary/10 text-primary font-bold">
                    Our Proposed Solution
                  </th>
                  {incumbentNames.map((name) => (
                    <th key={name} className="py-2.5 px-4 text-center text-text-secondary truncate max-w-[140px]">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {featureMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-text-strong">
                      {row.feature}
                    </td>
                    <td className="py-2.5 px-4 text-center bg-primary/5">
                      {typeof row.ourSolution === "boolean" ? (
                        row.ourSolution ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className="font-semibold text-primary">{row.ourSolution}</span>
                      )}
                    </td>
                    {incumbentNames.map((name) => {
                      const val = row.incumbents[name];
                      return (
                        <td key={name} className="py-2.5 px-4 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-text-secondary">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

