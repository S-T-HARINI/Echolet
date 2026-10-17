import subprocess
import sys
import time
import os

python_exe = sys.executable

print("Starting Mock Notification Service on port 8001...")
mock_proc = subprocess.Popen(
    [python_exe, "-m", "uvicorn", "mock_service.app.main:app", "--port", "8001", "--host", "127.0.0.1"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

print("Starting EchoLet Backend API on port 8000...")
backend_proc = subprocess.Popen(
    [python_exe, "-m", "uvicorn", "backend.app.main:app", "--port", "8000", "--host", "127.0.0.1"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

print("Starting Outbox Worker daemon...")
worker_proc = subprocess.Popen(
    [python_exe, "-m", "backend.app.worker.runner"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

time.sleep(3.0)  # Wait for services to bind ports

try:
    demo_code = subprocess.call([python_exe, "scripts/demo_e2e.py"])
finally:
    print("Terminating background demo services...")
    for proc in (worker_proc, backend_proc, mock_proc):
        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

sys.exit(demo_code)
