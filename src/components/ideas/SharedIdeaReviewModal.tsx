"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  X, 
  Play, 
  Edit3, 
  Layers, 
  Users, 
  Building2, 
  Target, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExtractedIdeaData {
  title: string;
  description: string;
  problem_statement: string;
  proposed_solution: string;
  target_audience: string;
  industry: string;
  core_features: string[];
  business_model?: string | null;
  known_competitors: string[];
  geographic_market?: string | null;
  assumptions: string[];
  missing_information: string[];
  user_provided_fields?: string[];
  inferred_fields?: string[];
  unknown_fields?: string[];
  budget?: string | null;
  team_size?: string | null;
  timeline?: string | null;
  preferred_technologies?: string[];
  form_factors?: string[];
}

interface SharedIdeaReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExtractedIdeaData;
  onConfirmAndValidate: (finalData: ExtractedIdeaData) => Promise<void>;
  isSubmitting?: boolean;
}

export function SharedIdeaReviewModal({
  isOpen,
  onClose,
  data,
  onConfirmAndValidate,
  isSubmitting = false,
}: SharedIdeaReviewModalProps) {
  const [formData, setFormData] = useState<ExtractedIdeaData>(data);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (!isOpen) return null;

  const isUserProvided = (field: string) => {
    return formData.user_provided_fields?.some(f => f.toLowerCase().includes(field.toLowerCase())) ?? false;
  };

  const isInferred = (field: string) => {
    return formData.inferred_fields?.some(f => f.toLowerCase().includes(field.toLowerCase())) ?? true;
  };

  const renderBadge = (field: string) => {
    if (isUserProvided(field)) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          User-Provided
        </span>
      );
    }
    if (isInferred(field)) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          AI-Inferred
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 flex items-center gap-1">
        <HelpCircle className="w-2.5 h-2.5" />
        Unknown
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-dime-orange">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white leading-tight">
                Normalized Idea Review
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                Review the structured attributes DIME extracted. You can adjust details before running autonomous validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl border text-[12px] font-semibold flex items-center gap-1.5 transition-colors",
                isEditing
                  ? "bg-orange-50 text-dime-orange border-orange-200 dark:bg-orange-950/40 dark:border-orange-800"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Done Editing" : "Edit Fields"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Row 1: Title & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Idea Title
                </label>
                {renderBadge("title")}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-dime-orange"
                />
              ) : (
                <div className="text-[15px] font-bold text-slate-900 dark:text-white p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  {formData.title}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Industry / Domain
                </label>
                {renderBadge("industry")}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-dime-orange"
                />
              ) : (
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  {formData.industry}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Target Audience & Proposed Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Target Audience
                </label>
                {renderBadge("target_audience")}
              </div>
              {isEditing ? (
                <textarea
                  value={formData.target_audience}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-dime-orange"
                />
              ) : (
                <div className="text-[13px] text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 leading-relaxed min-h-[72px]">
                  {formData.target_audience}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  Problem Statement
                </label>
                {renderBadge("problem")}
              </div>
              {isEditing ? (
                <textarea
                  value={formData.problem_statement}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem_statement: e.target.value }))}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-dime-orange"
                />
              ) : (
                <div className="text-[13px] text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 leading-relaxed min-h-[72px]">
                  {formData.problem_statement}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Full Concept / Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Full Concept & Proposed Solution
              </label>
              {renderBadge("solution")}
            </div>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-dime-orange leading-relaxed"
              />
            ) : (
              <div className="text-[13px] text-slate-800 dark:text-slate-200 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 leading-relaxed">
                {formData.description}
              </div>
            )}
          </div>

          {/* Row 4: Core Features */}
          {formData.core_features && formData.core_features.length > 0 && (
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Extracted Capabilities & Features
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.core_features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-[12px] font-medium px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-dime-orange border border-orange-100 dark:border-orange-900/40"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Row 5: Business Model & Competitors & Assumptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                  Business Model:
                </span>
                {renderBadge("business_model")}
              </div>
              <p className="text-[12px] text-slate-600 dark:text-slate-400">
                {formData.business_model || "Not specified (DIME will discover during competition & market research)"}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                  Known Competitors:
                </span>
                {renderBadge("competitors")}
              </div>
              <p className="text-[12px] text-slate-600 dark:text-slate-400">
                {formData.known_competitors && formData.known_competitors.length > 0
                  ? formData.known_competitors.join(", ")
                  : "None specified (DIME Competition Agent will analyze GitHub & commercial landscape)"}
              </p>
            </div>
          </div>

          {/* Missing info notice if any */}
          {formData.missing_information && formData.missing_information.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[12px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Information to be explored by agents:
                </h4>
                <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                  {formData.missing_information.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Back to Description
          </button>

          <button
            type="button"
            onClick={() => onConfirmAndValidate(formData)}
            disabled={isSubmitting}
            className={cn(
              "h-11 px-6 rounded-xl bg-dime-orange hover:bg-orange-600 text-white text-[14px] font-semibold flex items-center gap-2 shadow-sm transition-all",
              isSubmitting && "opacity-75 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Launching Validation Pipeline...</span>
              </>
            ) : (
              <>
                <span>Confirm & Start Validation</span>
                <Play className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
