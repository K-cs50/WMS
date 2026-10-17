import os
import shutil
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, func
from models import Base
from config import settings

def get_effective_database_url() -> str:
    url = settings.DATABASE_URL
    is_serverless = os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    if is_serverless and "sqlite" in url:
        tmp_db = "/tmp/wms.db"
        if not os.path.exists(tmp_db):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidates = [
                os.path.join(base_dir, "wms.db"),
                os.path.join(os.getcwd(), "backend", "wms.db"),
                os.path.join(os.getcwd(), "wms.db"),
            ]
            for c in candidates:
                if os.path.exists(c) and os.path.getsize(c) > 0:
                    try:
                        shutil.copy2(c, tmp_db)
                        break
                    except Exception:
                        pass
        return f"sqlite+aiosqlite:///{tmp_db}"
    return url

EFFECTIVE_DATABASE_URL = get_effective_database_url()

engine = create_async_engine(
    EFFECTIVE_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in EFFECTIVE_DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed if database is completely empty
    try:
        from models import Locality
        async with AsyncSessionLocal() as session:
            count = await session.scalar(select(func.count(Locality.id)))
            if count == 0:
                from seed import seed_all
                await seed_all()
    except Exception:
        pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

