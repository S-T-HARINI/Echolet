"""Initial database schema for EchoLet

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-17 21:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Workshops table
    op.create_table(
        'workshops',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('schedule', sa.DateTime(timezone=True), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('current_registrations', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='SCHEDULED'),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_workshops'))
    )
    op.create_index(op.f('ix_workshops_title'), 'workshops', ['title'], unique=False)
    op.create_index(op.f('ix_workshops_schedule'), 'workshops', ['schedule'], unique=False)
    op.create_index(op.f('ix_workshops_status'), 'workshops', ['status'], unique=False)

    # 2. Registrations table
    op.create_table(
        'registrations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workshop_id', sa.String(length=36), nullable=False),
        sa.Column('member_id', sa.String(length=128), nullable=False),
        sa.Column('member_name', sa.String(length=255), nullable=False),
        sa.Column('member_email', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='CONFIRMED'),
        sa.Column('registered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], name=op.f('fk_registrations_workshop_id_workshops'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_registrations')),
        sa.UniqueConstraint('workshop_id', 'member_id', name='uq_registrations_workshop_member')
    )
    op.create_index(op.f('ix_registrations_workshop_id'), 'registrations', ['workshop_id'], unique=False)
    op.create_index(op.f('ix_registrations_member_id'), 'registrations', ['member_id'], unique=False)
    op.create_index(op.f('ix_registrations_member_email'), 'registrations', ['member_email'], unique=False)
    op.create_index(op.f('ix_registrations_status'), 'registrations', ['status'], unique=False)
    op.create_index('ix_registrations_workshop_status', 'registrations', ['workshop_id', 'status'], unique=False)

    # 3. Notification Outbox table
    op.create_table(
        'notification_outbox',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workshop_id', sa.String(length=36), nullable=False),
        sa.Column('recipient_email', sa.String(length=255), nullable=False),
        sa.Column('recipient_name', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='PENDING'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('claimed_by', sa.String(length=128), nullable=True),
        sa.Column('claim_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], name=op.f('fk_notification_outbox_workshop_id_workshops'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notification_outbox')),
        sa.UniqueConstraint('idempotency_key', name='uq_notification_outbox_idempotency_key')
    )
    op.create_index(op.f('ix_notification_outbox_workshop_id'), 'notification_outbox', ['workshop_id'], unique=False)
    op.create_index(op.f('ix_notification_outbox_recipient_email'), 'notification_outbox', ['recipient_email'], unique=False)
    op.create_index(op.f('ix_notification_outbox_event_type'), 'notification_outbox', ['event_type'], unique=False)
    op.create_index(op.f('ix_notification_outbox_status'), 'notification_outbox', ['status'], unique=False)
    op.create_index(op.f('ix_notification_outbox_next_retry_at'), 'notification_outbox', ['next_retry_at'], unique=False)
    op.create_index(op.f('ix_notification_outbox_claim_expires_at'), 'notification_outbox', ['claim_expires_at'], unique=False)
    op.create_index('ix_outbox_polling', 'notification_outbox', ['status', 'next_retry_at'], unique=False)
    op.create_index('ix_outbox_lease_expiry', 'notification_outbox', ['status', 'claim_expires_at'], unique=False)


def downgrade() -> None:
    op.drop_table('notification_outbox')
    op.drop_table('registrations')
    op.drop_table('workshops')
