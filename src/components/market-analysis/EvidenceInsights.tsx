"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  TrendingUp,
  Cpu,
  ShieldAlert,
  Users,
  Lightbulb,
} from "lucide-react";
import type { EvidenceInsightsData } from "@/types/market-analysis";

interface EvidenceInsightsProps {
  data?: EvidenceInsightsData;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  market: { label: "Market Demand", icon: TrendingUp, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  feasibility: { label: "Feasibility", icon: Cpu, color: "text-blue-700 bg-blue-50 border-blue-200" },
  risk: { label: "Risk Factors", icon: ShieldAlert, color: "text-red-700 bg-red-50 border-red-200" },
  competition: { label: "Competition", icon: Users, color: "text-purple-700 bg-purple-50 border-purple-200" },
  novelty: { label: "Novelty", icon: Lightbulb, color: "text-amber-700 bg-amber-50 border-amber-200" },
};

export function EvidenceInsights({ data }: EvidenceInsightsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!data) return null;

  const { insights, keyTakeaway } = data;

  const filteredInsights =
    selectedCategory === "all"
      ? insights
      : insights.filter((i) => i.category.toLowerCase() === selectedCategory);

  return (
    <div id="sec-insights" className="bg-surface-white rounded-xl border border-border-default p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-default gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-title-card text-title-card text-text-strong font-semibold">
              Categorized Evidence Insights & Takeaways
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary font-medium">
              {insights.length} Focus Areas
            </span>
          </div>
          <p className="font-caption text-caption text-text-secondary mt-0.5">
            Key analytical findings grouped across feasibility, market pain, compliance risk, and competitive novelty.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-white text-text-strong shadow-xs font-semibold"
                : "text-text-secondary hover:text-text-strong"
            }`}
          >
            All
          </button>
          {Object.keys(CATEGORY_CONFIG).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded-md capitalize font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-white text-text-strong shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-strong"
              }`}
            >
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis Takeaway Banner */}
      <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-text-strong leading-relaxed flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-text-strong">Consensus Takeaway: </span>
          <span className="text-text-secondary">{keyTakeaway}</span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredInsights.map((item) => {
          const cfg =
            CATEGORY_CONFIG[item.category.toLowerCase()] ||
            CATEGORY_CONFIG.market;
          const Icon = cfg.icon;

          return (
            <div
              key={item.id}
              className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${cfg.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cfg.label}</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-text-secondary">
                    {item.confidenceScore}% Conf.
                  </span>
                </div>

                <h3 className="font-bold text-xs text-text-strong mt-2.5">
                  {item.title}
                </h3>

                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {/* Strategic Implication */}
              <div className="pt-2 border-t border-slate-200/60 text-[11px]">
                <span className="font-semibold text-text-strong">
                  Roadmap Implication:{" "}
                </span>
                <span className="text-text-secondary">{item.implication}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

