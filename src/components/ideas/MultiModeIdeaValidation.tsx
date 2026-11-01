"use client";

import React, { useState } from "react";
import { ValidationModeSelector, ValidationMode } from "./ValidationModeSelector";
import { DescribeIdeaView, DescribeDraftState } from "./DescribeIdeaView";
import { StructuredFormView, StructuredDraftState } from "./StructuredFormView";
import { AIIdeaBuilderView, ChatMessage } from "./AIIdeaBuilderView";
import { WhatWeAnalyzePanel } from "./WhatWeAnalyzePanel";

export function MultiModeIdeaValidation() {
  const [selectedMode, setSelectedMode] = useState<ValidationMode>("describe");
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // ── Mode A: Describe Your Idea Draft ──────────────────────
  const [describeDraft, setDescribeDraft] = useState<DescribeDraftState>({
    rawDescription: "",
    targetAudience: "",
    industry: "",
    geographicMarket: "",
    businessModel: "",
    knownCompetitors: "",
    assumptions: "",
  });

  // ── Mode B: Structured Form Draft ─────────────────────────
  const [structuredDraft, setStructuredDraft] = useState<StructuredDraftState>({
    coreState: {
      title: "",
      description: "",
      targetAudience: "",
    },
    classState: {
      domains: [],
      formFactors: [],
    },
    opState: {
      budget: "",
      teamSize: "",
      timeline: "",
      preferredTechnologies: "",
    },
    depthState: {
      depth: "STANDARD",
    },
  });

  // ── Mode C: AI Idea Builder Conversation Draft ────────────
  const [builderMessages, setBuilderMessages] = useState<ChatMessage[]>([]);

  // Seamless draft synchronization when switching modes (Modes A and B only; Mode C is protected)
  const handleSelectMode = (newMode: ValidationMode) => {
    // If user filled in describeDraft and structured form is empty, sync them
    if (newMode === "structured" && describeDraft.rawDescription && !structuredDraft.coreState.description) {
      setStructuredDraft(prev => ({
        ...prev,
        coreState: {
          ...prev.coreState,
          description: describeDraft.rawDescription,
          targetAudience: describeDraft.targetAudience || prev.coreState.targetAudience,
        },
        classState: {
          ...prev.classState,
          domains: describeDraft.industry ? [describeDraft.industry] : prev.classState.domains,
        },
        opState: {
          ...prev.opState,
          budget: describeDraft.budget || prev.opState.budget,
          teamSize: describeDraft.teamSize || prev.opState.teamSize,
          timeline: describeDraft.timeline || prev.opState.timeline,
          preferredTechnologies: describeDraft.preferredTechnologies || prev.opState.preferredTechnologies,
        },
      }));
    }

    // If user filled in structuredDraft and describeDraft is empty, sync
    if (newMode === "describe" && structuredDraft.coreState.description && !describeDraft.rawDescription) {
      setDescribeDraft(prev => ({
        ...prev,
        rawDescription: structuredDraft.coreState.description,
        targetAudience: structuredDraft.coreState.targetAudience,
        industry: structuredDraft.classState.domains.join(", ") || prev.industry,
        budget: structuredDraft.opState.budget || prev.budget,
        teamSize: structuredDraft.opState.teamSize || prev.teamSize,
        timeline: structuredDraft.opState.timeline || prev.timeline,
        preferredTechnologies: structuredDraft.opState.preferredTechnologies || prev.preferredTechnologies,
      }));
    }

    setSelectedMode(newMode);
  };

  // Shared Save Draft to Database handler
  const handleSaveDraftToDb = async (data: {
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
  }) => {
    setIsSavingDraft(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          targetAudience: data.targetAudience,
          industry: data.industry,
          formFactors: data.formFactors,
          budget: data.budget,
          teamSize: data.teamSize,
          timeline: data.timeline,
          preferredTechnologies: data.preferredTechnologies,
          analysisDepth: data.analysisDepth,
        }),
      });

      if (res.ok) {
        alert("Draft saved successfully to My Ideas!");
      } else {
        alert("Failed to save draft.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="w-full">
      {/* 3-Mode Selector */}
      <ValidationModeSelector
        selectedMode={selectedMode}
        onSelectMode={handleSelectMode}
      />

      {/* Main Grid: Selected Mode Form on Left, WhatWeAnalyze on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-24">
        {/* Left Interactive Mode Interface */}
        <div className="lg:col-span-8">
          {selectedMode === "describe" && (
            <DescribeIdeaView
              draft={describeDraft}
              onUpdateDraft={(updates) => setDescribeDraft(prev => ({ ...prev, ...updates }))}
              onSaveDraftToDb={handleSaveDraftToDb}
              isSavingDraft={isSavingDraft}
            />
          )}

          {selectedMode === "structured" && (
            <StructuredFormView
              draft={structuredDraft}
              onUpdateDraft={(updates) => setStructuredDraft(prev => ({ ...prev, ...updates }))}
              onSaveDraftToDb={handleSaveDraftToDb}
              isSavingDraft={isSavingDraft}
            />
          )}

          {selectedMode === "builder" && (
            <AIIdeaBuilderView
              messages={builderMessages}
              onUpdateMessages={(msgs) => setBuilderMessages(msgs)}
              onResetMessages={() => setBuilderMessages([])}
            />
          )}
        </div>

        {/* Right Sticky Intelligence Panel */}
        <div className="lg:col-span-4 relative">
          <div className="lg:sticky lg:top-8">
            <WhatWeAnalyzePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
