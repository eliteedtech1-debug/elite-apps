# Jitsi Server Setup

This directory contains the configuration for running a local Jitsi server using Docker.

## Prerequisites

1. Docker Desktop for Mac installed and running
2. At least 4GB of RAM available for Jitsi services

## Setup Instructions

1. Make sure Docker Desktop is installed and running on your system
2. Run the start script: `./start_jitsi.sh`
3. Wait for all services to start (this may take a few minutes)
4. Access the Jitsi server at http://localhost:8000

## Scripts

- `start_jitsi.sh` - Starts the Jitsi server
- `stop_jitsi.sh` - Stops the Jitsi server
- `docker-compose.yml` - Docker configuration for Jitsi services
- `.env` - Environment configuration file

## Notes

- The server uses port 8000 for HTTP and 8443 for HTTPS
- Jitsi services include web, prosody (XMPP server), jicofo (focus component), and jvb (video bridge)
- Configuration files are stored in the `config/` directory