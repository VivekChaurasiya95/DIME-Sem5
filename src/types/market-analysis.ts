export interface MarketSummaryMetrics {
  marketDemand: {
    level: string; // e.g. "Strong"
    badge: string; // e.g. "High Demand"
    trendPercent: string; // e.g. "+34% YoY"
    supportingSignal: string; // e.g. "query velocity across engineering communities"
    isPositiveTrend: boolean;
  };
  evidenceBase: {
    totalSources: number; // e.g. 27
    badge: string; // "Multi-source"
    redditBlindCount: number; // 14
    reviewsCount: number; // 8
    surveysResearchCount: number; // 5
  };
  confidenceScore: {
    scorePercent: number; // 79
    badge: string; // "Deterministic"
    levelText: string; // "High Confidence"
    provenanceClaim: string; // "Evidence-backed provenance"
  };
  freshness: {
    displayDate: string; // "18 Sep 2026"
    badge: string; // "Live"
    relativeCrawlText: string; // "Last crawl completed 12 min ago"
  };
  // 4 Primary Grounded KPIs
  evidenceDepth?: {
    count: number;
    totalDocuments?: number;
    semanticScholarCount: number;
    crossrefCount: number;
    githubCount: number;
    webCount: number;
    definition: string;
    caveat: string;
    coverageCaveat?: string;
    isAvailable: boolean;
    byProvider?: Record<string, number>;
  };
  researchRecency?: {
    percentage: number | null;
    numerator: number;
    denominator: number;
    recentCount?: number;
    totalDatedPapers?: number;
    observationDate: string;
    recencyWindow: string;
    publicationDateCoverage: string;
    coverageText?: string;
    caveat?: string;
    isAvailable: boolean;
    status?: "available" | "unavailable";
  };
  implementationEcosystem?: {
    count: number;
    repositoryCount?: number;
    activeCount: number;
    archivedCount: number;
    totalStars: number;
    averageForks: number;
    topLanguages: string[];
    maintenanceClassification: string;
    metadataCoverage: string;
    contextText?: string;
    isAvailable: boolean;
    status?: "available" | "unavailable";
  };
  evidenceCorroboration?: {
    percentage: number | null;
    corroboratedFindings: number;
    corroboratedCount?: number;
    totalEligibleFindings: number;
    totalFindings?: number;
    definition: string;
    isAvailable: boolean;
    status?: "available" | "unavailable";
  };
}

export interface DemandChartPoint {
  month: string;
  mockToolSearches: number; // 0-100 normalized
  painMentions: number; // 0-100 normalized
}

export interface DemandChartData {
  points: DemandChartPoint[];
  peakPoint: {
    month: string;
    value: number;
    label: string;
  };
  velocityInflectionText: string;
  series1Label?: string;
  series2Label?: string;
  hasSufficientData?: boolean;
}

export interface QualitativePainSignal {
  id: string;
  frequencyBadge: "High frequency" | "Medium frequency" | "Low frequency";
  evidenceCount: number;
  title: string;
  description: string;
  representativeQuote: string;
}

export interface CorroboratingSource {
  sourceName: string;
  similarityText: string;
}

export interface VerifiedEvidenceItem {
  id: string;
  claim: string;
  supportingText: string;
  sourceUrl: string;
  sourceTitle: string;
  evidenceType: string;
  relevanceScore: number;
  confidence: number;
  timestampText: string;
  corroboratingSources: CorroboratingSource[];
  secondaryCitationsNote: string;
}

export interface PainPointRankingItem {
  id: string;
  rank: number;
  title: string;
  evidenceCount: number;
  percentage: number;
  evidence: VerifiedEvidenceItem;
}

export interface SentimentBreakdownData {
  negativePercent: number;
  neutralPercent: number;
  positivePercent: number;
  yoyTrend: string;
  totalSampleSize: number;
  sampleDescription: string;
}

export interface StrategicOpportunity {
  heading: string;
  explanation: string;
}

