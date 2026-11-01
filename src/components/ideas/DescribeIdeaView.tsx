"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Play, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Lightbulb, 
  Loader2, 
  AlertCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IdeaImprovementModal } from "./IdeaImprovementModal";
import { SharedIdeaReviewModal, ExtractedIdeaData } from "./SharedIdeaReviewModal";

export interface DescribeDraftState {
  rawDescription: string;
  targetAudience: string;
  industry: string;
  geographicMarket: string;
  businessModel: string;
  knownCompetitors: string;
  assumptions: string;
  budget?: string;
  teamSize?: string;
  timeline?: string;
  preferredTechnologies?: string;
}

interface DescribeIdeaViewProps {
  draft: DescribeDraftState;
  onUpdateDraft: (updates: Partial<DescribeDraftState>) => void;
  onSaveDraftToDb: (data: {
    title: string;
    description: string;
    targetAudience: string;
    industry: string;
    formFactors?: string[];
    budget?: string;
    teamSize?: string;
    timeline?: string;
    preferredTechnologies?: string[] | string;
    analysisDepth?: string;
  }) => Promise<void>;
  isSavingDraft: boolean;
}

const EXAMPLE_CATEGORIES = [
  {
    category: "AI / SaaS",
    title: "AI Support Triage & Sentiment Routing",
    text: "I want to build an AI-powered customer support triage copilot for high-growth B2B SaaS companies. It connects directly to Zendesk and Intercom, analyzes incoming customer tickets in real time, classifies urgency and churn sentiment, and automatically drafts high-quality resolution responses with API action links. The business model will be a monthly SaaS subscription based on ticket volume ($199/mo to $999/mo). Target users are VP of Customer Success and tier-1 support engineers.",
  },
  {
    category: "Education",
    title: "Adaptive STEM Physics Lab Simulator",
    text: "An interactive, gamified physics laboratory simulation for high school and early college students. Instead of passive video lectures, students run live virtual experiments with realistic particle physics and receive AI-driven guided problem solving whenever their calculations fail. We target STEM teachers and tutoring academies. Revenue comes from annual institutional licensing ($12 per student/year) and a direct-to-consumer freemium model for independent study.",
  },
  {
    category: "Healthcare",
    title: "Ambient Clinical Scribe for Dental Practices",
    text: "A HIPAA-compliant voice AI assistant specifically designed for solo and small group dental clinics. The assistant listens during examinations, transcribes periodontal charting and tooth condition notations directly into existing dental practice management software (Eaglesoft and Dentrix), and automatically generates patient follow-up treatment plans. Target audience is dentists and dental hygienists. We will charge $149/mo per chair.",
  },
  {
    category: "E-commerce",
    title: "Zero-Waste Apparel Returns Aggregator",
    text: "A local logistics and returns aggregation network for independent direct-to-consumer boutique fashion brands. Rather than shipping returned clothing back to distant fulfillment centers, local customers drop returns at verified neighborhood pickup hubs where items are inspected, steamed, and immediately relisted on a hyper-local flash discount marketplace. Primary target users are eco-conscious Gen-Z shoppers and boutique apparel retailers.",
  },
  {
    category: "Developer Tools",
    title: "GraphQL Schema Breaking Change Detector",
    text: "A developer tool and CI/CD bot that monitors GraphQL schema changes across federated microservices. It automatically simulates client queries from production traffic logs to detect breaking field changes and latency regressions before PRs merge. Target users are platform engineers and backend developers at mid-to-large tech companies. Planned pricing is freemium for open-source repositories and $49 per developer/month for private enterprise clusters.",
  },
];

