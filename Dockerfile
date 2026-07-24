# Production Dockerfile for Rentora Django Application
FROM python:3.11-slim

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy & install Python requirements
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Collect static files
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Run production Gunicorn server
CMD ["gunicorn", "--config", "gunicorn.conf.py", "rentora_project.wsgi:application"]
