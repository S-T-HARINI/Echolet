import asyncio
import logging
import signal
import sys
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.worker.outbox_worker import OutboxWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] echolet.worker: %(message)s",
)
logger = logging.getLogger("echolet.worker.runner")


async def main():
    logger.info("Initializing worker database connection...")
    await init_db()

    worker = OutboxWorker(worker_id=settings.WORKER_ID)

    loop = asyncio.get_running_loop()

    def handle_signal():
        logger.info("Shutdown signal received. Stopping worker...")
        worker.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except NotImplementedError:
            # Signal handling on Windows
            pass

    try:
        await worker.run()
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received.")
        worker.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker process exited.")
