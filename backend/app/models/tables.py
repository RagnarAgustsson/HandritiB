"""SQLAlchemy 2.0 declarative models mirroring the Drizzle schema.

These are READ-ONLY mirrors — Drizzle owns all migrations.
Do not call session.add(), session.delete(), or any DDL from this module.

Enum values match the actual PostgreSQL enums created by Drizzle migrations:
  - profile: fundur, fyrirlestur, viðtal, frjálst, stjórnarfundur
  - status: virkt, lokið, villa
  - subscription_status: trialing, active, past_due, canceled, paused

Table names match exactly what Drizzle created (snake_case, no schema prefix).
"""

from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# PostgreSQL enum types — create_type=False because Drizzle already created them
profile_enum = Enum(
    "fundur",
    "fyrirlestur",
    "viðtal",
    "frjálst",
    "stjórnarfundur",
    name="profile",
    create_type=False,
)

status_enum = Enum(
    "virkt",
    "lokið",
    "villa",
    name="status",
    create_type=False,
)

subscription_status_enum = Enum(
    "trialing",
    "active",
    "past_due",
    "canceled",
    "paused",
    name="subscription_status",
    create_type=False,
)


class Base(DeclarativeBase):
    pass


class SessionModel(Base):
    """Mirror of the 'sessions' table created by Drizzle."""

    __tablename__ = "sessions"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False, default="Óskráð lota")
    profile: Mapped[str] = mapped_column(profile_enum, nullable=False, default="fundur")
    status: Mapped[str] = mapped_column(status_enum, nullable=False, default="virkt")
    locale: Mapped[str] = mapped_column(Text, nullable=False, default="is")
    final_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())


class ChunkModel(Base):
    """Mirror of the 'chunks' table created by Drizzle."""

    __tablename__ = "chunks"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        Text, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    transcript: Mapped[str] = mapped_column(Text, nullable=False, default="")
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())


class NoteModel(Base):
    """Mirror of the 'notes' table created by Drizzle."""

    __tablename__ = "notes"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    session_id: Mapped[str] = mapped_column(
        Text, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    chunk_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("chunks.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rolling_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())


class AdminModel(Base):
    """Mirror of the 'admins' table created by Drizzle."""

    __tablename__ = "admins"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())


class SubscriptionModel(Base):
    """Mirror of the 'subscriptions' table created by Drizzle."""

    __tablename__ = "subscriptions"
    __table_args__ = {"extend_existing": True}

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    paddle_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    paddle_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        subscription_status_enum, nullable=False, default="trialing"
    )
    plan_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_period_start: Mapped[datetime | None] = mapped_column(nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(nullable=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    minutes_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
