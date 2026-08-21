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
	if curl -sf http://localhost:8082/health > /dev/null 2>&1; then \
		echo "⚡ FastAPI already running on :8082, skipping..."; \
	else \
		echo "Starting FastAPI server on 0.0.0.0:8082 in background..."; \
		nohup uv run uvicorn src.actor_factory.main:app --host 0.0.0.0 --port 8082 --reload > fastapi.log 2>&1 & echo $$! > fastapi.pid; \
		STARTED=1; \
	fi; \
	if curl -sf http://localhost:3002 > /dev/null 2>&1; then \
		echo "⚡ Next.js already running on :3002, skipping..."; \
	else \
		echo "Starting Next.js frontend on 0.0.0.0:3002 in background..."; \
		cd frontend && nohup npm run dev -- -H 0.0.0.0 -p 3002 > ../nextjs.log 2>&1 & echo $$! > nextjs.pid; \
		STARTED=1; \
	fi; \
	if [ $$STARTED -eq 1 ]; then \
		echo "Waiting for servers to start..."; sleep 3; \
	fi
	@make dev-status

dev-down:
	@echo "Stopping development servers..."
	@# Kill anything listening on FastAPI port 8082
	@lsof -ti :8082 | xargs kill -9 2>/dev/null || true
	@# Kill anything listening on Next.js port 3002
	@lsof -ti :3002 | xargs kill -9 2>/dev/null || true
	@# Belt-and-suspenders: pkill by process name patterns
	@pkill -9 -f "uvicorn src.actor_factory.main:app" 2>/dev/null || true
	@pkill -9 -f "next-server" 2>/dev/null || true
	@pkill -9 -f "next dev" 2>/dev/null || true
	@# Clean up stale PID files
	@rm -f fastapi.pid frontend/nextjs.pid nextjs.pid
	@echo "Stopped."

dev-restart: _check-setup
	@$(MAKE) dev-down
	@echo "Waiting for ports to clear..."; sleep 2
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
	docker run -p 8082:8082 actor-factory:latest

clean:
	@echo "Cleaning up..."
	rm -rf .venv
	find . -type d -name "__pycache__" -exec rm -rf {} +
