#!/bin/bash

# Script to stop Jitsi server

echo "Stopping Jitsi server..."

# Change to the jitsi directory
cd /Users/apple/Downloads/apps/elite/jitsi

# Stop the Jitsi services
docker-compose down

echo "Jitsi server has been stopped."