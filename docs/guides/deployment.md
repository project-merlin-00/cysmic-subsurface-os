# Deployment Guide

## Production Deployment

This guide covers deploying CYSMIC Subsurface OS to production environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
│                     (Nginx / Cloud LB)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐        ┌─────────┐
   │ Frontend │       │ Frontend │        │ Frontend │
   │  (Vite)  │       │  (Vite)  │        │  (Vite)  │
   └────┬────┘       └────┬────┘        └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Backend    │
                    │  (FastAPI)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐        ┌─────────┐
   │PostgreSQL│       │  Redis  │        │ Celery   │
   │  +vector │       │         │        │ Workers  │
   └─────────┘       └─────────┘        └─────────┘
```

## Prerequisites

- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Domain name with SSL certificates

## Docker Deployment

### 1. Create Dockerfile for Backend

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Create Dockerfile for Frontend

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose Configuration

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - cysmic

  # Backend API
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://cysmic:password@db:5432/cysmic
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - redis
    networks:
      - cysmic

  # Database
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=cysmic
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=cysmic
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - cysmic

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    networks:
      - cysmic

  # Celery Worker
  celery-worker:
    build: ./backend
    command: celery -A celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://cysmic:password@db:5432/cysmic
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
      - backend
    networks:
      - cysmic

  # Celery Beat (Scheduler)
  celery-beat:
    build: ./backend
    command: celery -A celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://cysmic:password@db:5432/cysmic
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    networks:
      - cysmic

volumes:
  pgdata:
  redisdata:

networks:
  cysmic:
    driver: bridge
```

### 4. Deploy

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Manual Deployment

### Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://user:pass@host:5432/cysmic
export REDIS_URL=redis://host:6379/0
export SECRET_KEY=your-secret-key

# Run with gunicorn
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Frontend

```bash
# Build
npm run build

# Serve with nginx
server {
    listen 80;
    server_name api.cysmic.io;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
    }
    
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Security Checklist

- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure strong SECRET_KEY
- [ ] Set up rate limiting
- [ ] Enable CORS for allowed domains only
- [ ] Use environment variables for secrets
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Enable firewall rules

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:8000/health
```

### Metrics with Prometheus

Add to backend:
```python
from fastapi_prometheus import middleware

app.add_middleware(middleware.PrometheusMiddleware)
```

## Backup Strategy

```bash
# Database backup
pg_dump -U cysmic cysmic > backup_$(date +%Y%m%d).sql

# Redis backup
redis-cli SAVE
```

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs service_name

# Check environment
docker-compose config
```

### Database connection issues

```bash
# Test connection
docker-compose exec db psql -U cysmic -c "SELECT 1"
```

### WebSocket issues

Ensure WebSocket proxy is configured in nginx.
