"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IdeaCoreConcept, CoreConceptState } from "./IdeaCoreConcept";
import { IdeaClassification, ClassificationState } from "./IdeaClassification";
import { OperationalConstraints, OperationalConstraintsState } from "./OperationalConstraints";
import { AnalysisDepthSelector, AnalysisDepthState } from "./AnalysisDepthSelector";
import { ValidationActions } from "./ValidationActions";

export interface StructuredDraftState {
  coreState: CoreConceptState;
  classState: ClassificationState;
  opState: OperationalConstraintsState;
  depthState: AnalysisDepthState;
}

interface StructuredFormViewProps {
  draft: StructuredDraftState;
  onUpdateDraft: (updates: Partial<StructuredDraftState>) => void;
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

export function StructuredFormView({
  draft,
  onUpdateDraft,
  onSaveDraftToDb,
  isSavingDraft,
}: StructuredFormViewProps) {
  const router = useRouter();

  const { coreState, classState, opState, depthState } = draft;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!coreState.title || coreState.title.length < 4) {
      newErrors.title = "Title must be at least 4 characters.";
    }
    if (!coreState.description || coreState.description.length < 30) {
      newErrors.description = "Description must be at least 30 characters.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPayload = () => {
    return {
      title: coreState.title,
      description: coreState.description,
      targetAudience: coreState.targetAudience,
      industry: classState.domains.join(", ") || "General",
      formFactors: classState.formFactors,
      budget: opState.budget,
      teamSize: opState.teamSize,
      timeline: opState.timeline,
      preferredTechnologies: opState.preferredTechnologies.split(",").map(t => t.trim()).filter(Boolean),
      analysisDepth: depthState.depth,
      inputMode: "structured_form",
    };
  };

  const handleSaveDraft = async () => {
    if (!coreState.title && !coreState.description) {
      alert("Please enter at least a title or description to save a draft.");
      return;
    }

    await onSaveDraftToDb({
      title: coreState.title || "Untitled Draft",
      description: coreState.description,
      targetAudience: coreState.targetAudience,
      industry: classState.domains.join(", ") || "General",
      formFactors: classState.formFactors,
      budget: opState.budget,
      teamSize: opState.teamSize,
      timeline: opState.timeline,
      preferredTechnologies: opState.preferredTechnologies.split(",").map(t => t.trim()).filter(Boolean),
      analysisDepth: depthState.depth,
    });
  };

  const handleAnalyze = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/ideas/start-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        router.push(`/ideas/${data.db_idea_id}/analysis/${data.id}`);
      } else {
        let errText = "Failed to start analysis.";
        try {
          const errJson = await res.json();
          errText = errJson.detail || errJson.error || errText;
        } catch {
          const raw = await res.text();
          if (raw) errText = raw;
        }
        alert(`Validation error: ${errText}`);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      alert(
        err.name === "AbortError"
          ? "Request timed out connecting to the backend. Please retry."
          : "An error occurred while starting the analysis."
      );
      setIsSubmitting(false);
    }
  };

  const isValid = coreState.title.length >= 4 && coreState.description.length >= 30;

  return (
    <div className="space-y-12">
      <IdeaCoreConcept 
        data={coreState} 
        onChange={(updates) => onUpdateDraft({ coreState: { ...coreState, ...updates } })} 
        errors={errors} 
      />
      
      <IdeaClassification 
        data={classState}
        onChange={(updates) => onUpdateDraft({ classState: { ...classState, ...updates } })}
      />
      
      <OperationalConstraints 
        data={opState}
        onChange={(updates) => onUpdateDraft({ opState: { ...opState, ...updates } })}
      />
      
      <AnalysisDepthSelector 
        data={depthState}
        onChange={(updates) => onUpdateDraft({ depthState: { ...depthState, ...updates } })}
      />

      <ValidationActions 
        isSubmitting={isSubmitting}
        isSavingDraft={isSavingDraft}
        onAnalyze={handleAnalyze}
        onSaveDraft={handleSaveDraft}
        isValid={isValid}
      />
    </div>
  );
}
