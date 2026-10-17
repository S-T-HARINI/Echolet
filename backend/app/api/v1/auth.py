from fastapi import APIRouter, Cookie, Depends, Header, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.auth.dependencies import (
    COOKIE_NAME,
    extract_token_from_header,
    get_current_user,
)
from backend.app.auth.schemas import (
    AuthResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)
from backend.app.auth.service import AuthService
from backend.app.database import get_db_session
from backend.app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def signup(
    payload: UserSignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    user, raw_token, expires_at = await AuthService.register(db, payload)

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Local development over HTTP
        max_age=7 * 24 * 3600,
        path="/",
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=raw_token,
        message="Account created successfully. Welcome to EchoLet!",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Sign in to user account",
)
async def login(
    payload: UserLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    user, raw_token, expires_at = await AuthService.login(db, payload)

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 24 * 3600,
        path="/",
    )

    return AuthResponse(
        user=UserResponse.model_validate(user),
        token=raw_token,
        message="Signed in successfully.",
    )


@router.post(
    "/logout",
    summary="Sign out and invalidate session",
)
async def logout(
    response: Response,
    authorization: str = Header(None),
    echolet_session: str = Cookie(None),
    db: AsyncSession = Depends(get_db_session),
):
    raw_token = extract_token_from_header(authorization) or echolet_session
    if raw_token:
        await AuthService.logout(db, raw_token)

    # Invalidate cookie
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"message": "Signed out successfully."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
