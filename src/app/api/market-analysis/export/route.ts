import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "csv";
    const ideaId = url.searchParams.get("ideaId");
    const analysisId = url.searchParams.get("analysisId");

    let rawFastApiUrl = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
    if (rawFastApiUrl.includes("localhost")) {
      rawFastApiUrl = rawFastApiUrl.replace("localhost", "127.0.0.1");
    }
    const fastApiUrl = rawFastApiUrl;

    // Resolve analysis
    let resolvedAnalysisId: string | null = analysisId;
    if (!resolvedAnalysisId && ideaId) {
      const dbAnalyses = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM analyses WHERE idea_id = ${ideaId} ORDER BY created_at DESC LIMIT 1;
      `;
      if (dbAnalyses.length > 0) {
        resolvedAnalysisId = dbAnalyses[0].id;
      }
    }

    if (!resolvedAnalysisId) {
      const recentCompleted = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM analyses WHERE status = 'COMPLETED' ORDER BY created_at DESC LIMIT 1;
      `;
      if (recentCompleted.length > 0) {
        resolvedAnalysisId = recentCompleted[0].id;
      }
    }

    let miData: any = null;
    if (resolvedAnalysisId) {
      try {
        const miRes = await fetch(
          `${fastApiUrl}/api/v1/analyses/${resolvedAnalysisId}/market-intelligence`,
          { cache: "no-store" }
        );
        if (miRes.ok) {
          miData = await miRes.json();
        }
      } catch (err) {
        console.warn("Could not fetch market intelligence for export:", err);
      }
    }

    const ideaTitle = miData?.idea?.title || "Concept";
    const topPapers = miData?.researchLandscape?.topPapers || [];
    const topRepos = miData?.githubEcosystem?.topRepositories || [];
    const painPoints = miData?.painPoints || [];

    if (format === "json") {
      return NextResponse.json({
        idea: miData?.idea || {},
        summary: miData?.summary || {},
        academicPublications: topPapers,
        openSourceRepositories: topRepos,
        verifiedFindings: painPoints.map((pp: any) => ({
          rank: pp.rank,
          title: pp.title,
          evidenceCount: pp.evidenceCount,
          percentage: pp.percentage,
          claim: pp.evidence?.claim,
          supportingText: pp.evidence?.supportingText,
          sourceTitle: pp.evidence?.sourceTitle,
          sourceUrl: pp.evidence?.sourceUrl,
          relevanceScore: pp.evidence?.relevanceScore,
        })),
      });
    }

    // Generate clean CSV of verified findings and research
    const rows: string[][] = [
      ["Record Type", "Identifier / Title", "Metric / Year / Stars", "Authors / Language", "URL / DOI", "Empirical Excerpt / Takeaway"],
    ];

    for (const paper of topPapers) {
      rows.push([
        "Academic Publication",
        paper.title || "Untitled Paper",
        paper.year ? String(paper.year) : "Undated",
        Array.isArray(paper.authors) ? paper.authors.join("; ") : String(paper.authors || ""),
        paper.doi ? `DOI: ${paper.doi}` : (paper.url || ""),
        paper.keyTakeaway || "",
      ]);
    }

    for (const repo of topRepos) {
      rows.push([
        "Open-Source Repository",
        repo.name || "Repository",
        `${repo.stars || 0} stars (${repo.forks || 0} forks)`,
        repo.language || "Code",
        repo.url || "",
        repo.relevance || "",
      ]);
    }

    for (const pp of painPoints) {
      rows.push([
        "Verified Finding",
        pp.title || "Problem Signal",
        `${pp.evidenceCount || 1} supporting sources (${pp.percentage || 0}%)`,
        pp.evidence?.sourceTitle || "Verified Source",
        pp.evidence?.sourceUrl || "",
        pp.evidence?.supportingText || pp.evidence?.claim || "",
      ]);
    }

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dime-market-intelligence-${(ideaTitle || "data").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("EXPORT_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
