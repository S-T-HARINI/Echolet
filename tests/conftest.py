import os
import sys
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import get_db_session
from backend.app.main import app as backend_app
from backend.app.models.base import Base
from mock_service.app.database import MockBase, mock_engine
from mock_service.app.main import app as mock_app
from mock_service.app.simulator import simulator

import tempfile

@pytest_asyncio.fixture(scope="function")
async def test_engine():
    # Use a temporary file database so multiple concurrent async connections can operate cleanly
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test.db")
    db_url = f"sqlite+aiosqlite:///{db_path}"

    engine = create_async_engine(
        db_url,
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    try:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass


@pytest_asyncio.fixture(scope="function")
async def test_session_factory(test_engine):
    return async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture(scope="function")
async def test_session(test_session_factory):
    async with test_session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def mock_service_db():
    async with mock_engine.begin() as conn:
        await conn.run_sync(MockBase.metadata.drop_all)
        await conn.run_sync(MockBase.metadata.create_all)
    simulator.reset()
    yield
    simulator.reset()
    async with mock_engine.begin() as conn:
        await conn.run_sync(MockBase.metadata.drop_all)


from backend.app.auth.dependencies import get_current_user, require_member, require_organizer
from backend.app.models.user import User

@pytest_asyncio.fixture(scope="function")
async def client(test_engine):
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    backend_app.dependency_overrides[get_db_session] = override_get_db

    # Create default test organizer
    organizer_id = "00000000-0000-0000-0000-000000000001"
    default_user = User(
        id=organizer_id,
        email="organizer@example.com",
        name="Default Organizer",
        hashed_password="mock",
        role="ORGANIZER",
        is_active=True,
    )
    async with session_factory() as session:
        session.add(default_user)
        await session.commit()

    backend_app.dependency_overrides[get_current_user] = lambda: default_user
    backend_app.dependency_overrides[require_organizer] = lambda: default_user
    backend_app.dependency_overrides[require_member] = lambda: default_user

    transport = ASGITransport(app=backend_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    backend_app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def mock_client(mock_service_db):
    transport = ASGITransport(app=mock_app)
    async with AsyncClient(transport=transport, base_url="http://mockserver") as ac:
        yield ac
