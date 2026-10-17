from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.auth.schemas import UserLoginRequest, UserSignupRequest
from backend.app.auth.security import (
    generate_session_token,
    hash_password,
    hash_token,
    verify_password,
)
from backend.app.models.base import utc_now
from backend.app.models.user import User, UserSession

SESSION_DURATION_DAYS = 7


class AuthService:
    @staticmethod
    async def register(
        session: AsyncSession,
        payload: UserSignupRequest
    ) -> Tuple[User, str, datetime]:
        email_clean = payload.email.lower().strip()

        # Check existing user
        stmt = select(User).where(User.email == email_clean)
        res = await session.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists."
            )

        hashed_pw = hash_password(payload.password)
        user = User(
            email=email_clean,
            hashed_password=hashed_pw,
            name=payload.name.strip(),
            role=payload.role.value,
            is_active=True,
        )
        session.add(user)
        await session.flush()  # populate user.id

        # Create persistent session
        raw_token = generate_session_token()
        token_hash = hash_token(raw_token)
        now = utc_now()
        expires_at = now + timedelta(days=SESSION_DURATION_DAYS)

        user_session = UserSession(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        session.add(user_session)
        await session.commit()
        await session.refresh(user)

        return user, raw_token, expires_at

    @staticmethod
    async def login(
        session: AsyncSession,
        payload: UserLoginRequest
    ) -> Tuple[User, str, datetime]:
        email_clean = payload.email.lower().strip()

        stmt = select(User).where(User.email == email_clean)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled. Please contact an administrator."
            )

        # Create session
        raw_token = generate_session_token()
        token_hash = hash_token(raw_token)
        now = utc_now()
        expires_at = now + timedelta(days=SESSION_DURATION_DAYS)

        user_session = UserSession(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        session.add(user_session)
        await session.commit()
        await session.refresh(user)

        return user, raw_token, expires_at

    @staticmethod
    async def logout(
        session: AsyncSession,
        raw_token: str
    ) -> None:
        token_hash = hash_token(raw_token)
        stmt = delete(UserSession).where(UserSession.token_hash == token_hash)
        await session.execute(stmt)
        await session.commit()

    @staticmethod
    async def get_user_by_token(
        session: AsyncSession,
        raw_token: str
    ) -> Optional[User]:
        if not raw_token:
            return None

        token_hash = hash_token(raw_token)
        now = utc_now()

        stmt = (
            select(User)
            .join(UserSession, UserSession.user_id == User.id)
            .where(
                UserSession.token_hash == token_hash,
                UserSession.expires_at > now,
                User.is_active.is_(True)
            )
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()
