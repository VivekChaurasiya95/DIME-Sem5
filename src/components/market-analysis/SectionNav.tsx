"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  BookOpen,
  GitBranch,
  ShieldAlert,
  Search,
  Database,
  BarChart2,
} from "lucide-react";

interface SectionItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionItem[] = [
  { id: "sec-summary", label: "Summary KPIs", icon: Activity },
  { id: "sec-research", label: "Academic Research", icon: BookOpen },
  { id: "sec-github", label: "GitHub Ecosystem", icon: GitBranch },
  { id: "sec-pain-points", label: "Problem Intelligence", icon: BarChart2 },
  { id: "sec-inspector", label: "Evidence Inspector", icon: Search },
  { id: "sec-gaps", label: "Gaps & Hypotheses", icon: ShieldAlert },
  { id: "sec-sources", label: "Source Coverage", icon: Database },
];

export function SectionNav() {
  const [activeSection, setActiveSection] = useState<string>("sec-summary");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(s.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-surface-white/95 backdrop-blur-md border-y border-border-default py-2.5 px-4 mb-6 shadow-xs overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 min-w-max">
        <span className="text-[11px] uppercase tracking-wider font-bold text-text-secondary mr-2">
          Jump to:
        </span>
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollTo(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-strong hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

