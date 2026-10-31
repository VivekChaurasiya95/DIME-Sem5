"use client";

import React from "react";
import { GitBranch, ExternalLink, Star, Info, Code2 } from "lucide-react";
import type { GithubEcosystemData } from "@/types/market-analysis";

interface PublicImplementationEcosystemProps {
  data?: GithubEcosystemData;
}

export function PublicImplementationEcosystem({
  data,
}: PublicImplementationEcosystemProps) {
  if (!data) return null;

  const {
    totalReposFound = 0,
    topRepositories = [],
    primaryLanguages = [],
    languageDistribution = [],
    warning = "Public code repositories reflect open-source developer activity, reference architectures, and academic software implementations. Repository counts and stars do not represent customer adoption, market share, or commercial revenue.",
  } = data;

  const displayLanguages = primaryLanguages.length > 0
    ? primaryLanguages
    : languageDistribution.map((l) => ({ name: l.language, count: l.repoCount }));

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-border-default p-6 shadow-xs flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-1.5 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-primary">
                <GitBranch className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-text-strong">
                Public Implementation Ecosystem
              </h3>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-text-secondary border border-neutral-200 dark:border-neutral-700">
              {totalReposFound} {totalReposFound === 1 ? "repo" : "repos"}
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Open-source GitHub repositories matching the domain and technical architecture.
          </p>
        </div>

        {/* Warning Callout Box */}
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-text-secondary leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>

        {/* Primary Programming Languages */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-strong">
            PRIMARY PROGRAMMING LANGUAGES
          </div>
          {displayLanguages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayLanguages.map((lang, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-text-secondary"
                >
                  <Code2 className="w-3.5 h-3.5 text-text-muted" />
                  <span>
                    {lang.name} ({lang.count})
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted italic">
              No language telemetry specified in repository metadata.
            </div>
          )}
        </div>

        {/* Repository Cards List */}
        <div className="space-y-3 pt-2">
          {topRepositories.length > 0 ? (
            topRepositories.map((repo, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border-default bg-neutral-50/40 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-text-strong hover:text-primary transition-colors flex items-center gap-1.5 min-w-0"
                  >
                    <span className="truncate">{repo.name}</span>
                    <ExternalLink className="w-3 h-3 text-text-muted shrink-0" />
                  </a>
                  <div className="flex items-center gap-1 text-amber-500 font-mono text-xs font-semibold shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{repo.stars}</span>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                  {repo.description || repo.relevance}
                </p>

                <div className="pt-1 flex items-center justify-between text-[11px]">
                  {repo.language && (
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 border border-border-default text-text-secondary font-mono text-[10px]">
                      {repo.language}
                    </span>
                  )}
                  {repo.activityStatus && (
                    <span className="text-text-muted text-[10px]">
                      Status: {repo.activityStatus}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 border border-dashed border-border-default rounded-xl text-center text-xs text-text-muted">
              No open-source repositories retained for this analysis run.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
