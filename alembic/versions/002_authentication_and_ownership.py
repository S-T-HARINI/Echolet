"""Authentication, user sessions, and workshop/registration ownership

Revision ID: 002_auth_ownership
Revises: 001_initial_schema
Create Date: 2026-10-17 22:30:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_auth_ownership'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='MEMBER'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
        sa.UniqueConstraint('email', name='uq_users_email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 2. User Sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_sessions_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_sessions')),
        sa.UniqueConstraint('token_hash', name='uq_user_sessions_token_hash')
    )
    op.create_index(op.f('ix_user_sessions_token_hash'), 'user_sessions', ['token_hash'], unique=True)
    op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_expires_at'), 'user_sessions', ['expires_at'], unique=False)
    op.create_index('ix_user_sessions_lookup', 'user_sessions', ['token_hash', 'expires_at'], unique=False)

    # 3. Add organizer_id to workshops
    op.add_column('workshops', sa.Column('organizer_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_workshops_organizer_id'), 'workshops', ['organizer_id'], unique=False)
    # Add foreign key constraint safely
    with op.batch_alter_table('workshops') as batch_op:
        batch_op.create_foreign_key(
            op.f('fk_workshops_organizer_id_users'),
            'users',
            ['organizer_id'],
            ['id'],
            ondelete='SET NULL'
        )

    # 4. Add user_id to registrations
    op.add_column('registrations', sa.Column('user_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_registrations_user_id'), 'registrations', ['user_id'], unique=False)
    with op.batch_alter_table('registrations') as batch_op:
        batch_op.create_foreign_key(
            op.f('fk_registrations_user_id_users'),
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )


def downgrade() -> None:
    with op.batch_alter_table('registrations') as batch_op:
        batch_op.drop_constraint(op.f('fk_registrations_user_id_users'), type_='foreignkey')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('workshops') as batch_op:
        batch_op.drop_constraint(op.f('fk_workshops_organizer_id_users'), type_='foreignkey')
        batch_op.drop_column('organizer_id')

    op.drop_table('user_sessions')
    op.drop_table('users')