export function DescribeIdeaView({
  draft,
  onUpdateDraft,
  onSaveDraftToDb,
  isSavingDraft,
}: DescribeIdeaViewProps) {
  const router = useRouter();

  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("AI / SaaS");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Improvement State
  const [isImproving, setIsImproving] = useState(false);
  const [improvementModalOpen, setImprovementModalOpen] = useState(false);
  const [improvementData, setImprovementData] = useState<{
    originalText: string;
    improvedText: string;
    keyEnhancements: string[];
  }>({ originalText: "", improvedText: "", keyEnhancements: [] });

  // Extraction & Validation State
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedIdeaData | null>(null);

  const maxChars = 5000;
  const charCount = draft.rawDescription.length;
  const wordCount = draft.rawDescription.trim().split(/\s+/).filter(Boolean).length;
  const isValid = draft.rawDescription.trim().length >= 25;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateDraft({ rawDescription: e.target.value });
    if (errorMessage) setErrorMessage(null);
  };

  const handleApplyExample = (exampleText: string, catName: string) => {
    setSelectedCategory(catName);
    onUpdateDraft({ rawDescription: exampleText });
    if (errorMessage) setErrorMessage(null);
  };

  // 1. AI-Assisted Idea Improvement
  const handleImproveIdea = async () => {
    if (!draft.rawDescription || draft.rawDescription.trim().length < 15) {
      setErrorMessage("Please type at least 15 characters of your idea before requesting an improvement.");
      return;
    }

    setIsImproving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ideas/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_description: draft.rawDescription }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Improvement service failed.");
      }

      const result = await res.json();
      setImprovementData({
        originalText: draft.rawDescription,
        improvedText: result.improved_text,
        keyEnhancements: result.key_enhancements || [],
      });
      setImprovementModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Could not improve idea right now. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  // 2. Extract idea structure
  const runExtraction = async (): Promise<ExtractedIdeaData | null> => {
    if (!isValid) {
      setErrorMessage("Please describe your idea in at least 25 characters before continuing.");
      return null;
    }

    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ideas/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_description: draft.rawDescription,
          target_audience: draft.targetAudience || null,
          industry: draft.industry || null,
          geographic_market: draft.geographicMarket || null,
          business_model: draft.businessModel || null,
          known_competitors: draft.knownCompetitors || null,
          assumptions: draft.assumptions || null,
          budget: draft.budget || null,
          team_size: draft.teamSize || null,
          timeline: draft.timeline || null,
          preferred_technologies: draft.preferredTechnologies || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Extraction service failed.");
      }

      const extracted: ExtractedIdeaData = await res.json();
      setExtractedData(extracted);
      return extracted;
    } catch (err: any) {
      console.error(err);
      setErrorMessage("We couldn't structure your idea right now. Your description is safely preserved here. Please try again.");
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  // Open review modal
  const handleReviewDetails = async () => {
    const data = await runExtraction();
    if (data) {
      setReviewModalOpen(true);
    }
  };

  // 3. Confirm and Start Validation (Direct or via Review)
  const handleStartValidation = async (finalData?: ExtractedIdeaData) => {
    let payloadData = finalData || extractedData;

    if (!payloadData) {
      payloadData = await runExtraction();
      if (!payloadData) return;
    }

    setIsSubmittingValidation(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s client timeout

    try {
      const payload = {
        title: payloadData.title,
        description: payloadData.description,
        targetAudience: payloadData.target_audience,
        industry: payloadData.industry,
        analysisDepth: "STANDARD",
        inputMode: "natural_language",
        rawIdea: draft.rawDescription,
        budget: draft.budget || payloadData.budget || undefined,
        teamSize: draft.teamSize || payloadData.team_size || undefined,
        timeline: draft.timeline || payloadData.timeline || undefined,
        preferredTechnologies: draft.preferredTechnologies 
          ? draft.preferredTechnologies.split(",").map(t => t.trim()).filter(Boolean)
          : (payloadData.preferred_technologies || undefined),
      };

      const res = await fetch("/api/ideas/start-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errMessage = "Failed to start analysis.";
        try {
          const errJson = await res.json();
          errMessage = errJson.detail || errJson.error || errMessage;
        } catch {
          const errText = await res.text();
          if (errText) errMessage = errText;
        }
        throw new Error(errMessage);
      }

      const result = await res.json();
      router.push(`/ideas/${result.db_idea_id}/analysis/${result.id}`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Validation submission error:", err);
      if (err.name === "AbortError") {
        setErrorMessage("Request timed out connecting to the backend. Please ensure the backend server is running and try again.");
      } else {
        setErrorMessage(err.message || "Failed to start validation pipeline. Please try again.");
      }
      setIsSubmittingValidation(false);
    }
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!draft.rawDescription.trim()) {
      setErrorMessage("Please enter some text before saving a draft.");
      return;
    }

    await onSaveDraftToDb({
      title: draft.rawDescription.slice(0, 50).trim() + "...",
      description: draft.rawDescription,
      targetAudience: draft.targetAudience || "General",
      industry: draft.industry || "General",
      budget: draft.budget,
      teamSize: draft.teamSize,
      timeline: draft.timeline,
      preferredTechnologies: draft.preferredTechnologies,
    });
  };

  return (
    <div className="space-y-8">
      {/* Headings */}
      <div>
        <h2 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">
          Tell us about your idea
        </h2>
        <p className="text-[14px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          Describe what you want to build in your own words. DIME will identify the key details and use them to validate your idea.
        </p>
      </div>

      {/* Main Textarea Card */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
            Idea Description <span className="text-dime-orange">*</span>
          </label>

          <button
            type="button"
            onClick={handleImproveIdea}
            disabled={isImproving || !draft.rawDescription.trim()}
            className={cn(
              "text-[12px] font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all",
              draft.rawDescription.trim()
                ? "bg-orange-50 text-dime-orange border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:border-orange-900/50"
                : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed"
            )}
            title="Use AI to structure and sharpen your pitch without losing your meaning"
          >
            {isImproving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Improving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Improve My Idea</span>
              </>
            )}
          </button>
        </div>

        <textarea
          value={draft.rawDescription}
          onChange={handleTextChange}
          maxLength={maxChars}
          rows={7}
          placeholder="Example: I want to build an AI-powered platform that helps college students prepare for software engineering placements. It will offer coding practice, mock interviews, personalized feedback, and progress tracking. I plan to use a freemium business model with premium subscriptions."
          className={cn(
            "w-full p-4 rounded-2xl border text-[14px] leading-relaxed bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 transition-colors resize-y min-h-[160px]",
            errorMessage ? "border-red-400 focus:border-red-500" : "border-slate-200 dark:border-slate-700 focus:border-dime-orange"
          )}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-slate-500 dark:text-slate-400 pt-1">
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dime-orange shrink-0" />
            Include the problem you&apos;re solving, your target users, your proposed solution, or anything else you already know.
          </p>
          <div className="shrink-0 font-medium">
            <span>{wordCount} words</span>
            <span className="mx-1.5 text-slate-300 dark:text-slate-700">•</span>
            <span>{charCount} / {maxChars} chars</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[12px] text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Optional Context Accordion */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
              Optional Context & Assumptions
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Optional
            </span>
          </div>
          {showOptionalFields ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showOptionalFields && (
          <div className="p-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4">
              Providing additional hints helps DIME focus its agents, but every field below is completely optional.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={draft.targetAudience}
                  onChange={(e) => onUpdateDraft({ targetAudience: e.target.value })}
                  placeholder="e.g. CS students, junior developers"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Industry / Domain
                </label>
                <input
                  type="text"
                  value={draft.industry}
                  onChange={(e) => onUpdateDraft({ industry: e.target.value })}
                  placeholder="e.g. EdTech, Developer Tools"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Geographic Market
                </label>
                <input
                  type="text"
                  value={draft.geographicMarket}
                  onChange={(e) => onUpdateDraft({ geographicMarket: e.target.value })}
                  placeholder="e.g. North America, Global, India"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Expected Business Model
                </label>
                <input
                  type="text"
                  value={draft.businessModel}
                  onChange={(e) => onUpdateDraft({ businessModel: e.target.value })}
                  placeholder="e.g. Freemium, B2B SaaS, Usage-based"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Known Competitors (Optional)
                </label>
                <input
                  type="text"
                  value={draft.knownCompetitors}
                  onChange={(e) => onUpdateDraft({ knownCompetitors: e.target.value })}
                  placeholder="e.g. LeetCode, Pramp, Interviewing.io"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              {/* Feasibility Context (Optional) */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Team Composition / Roles (Optional)
                </label>
                <input
                  type="text"
                  value={draft.teamSize || ""}
                  onChange={(e) => onUpdateDraft({ teamSize: e.target.value })}
                  placeholder="e.g. Solo founder, 2 engineers, 1 ML researcher"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Available Budget (Optional)
                </label>
                <input
                  type="text"
                  value={draft.budget || ""}
                  onChange={(e) => onUpdateDraft({ budget: e.target.value })}
                  placeholder="e.g. $5,000, Bootstrapped, <$10k"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Target MVP Timeline (Optional)
                </label>
                <input
                  type="text"
                  value={draft.timeline || ""}
                  onChange={(e) => onUpdateDraft({ timeline: e.target.value })}
                  placeholder="e.g. 3 months, 6 weeks, Q3 2026"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                  Preferred Technologies / Constraints (Optional)
                </label>
                <input
                  type="text"
                  value={draft.preferredTechnologies || ""}
                  onChange={(e) => onUpdateDraft({ preferredTechnologies: e.target.value })}
                  placeholder="e.g. Next.js, FastAPI, PostgreSQL, PyTorch"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-dime-orange"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Example Prompts Inspiration Section */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-dime-orange" />
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
            Need inspiration? Try an example.
          </h3>
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_CATEGORIES.map((ex) => {
            const isCatSelected = selectedCategory === ex.category;
            return (
              <button
                key={ex.category}
                type="button"
                onClick={() => handleApplyExample(ex.text, ex.category)}
                className={cn(
                  "text-[12px] font-semibold px-3 py-1.5 rounded-xl border transition-all text-left flex items-center gap-1.5 cursor-pointer",
                  isCatSelected
                    ? "bg-white dark:bg-slate-800 text-dime-orange border-orange-200 dark:border-orange-900/50 shadow-sm"
                    : "bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                <span>{ex.category}</span>
                <span className="text-[10px] text-slate-400">({ex.title})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSavingDraft || isExtracting || isSubmittingValidation}
          className="px-4 py-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 order-2 sm:order-1"
        >
          {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save as Draft
        </button>

        <div className="flex items-center gap-3 order-1 sm:order-2">
          <button
            type="button"
            onClick={handleReviewDetails}
            disabled={!isValid || isExtracting || isSubmittingValidation}
            className={cn(
              "h-11 px-5 rounded-xl border text-[13px] font-semibold flex items-center gap-2 transition-all",
              isValid
                ? "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                : "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200"
            )}
            title="Inspect and edit extracted attributes before starting validation"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Review Structured Details</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStartValidation()}
            disabled={!isValid || isExtracting || isSubmittingValidation}
            className={cn(
              "h-11 px-7 rounded-xl text-[14px] font-semibold flex items-center gap-2 transition-all shadow-sm bg-dime-orange text-white hover:bg-orange-600 hover:shadow",
              (!isValid || isSubmittingValidation) && "opacity-60 cursor-not-allowed"
            )}
          >
            {isSubmittingValidation ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span>Validate My Idea</span>
                <Play className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Idea Improvement Modal */}
      <IdeaImprovementModal
        isOpen={improvementModalOpen}
        onClose={() => setImprovementModalOpen(false)}
        originalText={improvementData.originalText}
        improvedText={improvementData.improvedText}
        keyEnhancements={improvementData.keyEnhancements}
        onApply={(newText) => onUpdateDraft({ rawDescription: newText })}
      />

      {/* Shared Idea Review Modal */}
      {extractedData && (
        <SharedIdeaReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          data={extractedData}
          onConfirmAndValidate={handleStartValidation}
          isSubmitting={isSubmittingValidation}
        />
      )}
    </div>
  );
}
