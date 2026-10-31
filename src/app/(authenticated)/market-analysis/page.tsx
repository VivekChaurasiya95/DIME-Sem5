"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { MarketIntelligencePayload } from "@/types/market-analysis";
import { MarketHeader } from "@/components/market-analysis/MarketHeader";
import { AnalysisTabs } from "@/components/market-analysis/AnalysisTabs";
import { AnalyticalScopeBanner } from "@/components/market-analysis/AnalyticalScopeBanner";
import { MarketSummaryGrid } from "@/components/market-analysis/MarketSummaryGrid";
import { ResearchLandscape } from "@/components/market-analysis/ResearchLandscape";
import { PublicImplementationEcosystem } from "@/components/market-analysis/PublicImplementationEcosystem";
import { EvidenceBackedInsights } from "@/components/market-analysis/EvidenceBackedInsights";
import { ResearchPriorities } from "@/components/market-analysis/ResearchPriorities";
import { DataCoverageProvenance } from "@/components/market-analysis/DataCoverageProvenance";
import { exportMarketIntelligenceCsv } from "@/lib/export-market-intelligence-csv";
import { AlertCircle } from "lucide-react";

function MarketAnalysisContent() {
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("ideaId") || "";
  const analysisId = searchParams.get("analysisId") || "";

  const [data, setData] = useState<MarketIntelligencePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchMarketData = useCallback(async (isRefresh = false) => {
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
  }, [ideaId, analysisId]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const handleExport = () => {
    if (data) {
      exportMarketIntelligenceCsv(data);
    }
  };

  const handleRefresh = () => {
    fetchMarketData(true);
  };

  if (loading) {
    return <MarketAnalysisLoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-[1600px] w-full">
        <div className="p-8 bg-surface-white rounded-xl border border-border-default text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-danger-red mx-auto" />
          <h2 className="text-xl font-bold text-text-strong">
            Unable to load Market Intelligence
          </h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            {error || "Market analysis data is currently unavailable for this concept."}
          </p>
          <button
            onClick={() => fetchMarketData()}
            className="px-4 py-2 bg-primary text-white rounded-lg font-body-semibold text-sm hover:bg-brand-hover transition-colors"
          >
            Retry Analysis Fetch
          </button>
        </div>
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
    <div className="p-8 max-w-[1600px] w-full space-y-6">
      {/* 1. BREADCRUMB & PAGE HEADER */}
      <MarketHeader
        idea={data.idea}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
      />

      {/* 2. ANALYSIS NAVIGATION TABS */}
      <AnalysisTabs tabs={data.tabs} ideaId={data.idea.id} />

      {/* 3. ANALYTICAL SCOPE BANNER */}
      <AnalyticalScopeBanner
        data={scopeBannerData}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onExportCsv={handleExport}
      />

      {/* 4. EVIDENCE COVERAGE & RESEARCH SNAPSHOT (5 KPI CARDS) */}
      <MarketSummaryGrid summary={data.summary} />

      {/* 5. RESEARCH LANDSCAPE & PUBLIC IMPLEMENTATION ECOSYSTEM (SIDE BY SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 h-full">
          <ResearchLandscape data={data.researchLandscape} />
        </div>
        <div className="lg:col-span-4 h-full">
          <PublicImplementationEcosystem data={data.githubEcosystem} />
        </div>
      </div>

      {/* 6. EVIDENCE-BACKED INSIGHTS (FULL WIDTH) */}
      <EvidenceBackedInsights
        data={data.evidenceBackedInsights}
        ideaTitle={data.idea?.title}
      />

      {/* 7. RESEARCH PRIORITIES & UNADDRESSED QUESTIONS (FULL WIDTH) */}
      {data.researchPriorities && (
        <ResearchPriorities data={data.researchPriorities} />
      )}

      {/* 8. DATA COVERAGE & SOURCE PROVENANCE (COLLAPSIBLE FULL WIDTH) */}
      <DataCoverageProvenance data={data.sourceCoverage} />
    </div>
  );
}

function MarketAnalysisLoadingSkeleton() {
  return (
    <div className="p-8 max-w-[1600px] w-full animate-pulse space-y-6">
      <div className="h-6 w-64 bg-slate-200 rounded" />
      <div className="h-10 w-96 bg-slate-200 rounded" />
      <div className="h-10 w-full bg-slate-100 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-96 bg-slate-100 rounded-xl" />
        <div className="lg:col-span-4 h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function MarketAnalysisPage() {
  return (
    <React.Suspense fallback={<MarketAnalysisLoadingSkeleton />}>
      <MarketAnalysisContent />
    </React.Suspense>
  );
}
