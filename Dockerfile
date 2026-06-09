# =======================================================
# Stage 1: Build the React + Tailwind Frontend
# =======================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json ./
RUN npm install

# Copy source and configurations to build
COPY frontend/ ./
RUN npm run build

# =======================================================
# Stage 2: Create Python runtime and serve FastAPI + SPA
# =======================================================
FROM python:3.10-slim AS backend-runner

# Optimize Python execution environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Install system dependencies (if any are needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -U pip \
    && pip install --no-cache-dir -r backend/requirements.txt

# Copy Python codebase
COPY backend/ ./backend/

# Copy built React SPA static assets into the expected directory path
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose standard Cloud Run port
EXPOSE 8080

# Command to run FastAPI server under Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
