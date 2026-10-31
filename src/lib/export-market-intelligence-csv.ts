import type { MarketIntelligencePayload } from "@/types/market-analysis";

export function exportMarketIntelligenceCsv(data: MarketIntelligencePayload) {
  if (!data) return;

  const title = (data.idea?.title || "market_intelligence").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${title}_evidence_records.csv`;

  // Headers
  const headers = [
    "Section",
    "Rank / ID",
    "Category",
    "Title / Claim",
    "Statement / Excerpt",
    "Relevance Explanation",
    "Source Titles",
    "Source DOIs / URLs",
  ];

  const rows: string[][] = [];

  // 1. Evidence-Backed Insights
  if (data.evidenceBackedInsights?.items) {
    for (const item of data.evidenceBackedInsights.items) {
      const sourceTitles = item.sources.map((s) => s.title).join(" | ");
      const sourceUrls = item.sources.map((s) => s.url || s.doi || "").join(" | ");
      rows.push([
        "Evidence-Backed Insight",
        `#${item.rank}`,
        item.category,
        item.title,
        item.statement,
        item.relevanceExplanation,
        sourceTitles,
        sourceUrls,
      ]);
    }
  }

  // 2. Research Priorities & Unaddressed Questions
  if (data.researchPriorities?.questions) {
    for (const q of data.researchPriorities.questions) {
      rows.push([
        "Research Priority",
        q.id,
        "Evidence Gap",
        q.title,
        q.statement,
        "Requires primary customer discovery and enterprise interviews",
        "",
        "",
      ]);
    }
  }

  // 3. Public Implementation Repositories
  if (data.githubEcosystem?.topRepositories) {
    for (const repo of data.githubEcosystem.topRepositories) {
      rows.push([
        "Public Repository",
        repo.name,
        repo.language || "Code",
        `Stars: ${repo.stars} | Forks: ${repo.forks}`,
        repo.description || repo.relevance,
        repo.activityStatus || "Maintained",
        repo.name,
        repo.url,
      ]);
    }
  }

  // Escape helper for CSV cells
  const escapeCell = (cell: string | number | undefined | null) => {
    if (cell === undefined || cell === null) return '""';
    const s = String(cell).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
