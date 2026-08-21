FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml .
COPY uv.lock .
COPY src/ ./src/

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Expose port
EXPOSE 8082

# Command to run the application
CMD ["uv", "run", "uvicorn", "src.actor_factory.main:app", "--host", "0.0.0.0", "--port", "8082"]
