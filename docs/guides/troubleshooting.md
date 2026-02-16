# Troubleshooting Guide

## Common Issues and Solutions

## Backend Issues

### Database Connection Failed

**Symptoms:**
- API returns 500 errors
- Error message: "Could not connect to database"

**Solutions:**

1. Check if PostgreSQL is running:
   ```bash
   # Docker
   docker-compose ps db
   
   # Local
   pg_isready -h localhost -p 5432
   ```

2. Verify DATABASE_URL in environment:
   ```bash
   echo $DATABASE_URL
   ```

3. Test connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. For SQLite development:
   ```bash
   export DATABASE_URL=sqlite:///./cysmic.db
   ```

### Redis Connection Failed

**Symptoms:**
- WebSocket disconnects immediately
- Celery tasks fail

**Solutions:**

1. Check Redis status:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Verify REDIS_URL:
   ```bash
   echo $REDIS_URL
   ```

3. Restart Redis:
   ```bash
   # Docker
   docker-compose restart redis
   
   # Local
   sudo systemctl restart redis
   ```

### Import Errors

**Symptoms:**
- `ModuleNotFoundError: No module named 'xxx'`

**Solutions:**

1. Install missing dependency:
   ```bash
   pip install <module-name>
   ```

2. Or reinstall all:
   ```bash
   pip install -r requirements.txt
   ```

## Frontend Issues

### Build Failures

**Symptoms:**
- `npm run build` fails
- TypeScript errors

**Solutions:**

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

### Hot Reload Not Working

**Symptoms:**
- Changes to code don't reflect in browser

**Solutions:**

1. Check Vite config:
   ```typescript
   // vite.config.ts should have:
   server: {
     host: true,
     port: 5173
   }
   ```

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

### CORS Errors

**Symptoms:**
- Browser console: "Access-Control-Allow-Origin" error

**Solutions:**

1. Check backend CORS settings in `main.py`:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],
       allow_credentials=True,
   )
   ```

2. Update .env:
   ```
   CORS_ORIGINS=http://localhost:5173
   ```

## WebSocket Issues

### Connection Failed

**Symptoms:**
- Chat doesn't receive real-time updates
- Reconnecting... message in console

**Solutions:**

1. Check WebSocket endpoint:
   ```javascript
   // Should connect to:
   ws://localhost:8000/socket.io/
   ```

2. Verify nginx WebSocket proxy:
   ```nginx
   location /socket.io/ {
       proxy_pass http://localhost:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. Check browser console for specific error

## File Parsing Issues

### LAS File Not Parsing

**Symptoms:**
- Upload succeeds but data not extracted

**Solutions:**

1. Verify file format:
   ```bash
   file input.las
   head -20 input.las
   ```

2. Check for common issues:
   - Missing ~VERSION section
   - Non-standard curve names
   - Binary data in ASCII file

### DLIS Parsing Errors

**Symptoms:**
- Error parsing DLIS file

**Solutions:**

1. Check DLIS version (only v1 supported currently)
2. Verify file isn't corrupted:
   ```bash
   file input.dlis
   ```

## Performance Issues

### Slow API Responses

**Solutions:**

1. Add database indexes:
   ```sql
   CREATE INDEX idx_wells_field ON wells(field_id);
   CREATE INDEX idx_production_date ON production(date);
   ```

2. Enable Redis caching:
   ```bash
   export REDIS_URL=redis://localhost:6379/0
   ```

3. Check Celery workers:
   ```bash
   celery -A celery_app inspect active
   ```

### Memory Issues

**Solutions:**

1. Limit concurrent requests
2. Add pagination to list endpoints
3. Use streaming for large file downloads

## Authentication Issues

### JWT Token Expired

**Symptoms:**
- 401 Unauthorized errors

**Solutions:**

1. Refresh token:
   - Client should handle automatic refresh
   - Or manually re-login

2. Check token expiry settings:
   ```python
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

### Invalid Credentials

**Solutions:**

1. Verify user exists:
   ```bash
   # In Python shell
   from models.user import User
   user = session.query(User).filter_by(email="test@example.com").first()
   ```

2. Reset password through API

## Celery/Background Tasks

### Tasks Not Running

**Solutions:**

1. Start Celery worker:
   ```bash
   celery -A celery_app worker --loglevel=info
   ```

2. Start Celery beat:
   ```bash
   celery -A celery_app beat --loglevel=info
   ```

3. Check task status:
   ```bash
   celery -A celery_app inspect active
   celery -A celery_app inspect scheduled
   ```

## Getting Help

If you're still stuck:

1. Check the logs:
   ```bash
   # Backend
   tail -f logs/backend.log
   
   # Frontend (browser console)
   # F12 > Console
   ```

2. Search existing issues:
   - GitHub Issues

3. Collect diagnostic info:
   ```bash
   # System info
   uname -a
   python --version
   node --version
   
   # Docker
   docker-compose logs > diagnostics.txt
   ```

## Known Limitations

- DLIS v2 not yet supported
- Large files (>100MB) may timeout
- Some Petrel export formats require specific templates
