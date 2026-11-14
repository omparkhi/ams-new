# syntax=docker/dockerfile:1.4
FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system runtime dependencies for OpenCV and image processing
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        gcc \
        g++ \
        make \
        libgl1-mesa-glx \
        libglib2.0-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

EXPOSE 8000

# Start Gunicorn WSGI server for the Flask REST API
CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
