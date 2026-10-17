from typing import Optional
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.auth.service import AuthService
from backend.app.database import get_db_session
from backend.app.models.user import User, UserRole

COOKIE_NAME = "echolet_session"


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    echolet_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db_session),
) -> Optional[User]:
    token = extract_token_from_header(authorization) or echolet_session
    if not token:
        return None
    return await AuthService.get_user_by_token(db, token)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    echolet_session: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    token = extract_token_from_header(authorization) or echolet_session
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await AuthService.get_user_by_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def require_organizer(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ORGANIZER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer privileges required to access this resource or perform this action.",
        )
    return current_user


async def require_member(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
