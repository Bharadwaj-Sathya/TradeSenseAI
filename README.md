# TradeSenseAI

TradeSenseAI is an AI-powered trading application with a FastAPI backend, Celery background workers, Flower for task monitoring, and a frontend development server powered by `pnpm`.

## Project Structure

```text
TradeSenseAI/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── celery_app.py
│   └── ...
│
├── frontend/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── ...
│
└── README.md
```

## Prerequisites

Make sure the following are installed:

- Python 3.x
- Node.js
- pnpm
- Redis
- Celery

## Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd ~/Workspace/TradeSenseAI/backend
```

Activate your Python environment if required:

```bash
conda activate <your-environment>
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Start FastAPI

Run the backend API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

### Start Celery Worker

In a separate terminal:

```bash
cd ~/Workspace/TradeSenseAI/backend

celery -A app.celery_app:celery_app worker --loglevel=INFO
```

The Celery worker processes background tasks.

### Start Flower

In another terminal:

```bash
cd ~/Workspace/TradeSenseAI/backend

celery -A app.celery_app:celery_app flower --port=5555
```

Flower will be available at:

```text
http://localhost:5555
```

Flower provides a web interface for monitoring Celery workers and tasks.

## Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd ~/Workspace/TradeSenseAI/frontend
```

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm run dev
```

The frontend URL will be displayed in the terminal, typically:

```text
http://localhost:5173
```

## Running the Full Application

For local development, run the following processes in separate terminals.

### Terminal 1 — Backend API

```bash
cd ~/Workspace/TradeSenseAI/backend

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Celery Worker

```bash
cd ~/Workspace/TradeSenseAI/backend

celery -A app.celery_app:celery_app worker --loglevel=INFO
```

### Terminal 3 — Flower

```bash
cd ~/Workspace/TradeSenseAI/backend

celery -A app.celery_app:celery_app flower --port=5555
```

### Terminal 4 — Frontend

```bash
cd ~/Workspace/TradeSenseAI/frontend

pnpm run dev
```

## Services

| Service | Port | Purpose |
|---|---:|---|
| FastAPI | `8000` | Backend API |
| Flower | `5555` | Celery monitoring |
| Frontend | `5173` | Frontend development server |
| Redis | `6379` | Celery broker/backend, if using default Redis configuration |

## Useful URLs

After starting the application:

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`
- **FastAPI Swagger Docs:** `http://localhost:8000/docs`
- **FastAPI ReDoc:** `http://localhost:8000/redoc`
- **Flower:** `http://localhost:5555`

## Common Commands

### Backend

```bash
# Start API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker
celery -A app.celery_app:celery_app worker --loglevel=INFO

# Start Flower
celery -A app.celery_app:celery_app flower --port=5555
```

### Frontend

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build production frontend
pnpm run build

# Preview production build
pnpm run preview
```

## Environment Variables

Create the required environment file in the backend directory, for example:

```bash
cd ~/Workspace/TradeSenseAI/backend
touch .env
```

Add the required configuration values:

```env
# Example
REDIS_URL=redis://localhost:6379/0

# Add other application configuration here
# DATABASE_URL=
# SECRET_KEY=
# API_KEY=
```

Do not commit secrets or API keys to Git.

## Troubleshooting

### Celery cannot connect to Redis

Make sure Redis is running:

```bash
redis-cli ping
```

Expected response:

```text
PONG
```

If Redis is installed as a system service:

```bash
sudo systemctl status redis
```

Start it if necessary:

```bash
sudo systemctl start redis
```

### Port already in use

Check which process is using a port:

```bash
sudo lsof -i :8000
sudo lsof -i :5555
sudo lsof -i :5173
```

Terminate the relevant process if necessary.

### Frontend dependencies are missing

From the frontend directory:

```bash
pnpm install
```

Then:

```bash
pnpm run dev
```

## Development Notes

The backend consists of:

- **FastAPI** — REST API and application server
- **Celery** — asynchronous/background task processing
- **Flower** — Celery task and worker monitoring
- **Redis** — message broker and/or Celery result backend

The frontend is developed separately and communicates with the FastAPI backend.

## Git

Check the current repository status:

```bash
git status
```

Add changes:

```bash
git add .
```

Commit:

```bash
git commit -m "your commit message"
```

Push:

```bash
git push
```

---

## Quick Start

If all dependencies and environment variables are already configured:

```bash
# Terminal 1
cd ~/Workspace/TradeSenseAI/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2
cd ~/Workspace/TradeSenseAI/backend
celery -A app.celery_app:celery_app worker --loglevel=INFO

# Terminal 3
cd ~/Workspace/TradeSenseAI/backend
celery -A app.celery_app:celery_app flower --port=5555

# Terminal 4
cd ~/Workspace/TradeSenseAI/frontend
pnpm run dev
```

The application should then be accessible through the frontend development URL shown by `pnpm run dev`.