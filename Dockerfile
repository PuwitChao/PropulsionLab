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

# System deps for Cantera
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx gcc g++ libgfortran5 \
    && rm -rf /var/lib/apt/lists/*

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

# Start nginx + uvicorn
CMD ["sh", "-c", "nginx && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
