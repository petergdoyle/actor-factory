.DEFAULT_GOAL := help
.PHONY: help setup _check-setup dev-up dev-down dev-restart dev-status test build-docker run-docker clean

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@echo "  help           Show this help message"
	@echo "  setup          Set up Python environment with uv"
	@echo "  dev-up         Start local development servers bound to 0.0.0.0 in background"
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
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

_check-setup:
	@if [ ! -d .venv ]; then \
		echo "❌ Python virtual environment not found. Run 'make setup' first."; exit 1; \
	fi
	@if [ ! -d frontend/node_modules ]; then \
		echo "❌ Frontend dependencies not installed. Run 'make setup' first."; exit 1; \
	fi

dev-up: _check-setup
	@STARTED=0; \
	if curl -sf http://localhost:8000/health > /dev/null 2>&1; then \
		echo "⚡ FastAPI already running on :8000, skipping..."; \
	else \
		echo "Starting FastAPI server on 0.0.0.0:8000 in background..."; \
		nohup uv run uvicorn src.actor_factory.main:app --host 0.0.0.0 --port 8000 --reload > fastapi.log 2>&1 & echo $$! > fastapi.pid; \
		STARTED=1; \
	fi; \
	if curl -sf http://localhost:3000 > /dev/null 2>&1; then \
		echo "⚡ Next.js already running on :3000, skipping..."; \
	else \
		echo "Starting Next.js frontend on 0.0.0.0:3000 in background..."; \
		cd frontend && nohup npm run dev -- -H 0.0.0.0 -p 3000 > ../nextjs.log 2>&1 & echo $$! > nextjs.pid; \
		STARTED=1; \
	fi; \
	if [ $$STARTED -eq 1 ]; then \
		echo "Waiting for servers to start..."; sleep 3; \
	fi
	@make dev-status

dev-down:
	@FASTAPI=$$(curl -sf http://localhost:8000/health > /dev/null 2>&1 && echo 1 || echo 0); \
	NEXTJS=$$(curl -sf http://localhost:3000 > /dev/null 2>&1 && echo 1 || echo 0); \
	if [ $$FASTAPI -eq 0 ] && [ $$NEXTJS -eq 0 ]; then \
		echo "ℹ️  No servers running. Nothing to stop."; \
	else \
		echo "Stopping FastAPI server..."; \
		if [ -f fastapi.pid ]; then kill -9 $$(cat fastapi.pid) 2>/dev/null || true; rm fastapi.pid; else echo "No FastAPI PID file found."; fi; \
		echo "Stopping Next.js frontend..."; \
		if [ -f nextjs.pid ]; then kill -9 $$(cat nextjs.pid) 2>/dev/null || true; rm nextjs.pid; else echo "No Next.js PID file found."; fi; \
		pkill -f "uvicorn src.actor_factory.main:app" || true; \
		pkill -f "next dev" || true; \
		pkill -f "next-server" || true; \
		echo "Stopped."; \
	fi

dev-restart: _check-setup
	@RUNNING=0; \
	if curl -sf http://localhost:8000/health > /dev/null 2>&1; then RUNNING=1; fi; \
	if curl -sf http://localhost:3000 > /dev/null 2>&1; then RUNNING=1; fi; \
	if [ $$RUNNING -eq 1 ]; then \
		$(MAKE) dev-down; \
		echo "Waiting for ports to clear..."; sleep 2; \
	else \
		echo "No servers running, skipping shutdown..."; \
	fi
	@$(MAKE) dev-up

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
