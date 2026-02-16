# Getting Started with CYSMIC Subsurface OS

## Prerequisites

- **Python 3.11+** for backend
- **Node.js 18+** for frontend
- **PostgreSQL 15+** (or use SQLite for development)
- **Redis 7+** (optional for development)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/project-merlin-00/cysmic-subsurface-os
cd cysmic-subsurface-os
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

The UI will be available at `http://localhost:5173`

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cysmic
# Or for SQLite (development)
DATABASE_URL=sqlite:///./cysmic.db

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# CORS
CORS_ORIGINS=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

## Project Structure

```
cysmic-subsurface-os/
├── backend/
│   ├── api/v1/          # API endpoints
│   ├── core/            # Core utilities
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── tasks/           # Celery tasks
│   ├── parsers/         # File parsers
│   ├── utils/           # Utilities
│   ├── websockets/      # WebSocket handlers
│   ├── main.py          # FastAPI app
│   └── celery_app.py    # Celery configuration
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── cards/       # Card system
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   ├── pages/       # Page components
│   │   ├── stores/      # Zustand stores
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
└── docs/                # Documentation
```

## Using the Application

### Starting a Conversation

1. Open the application in your browser
2. You'll see the chat interface
3. Type a message to interact with the AI agent

### Example Commands

```
"Show me wells in Field A"
"Analyze decline curve for Well-01"
"Calculate STOIIP for the reservoir"
"Upload the production data file"
```

### Card System

The agent will spawn interactive cards based on your requests:

- **File Ingestion Card** - Upload LAS, DLIS, CSV files
- **Decline Curve Card** - Visualize and analyze production decline
- **Volumetrics Card** - Calculate hydrocarbon volumes
- **Well Test Card** - Analyze pressure transient data
- **Material Balance Card** - Run material balance calculations
- **Report Builder Card** - Generate reports

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run test
```

### Building for Production

```bash
# Backend
cd backend
pip install -r requirements.txt
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend
cd frontend
npm run build
```

## Common Issues

### Database Connection Failed

Make sure PostgreSQL is running and the connection string is correct.

### WebSocket Connection Failed

Ensure the backend is running and the frontend is connecting to the correct WebSocket URL.

### File Parsing Errors

Check that uploaded files are in a supported format (LAS, DLIS, CSV).

## Next Steps

- Read the [Architecture Overview](./architecture/system-overview.mmd)
- Explore the [API Documentation](./api/openapi.yaml)
- Learn about the [Card System](./components/card-system.md)
