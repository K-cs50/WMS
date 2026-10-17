"""
WMS — Vercel Serverless Function Entry Point for FastAPI
Exposes the FastAPI ASGI app for Vercel deployment.
"""
import sys
import os

# Insert backend directory and root directory into sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

for directory in [BACKEND_DIR, ROOT_DIR]:
    if directory not in sys.path:
        sys.path.insert(0, directory)

# Import the FastAPI ASGI application
from main import app  # noqa: E402
