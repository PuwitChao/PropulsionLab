# ── Stage 1: build the React frontend ───────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Stage 2: Python backend + nginx to serve the SPA ────────────────────────
FROM python:3.11-slim AS runtime

# System deps for Cantera + curl (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx gcc g++ libgfortran5 curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root service account; nginx master stays root to bind :80
RUN groupadd -r proplab && useradd -r -g proplab proplab

WORKDIR /app

# Backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Application source
COPY backend/ ./backend/
COPY core/    ./core/

# Frontend build output → nginx root
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# nginx config: serve SPA and proxy /analyze/* → FastAPI
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# nginx master runs as root (required for :80); uvicorn drops to proplab
CMD ["sh", "-c", "nginx && su -s /bin/sh proplab -c 'uvicorn backend.main:app --host 0.0.0.0 --port 8000'"]
