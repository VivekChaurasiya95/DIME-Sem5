"""
DIME Backend — Analysis models.

Core models for the analysis pipeline: analyses, runs, steps.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AnalysisStatus(str, PyEnum):
    """Status of an analysis."""

    PENDING = "pending"
    RUNNING = "running"
    PLANNING = "planning"
    RESEARCHING = "researching"
    COMPETING = "competing"
    RETRIEVING = "retrieving"
    SYNTHESIZING = "synthesizing"
    SCORING = "scoring"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class Analysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An analysis request for a user idea."""

    __tablename__ = "analyses"

    # ── Idea reference ────────────────────────────────────────
    idea_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    # ── Idea snapshot (denormalized for independence) ─────────
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str | None] = mapped_column(Text)
    target_audience: Mapped[str | None] = mapped_column(Text)

    # ── Status ────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        Enum(AnalysisStatus, name="analysis_status", create_constraint=False),
        default=AnalysisStatus.PENDING,
        nullable=False,
    )
    current_stage: Mapped[str | None] = mapped_column(String(50))
    progress: Mapped[int] = mapped_column(Integer, server_default="0", default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)

    # ── Source health ─────────────────────────────────────────
    sources_attempted: Mapped[int] = mapped_column(Integer, default=0)
    sources_succeeded: Mapped[int] = mapped_column(Integer, default=0)

    # ── Timing ────────────────────────────────────────────────
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Relationships ─────────────────────────────────────────
    steps: Mapped[list[AnalysisStep]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class AnalysisStep(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A single step within an analysis run (planner, research, etc.)."""

    __tablename__ = "analysis_steps"

    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False
    )
    step_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    input_data: Mapped[str | None] = mapped_column(Text)   # JSON
    output_data: Mapped[str | None] = mapped_column(Text)   # JSON
    error_message: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    analysis: Mapped[Analysis] = relationship(back_populates="steps")

class AgentActivity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Activity logged by LangGraph agents."""
    __tablename__ = "agent_activities"

    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False
    )
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[str | None] = mapped_column(Text) # JSON string
    status: Mapped[str] = mapped_column(String(50), default="completed")
    
    analysis: Mapped[Analysis] = relationship()

class SourceIngestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Tracks the status of each data source being ingested per analysis."""
    __tablename__ = "source_ingestions"

    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False
    )
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "GitHub", "Semantic Scholar"
    status: Mapped[str] = mapped_column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    records_found: Mapped[int] = mapped_column(Integer, default=0)
    records_indexed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    
    analysis: Mapped[Analysis] = relationship()

