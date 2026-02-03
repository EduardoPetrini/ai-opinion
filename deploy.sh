#!/bin/bash

# Simple Bash script to build and run the Docker container locally
# This script assumes you have Docker Desktop installed and running.
# Run with: ./deploy.sh

IMAGE_NAME="ai-opinion"
CONTAINER_NAME="ai-opinion-app"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🚧 Building Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed.${NC}"
    exit 1
fi

# Check if container exists and stop/remove it
if [ "$(docker ps -a -q -f name=^/${CONTAINER_NAME}$)" ]; then
    echo "🛑 Stopping and removing existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
elif [ "$(docker ps -a -q -f name=^${CONTAINER_NAME}$)" ]; then
    # Sometimes/Some versions might not have the leading slash in internal checking, checking both valid patterns
    echo "🛑 Stopping and removing existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
else
    # Simple check by name if the above regex fails for some reason on specific git bash versions
    if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}$"; then
        echo "🛑 Stopping and removing existing container..."
        docker stop $CONTAINER_NAME
        docker rm $CONTAINER_NAME
    fi
fi

echo "🚀 Running container: $CONTAINER_NAME..."
# We map port 3000 (Web) and 3001 (WebSocket)
# We load environment variables from .env file
docker run -d -p 3000:3000 -p 3001:3001 --env-file .env --name $CONTAINER_NAME $IMAGE_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful! App running at http://localhost:3000${NC}"
    echo "📜 Logs:"
    docker logs $CONTAINER_NAME
else
    echo -e "${RED}❌ Failed to start container.${NC}"
    exit 1
fi
