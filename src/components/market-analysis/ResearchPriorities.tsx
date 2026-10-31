"use client";

import React from "react";
import { HelpCircle, FileQuestion } from "lucide-react";
import type { ResearchPrioritiesData } from "@/types/market-analysis";

interface ResearchPrioritiesProps {
  data?: ResearchPrioritiesData;
}

export function ResearchPriorities({ data }: ResearchPrioritiesProps) {
  if (!data || !data.questions || data.questions.length === 0) return null;

  const {
    totalQuestions = 0,
    calloutText = "These questions represent documented evidence gaps in literature. They require independent primary customer discovery and enterprise interviews, and should not be treated as validated market opportunities.",
    questions = [],
  } = data;

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-border-default p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="space-y-1 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
            <FileQuestion className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-text-strong">
            Research Priorities &amp; Unaddressed Questions
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
            {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}
          </span>
        </div>
        <p className="text-xs text-text-secondary">
          Commercial and operational questions that remain unaddressed in the retrieved academic literature.
        </p>
      </div>

      {/* Amber Callout Box */}
      <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>{calloutText}</span>
      </div>

      {/* 2x2 Grid of Question Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {questions.map((q) => (
          <div
            key={q.id}
            className="p-5 rounded-xl border border-border-default bg-neutral-50/40 dark:bg-neutral-800/40 hover:border-slate-300 dark:hover:border-neutral-700 transition-all space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-neutral-400">
                  {q.id}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700 text-text-secondary border border-neutral-200 dark:border-neutral-600">
                  {q.badge}
                </span>
              </div>
              <h3 className="text-xs font-bold text-text-strong leading-snug">
                {q.title}
              </h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {q.statement}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
