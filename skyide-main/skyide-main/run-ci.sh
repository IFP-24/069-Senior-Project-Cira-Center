#!/bin/bash
set -e  # Exit on first error
echo "🚀 Running local CI..."

# ----------------------------
# Frontend
# ----------------------------
cd ide-frontend

echo "🔹 Frontend: Fixing code formatting..."
npm run format

echo "🔹 Frontend: Linting..."
npm run lint

echo "🔹 Frontend: Running tests..."
npm run test:run

echo "🔹 Frontend: Build..."
npm run build
cd ..

# ----------------------------
# Backend
# ----------------------------
cd api-backend
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

echo "🔹 Backend: code formatting..."
black .

echo "🔹 Backend: Linting..."
flake8 . --max-line-length=120 --exclude venv,dist,__pycache__

echo "🔹 Backend: Running tests..."
python3 -m pytest --maxfail=1 --disable-warnings -q

echo "✅ Local CI finished successfully!"
