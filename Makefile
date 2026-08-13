.DEFAULT_GOAL := help
.PHONY: help setup dev-up dev-down dev-restart dev-status test build-docker run-docker clean

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@echo "  help           Show this help message"
	@echo "  setup          Set up Python environment with uv"
	@echo "  dev-up         Start local development servers in background"
	@echo "  dev-down       Stop local development servers"
	@echo "  dev-restart    Restart development servers cleanly"
	@echo "  dev-status     Check health of local servers"
	@echo "  test           Run tests with pytest"
	@echo "  build-docker   Build the Docker image"
	@echo "  run-docker     Run the Docker container locally"
	@echo "  clean          Clean up virtual environment and cache"

setup:
	@echo "Setting up Python environment with uv..."
	uv sync

dev-up:
	@echo "Starting FastAPI server in background..."
	@nohup uv run uvicorn src.actor_factory.main:app --reload > fastapi.log 2>&1 & echo $$! > fastapi.pid
	@echo "Starting Next.js frontend in background..."
	@cd frontend && nohup npm run dev > ../nextjs.log 2>&1 & echo $$! > ../nextjs.pid
	@echo "Waiting for servers to start..."
	@sleep 3
	@make dev-status

dev-down:
	@echo "Stopping FastAPI server..."
	@if [ -f fastapi.pid ]; then kill -9 `cat fastapi.pid` 2>/dev/null || true; rm fastapi.pid; else echo "No FastAPI PID file found."; fi
	@echo "Stopping Next.js frontend..."
	@if [ -f frontend/nextjs.pid ]; then kill -9 `cat frontend/nextjs.pid` 2>/dev/null || true; rm frontend/nextjs.pid; else echo "No Next.js PID file found."; fi
	@pkill -f "uvicorn src.actor_factory.main:app" || true
	@echo "Stopped."

dev-restart:
	@make dev-down
	@echo "Waiting for ports to clear..."
	@sleep 2
	@make dev-up

dev-status:
	@uv run python scripts/dev_status.py

test:
	@echo "Running tests..."
	PYTHONPATH=. uv run pytest tests/ -v

build-docker:
	@echo "Building Docker image..."
	docker build -t actor-factory:latest .

run-docker:
	@echo "Running Docker container..."
	docker run -p 8000:8000 actor-factory:latest

clean:
	@echo "Cleaning up..."
	rm -rf .venv
	find . -type d -name "__pycache__" -exec rm -rf {} +
