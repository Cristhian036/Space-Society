FROM python:3.11-slim

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install scientific dependencies (wheels for fast build)
RUN pip install --no-cache-dir \
    numpy>=2.0 \
    scipy>=1.14 \
    Pillow>=10 \
    numba>=0.60 \
    h5py>=3.11 \
    rasterio>=1.4

# Copy project files
COPY . /app

# Create cache directory
RUN mkdir -p /app/.dem_cache

EXPOSE 8050

ENV PYTHONUNBUFFERED=1
ENV PORT=8050

CMD ["python", "hydro_sar_microservice.py"]
