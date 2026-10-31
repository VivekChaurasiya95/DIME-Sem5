"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { MarketIntelligencePayload } from "@/types/market-analysis";
import { AnalyticalScopeBanner } from "@/components/market-analysis/AnalyticalScopeBanner";
import { MarketSummaryGrid } from "@/components/market-analysis/MarketSummaryGrid";
import { ResearchLandscape } from "@/components/market-analysis/ResearchLandscape";
import { PublicImplementationEcosystem } from "@/components/market-analysis/PublicImplementationEcosystem";
import { EvidenceBackedInsights } from "@/components/market-analysis/EvidenceBackedInsights";
import { ResearchPriorities } from "@/components/market-analysis/ResearchPriorities";
import { DataCoverageProvenance } from "@/components/market-analysis/DataCoverageProvenance";
import { exportMarketIntelligenceCsv } from "@/lib/export-market-intelligence-csv";
import { Loader2, AlertCircle } from "lucide-react";

interface IdeaContextualMarketProps {
  ideaId: string;
  analysisId: string;
}

export function IdeaContextualMarket({ ideaId, analysisId }: IdeaContextualMarketProps) {
  const [data, setData] = useState<MarketIntelligencePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const query = new URLSearchParams();
        if (ideaId) query.set("ideaId", ideaId);
        if (analysisId) query.set("analysisId", analysisId);

        const res = await fetch(`/api/market-analysis/intelligence?${query.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load market intelligence data: ${res.statusText}`);
        }
        const json: MarketIntelligencePayload = await res.json();
        setData(json);
      } catch (err: unknown) {
        console.error("Error fetching market intelligence:", err);
        setError(err instanceof Error ? err.message : "Failed to load market intelligence data");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [ideaId, analysisId]
  );

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const handleRefresh = () => {
    fetchMarketData(true);
  };

  const handleExportCsv = () => {
    if (data) {
      exportMarketIntelligenceCsv(data);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-text-secondary gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs font-medium tracking-wide">
          Loading evidence-backed market intelligence...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-border-default text-center space-y-3 my-6 shadow-xs">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-text-strong">
          Unable to load Market Intelligence
        </h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          {error || "Market signals are currently unavailable for this specific concept."}
        </p>
        <button
          type="button"
          onClick={() => fetchMarketData()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-hover transition-colors shadow-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  const scopeBannerData = data.scopeBanner || {
    scopeText: "Research concentration, open-source codebases, and documented technical limitations.",
    analyzedDateText: `Analyzed on ${data.idea?.updatedDate || "Oct 28, 2026"}`,
    persistenceText: "Evidence persisted in PostgreSQL",
    runIdText: `Run ID: ${(data.idea?.analysisId || analysisId || "").slice(0, 8)}`,
    analysisId: data.idea?.analysisId || analysisId,
  };

  return (
    <div className="space-y-6 pt-2 pb-16">
      {/* 1. ANALYTICAL SCOPE BANNER */}
      <AnalyticalScopeBanner
        data={scopeBannerData}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onExportCsv={handleExportCsv}
      />

      {/* 2. EVIDENCE COVERAGE & RESEARCH SNAPSHOT (5 KPI CARDS) */}
      <MarketSummaryGrid summary={data.summary} />

      {/* 3. RESEARCH LANDSCAPE & PUBLIC IMPLEMENTATION ECOSYSTEM (SIDE BY SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 cols): Publications by Year Bar Chart & Corpus Interpretation */}
        <div className="lg:col-span-8 h-full">
          <ResearchLandscape data={data.researchLandscape} />
        </div>

        {/* Right Column (4 cols): Public Code Repositories & Implementation Ecosystem */}
        <div className="lg:col-span-4 h-full">
          <PublicImplementationEcosystem data={data.githubEcosystem} />
        </div>
      </div>

      {/* 4. EVIDENCE-BACKED INSIGHTS (FULL WIDTH) */}
      <EvidenceBackedInsights
        data={data.evidenceBackedInsights}
        ideaTitle={data.idea?.title}
      />

      {/* 5. RESEARCH PRIORITIES & UNADDRESSED QUESTIONS (FULL WIDTH) */}
      {data.researchPriorities && (
        <ResearchPriorities data={data.researchPriorities} />
      )}

      {/* 6. DATA COVERAGE & SOURCE PROVENANCE (COLLAPSIBLE FULL WIDTH) */}
      <DataCoverageProvenance data={data.sourceCoverage} />
    </div>
  );
}