export interface AnalysisTabsData {
  overviewHref: string;
  competitionCount: number;
  technicalLabel: string;
  researchCount: number;
  risksCount: number;
}

export interface MarketIntelligenceIdea {
  id: string;
  analysisId: string;
  title: string;
  platform: string;
  updatedDate: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW ENHANCED SECTIONS (TAM/SAM/SOM, Competitors, Research, GitHub, Insights, Gaps, Coverage)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketSizeEstimates {
  tam: {
    value: string; // e.g. "$14.8B"
    label: string;
    description: string;
    cagr: string;
  };
  sam: {
    value: string; // e.g. "$3.2B"
    label: string;
    description: string;
  };
  som: {
    value: string; // e.g. "$420M"
    label: string;
    description: string;
  };
  methodology: string;
  confidenceLevel: "High" | "Medium" | "Preliminary";
  growthDrivers: string[];
}

export interface CompetitorItem {
  id: string;
  name: string;
  type: string; // "direct" | "indirect" | "research_impl"
  url?: string;
  description?: string;
  pricing?: string;
  strengths: string[];
  weaknesses: string[];
  features: string[];
  stars?: number | null;
  forks?: number | null;
}

export interface CompetitorLandscapeData {
  directCompetitorsCount: number;
  indirectCompetitorsCount: number;
  competitors: CompetitorItem[];
  featureMatrix: {
    feature: string;
    ourSolution: boolean | string;
    incumbents: Record<string, boolean | string>;
  }[];
  marketConcentration: "High" | "Moderate" | "Fragmented";
  differentiationAngle: string;
}

export interface ResearchPublicationYear {
  year: number;
  count: number;
  label?: string;
}

export interface TopAcademicPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  citationCount?: number;
  doi?: string;
  url?: string;
  keyTakeaway: string;
}

export interface ResearchLandscapeData {
  totalPapersAnalyzed: number;
  datedWorksCount?: number;
  undatedCount?: number;
  academicVelocity: string;
  publicationsByYear: ResearchPublicationYear[];
  topPapers: TopAcademicPaper[];
  emergingTopics: string[];
  interpretation?: {
    heading: string;
    text: string;
    methodologicalNote: string;
  };
  topVenues?: AcademicVenueChip[];
  totalVenuesCount?: number;
  peakYear?: number;
  peakCount?: number;
  peakShare?: number;
  minYear?: number;
  maxYear?: number;
}

export interface GithubRepoItem {
  name: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  activityStatus: "Active" | "Maintained" | "Stale" | "Archived" | string;
  relevance: string;
  description?: string;
}

export interface GithubLanguageShare {
  language: string;
  percentage: number;
  repoCount: number;
  color: string;
}

export interface GithubEcosystemData {
  totalReposFound: number;
  totalStars: number;
  averageForks: number;
  topRepositories: GithubRepoItem[];
  languageDistribution: GithubLanguageShare[];
  ecosystemMaturity: "Nascent" | "Growing" | "Mature" | string;
  openSourceGap: string;
  warning?: string;
  primaryLanguages?: { name: string; count: number }[];
}

export interface EvidenceInsightCard {
  id: string;
  category: "market" | "feasibility" | "risk" | "competition" | "novelty" | string;
  title: string;
  summary: string;
  confidenceScore: number;
  evidenceCount: number;
  implication: string;
}

export interface EvidenceInsightsData {
  insights: EvidenceInsightCard[];
  keyTakeaway: string;
}

export interface ResearchGapItem {
  id: string;
  priority: "High" | "Medium" | "Low";
  area: string;
  question: string;
  currentStatus: string;
  recommendedNextStep: string;
}

export interface ResearchGapsData {
  totalGaps: number;
  highPriorityCount: number;
  gaps: ResearchGapItem[];
}

export interface SourceProviderStatus {
  providerName: string;
  status: "COMPLETED" | "RUNNING" | "PARTIAL" | "FAILED" | "PENDING" | string;
  recordsFound: number;
  recordsIndexed: number;
  coveragePercentage: number;
  latencyText?: string;
}

