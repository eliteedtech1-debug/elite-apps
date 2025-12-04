#!/bin/bash

# Script to start Jitsi server

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "Docker is running. Starting Jitsi server..."

# Change to the jitsi directory
cd /Users/apple/Downloads/apps/elite/jitsi

# Pull the latest Jitsi images
echo "Pulling latest Jitsi images..."
docker-compose pull

# Start the Jitsi services
echo "Starting Jitsi services..."
docker-compose up -d

echo "Jitsi server is now running!"
echo "You can access it at http://localhost:8000"
echo ""
echo "To view the logs: docker-compose logs -f"
echo "To stop the server: docker-compose down"