#!/bin/bash
set -e
cd "$HOME/Projects/bookflow-platform"
backend/.venv/bin/uvicorn main:app --app-dir backend --host 127.0.0.1 --port 6051 &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT
npm run dev -- --port 6050
