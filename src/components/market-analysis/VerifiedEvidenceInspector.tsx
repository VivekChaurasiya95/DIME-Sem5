import React, { useState } from "react";
import { CheckCircle2, Quote, ExternalLink, BookmarkPlus, Check, Flag } from "lucide-react";
import type { PainPointRankingItem } from "@/types/market-analysis";

interface VerifiedEvidenceInspectorProps {
  item: PainPointRankingItem;
  ideaId: string;
}

export function VerifiedEvidenceInspector({
  item,
  ideaId,
}: VerifiedEvidenceInspectorProps) {
  const { evidence, title } = item;
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);

  const handleSaveNote = async () => {
    if (isSavingNote || noteSaved) return;
    setIsSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Evidence Note: ${title}`,
          content: `${evidence.supportingText}\n\nSource: ${evidence.sourceTitle} (${evidence.sourceUrl})\nRelevance: High (${evidence.relevanceScore.toFixed(2)})`,
          category: "Market Research",
          tone: "orange",
          ideaId,
        }),
      });
      if (res.ok) {
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save note error:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleFlagSignal = async () => {
    if (isFlagging || isFlagged) return;
    setIsFlagging(true);
    try {
      const res = await fetch("/api/market-analysis/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalTitle: title,
          evidenceId: evidence.id,
          reason: "User flagged for citation verification.",
        }),
      });
      if (res.ok) {
        setIsFlagged(true);
        setTimeout(() => setIsFlagged(false), 3000);
      }
    } catch (err) {
      console.error("Flag signal error:", err);
    } finally {
      setIsFlagging(false);
    }
  };

  return (
    <div id="sec-inspector" className="bg-surface-white rounded-xl border-2 border-primary/40 p-6 shadow-md relative">
      <div className="flex items-center justify-between pb-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h2 className="font-title-card text-title-card text-text-strong">
            Verified Evidence Inspector
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary text-white">
          Live Link
        </span>
      </div>

      <div className="mt-3">
        <span className="font-caption text-caption text-primary font-semibold">
          LINKED SIGNAL: {title}
        </span>
      </div>

      {/* Evidence Metadata Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-canvas-bg text-text-strong border border-border-default font-mono">
          {evidence.sourceTitle}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success-soft text-success-green border border-green-200">
          Relevance: High ({evidence.relevanceScore.toFixed(2)})
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-text-muted bg-canvas-bg border border-border-default">
          {evidence.timestampText}
        </span>
      </div>

      {/* Verified Excerpt Quote */}
      <div className="mt-4 p-3.5 bg-brand-soft rounded-lg border border-brand-pale text-text-strong font-body-md text-body-md relative">
        <Quote className="w-6 h-6 absolute top-2 left-2 text-primary/20 pointer-events-none select-none" />
        <p className="relative z-10 pl-2 text-sm leading-relaxed text-slate-800">
          {evidence.supportingText}
        </p>
      </div>

      {/* Corroborating Signals */}
      <div className="mt-4">
        <span className="font-caption text-caption text-text-secondary uppercase tracking-wider font-semibold">
          Corroborating Provenance
        </span>
        <div className="mt-2 space-y-2">
          {evidence.corroboratingSources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded bg-canvas-bg border border-border-default text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-text-strong font-medium">
                  {source.sourceName}
                </span>
              </div>
              <span className="text-text-muted font-mono">
                {source.similarityText}
              </span>
            </div>
          ))}
        </div>
        <p className="font-caption text-caption text-text-muted mt-2">
          {evidence.secondaryCitationsNote}
        </p>
      </div>

      {/* Action Buttons for Evidence Item */}
      <div className="mt-5 pt-4 border-t border-border-default flex flex-col gap-2">
        <a
          className="w-full h-9 rounded-lg bg-surface-white border border-border-default hover:bg-canvas-bg text-text-strong font-body-semibold text-body-semibold flex items-center justify-center gap-1.5 text-xs transition-colors"
          href={evidence.sourceUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Open Original Source</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote || noteSaved}
            className={`h-8 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-colors ${
              noteSaved
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-canvas-bg hover:bg-slate-200 text-text-secondary"
            }`}
            type="button"
          >
            {noteSaved ? (
              <Check className="w-4 h-4 text-green-700" />
            ) : (
              <BookmarkPlus className="w-4 h-4" />
            )}
            <span>
              {isSavingNote
                ? "Saving..."
                : noteSaved
                ? "Saved Note"
                : "Save Note"}
            </span>
          </button>

          <button
            onClick={handleFlagSignal}
            disabled={isFlagging || isFlagged}
            className={`h-8 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1 transition-colors ${
              isFlagged
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-canvas-bg hover:bg-danger-soft hover:text-danger-red text-text-secondary"
            }`}
            type="button"
          >
            {isFlagged ? (
              <Check className="w-4 h-4 text-red-700" />
            ) : (
              <Flag className="w-4 h-4" />
            )}
            <span>
              {isFlagging
                ? "Flagging..."
                : isFlagged
                ? "Flagged"
                : "Flag Signal"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