export interface SourceCoverageData {
  totalProviders: number;
  activeProviders: number;
  totalRecordsFound: number;
  totalRecordsIndexed: number;
  providersIndexedText?: string;
  summaryText?: string;
  providers: SourceProviderStatus[];
  methodology?: {
    scope: string;
    eligibilityRules: string;
    deduplicationMethod: string;
    dateWindow: string;
    limitations: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONSTRUCTED MARKET INTELLIGENCE TARGET SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface ScopeBannerData {
  scopeText: string;
  analyzedDateText: string;
  persistenceText: string;
  runIdText: string;
  analysisId?: string;
}

export interface KpiCardAcademicLiterature {
  count: number;
  label: string;
  sublabel: string;
  footer: string;
  badge: string;
  isAvailable: boolean;
}

export interface KpiCardTemporalMetadata {
  percentage: number;
  datedCount: number;
  totalCount: number;
  label: string;
  sublabel: string;
  footer: string;
  badge: string;
  isAvailable: boolean;
}

export interface KpiCardDeveloperTooling {
  count: number;
  label: string;
  sublabel: string;
  footer: string;
  badge: string;
  isAvailable: boolean;
}

export interface KpiCardSynthesizedEvidence {
  count: number;
  label: string;
  sublabel: string;
  footer: string;
  badge: string;
  isAvailable: boolean;
}

export interface KpiCardStorageProvenance {
  count: number;
  label: string;
  sublabel: string;
  footer: string;
  badge: string;
  isAvailable: boolean;
}

export interface FiveKpiCards {
  academicLiterature: KpiCardAcademicLiterature;
  temporalMetadata: KpiCardTemporalMetadata;
  developerTooling: KpiCardDeveloperTooling;
  synthesizedEvidence: KpiCardSynthesizedEvidence;
  storageProvenance: KpiCardStorageProvenance;
}

export interface AcademicVenueChip {
  name: string;
  count: number;
}

export interface SupportingSourceChip {
  id: string;
  title: string;
  doi?: string;
  url?: string;
  sourceType?: string;
  authorOrVenue?: string;
  excerpt?: string;
  relevanceScore?: number;
  confidence?: number;
  claim?: string;
}

export interface EvidenceBackedInsightItem {
  id: string;
  rank: number;
  category: string;
  filterCategory: "technical" | "operational" | "all" | string;
  strengthBadge: string;
  title: string;
  statement: string;
  relevanceExplanation: string;
  sources: SupportingSourceChip[];
}

export interface EvidenceBackedInsightsData {
  totalObservations: number;
  filterCounts: {
    all: number;
    technical: number;
    operational: number;
  };
  items: EvidenceBackedInsightItem[];
}

export interface ResearchPriorityItem {
  id: string;
  title: string;
  statement: string;
  badge: string;
}

export interface ResearchPrioritiesData {
  totalQuestions: number;
  calloutText: string;
  questions: ResearchPriorityItem[];
}

export interface MarketIntelligencePayload {
  idea: MarketIntelligenceIdea;
  summary: MarketSummaryMetrics;
  tabs: AnalysisTabsData;
  demandChart: DemandChartData;
  qualitativeSignals: QualitativePainSignal[];
  painPoints: PainPointRankingItem[];
  sentiment: SentimentBreakdownData;
  strategicOpportunity: StrategicOpportunity;
  // Reconstructed Sections
  scopeBanner?: ScopeBannerData;
  fiveKpiCards?: FiveKpiCards;
  evidenceBackedInsights?: EvidenceBackedInsightsData;
  researchPriorities?: ResearchPrioritiesData;
  // Complementary Sections
  marketSize?: MarketSizeEstimates;
  competitorLandscape?: CompetitorLandscapeData;
  researchLandscape?: ResearchLandscapeData;
  githubEcosystem?: GithubEcosystemData;
  evidenceInsights?: EvidenceInsightsData;
  researchGaps?: ResearchGapsData;
  sourceCoverage?: SourceCoverageData;
}

