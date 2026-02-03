# Simple PowerShell script to build and run the Docker container locally
# This script assumes you have Docker Desktop installed and running.

$IMAGE_NAME = "ai-opinion"
$CONTAINER_NAME = "ai-opinion-app"

Write-Host "🚧 Building Docker image: $IMAGE_NAME..."
docker build -t $IMAGE_NAME .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed." -ForegroundColor Red
    exit 1
}

# Check if container exists and stop/remove it
if (docker ps -a --format '{{.Names}}' | Select-String -Quiet "^$CONTAINER_NAME$") {
    Write-Host "🛑 Stopping and removing existing container..."
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
}

Write-Host "🚀 Running container: $CONTAINER_NAME..."
# We map port 3000 (Web) and 3001 (WebSocket)
# We load environment variables from .env file
docker run -d -p 3000:3000 -p 3001:3001 --env-file .env --name $CONTAINER_NAME $IMAGE_NAME

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful! App running at http://localhost:3000" -ForegroundColor Green
    Write-Host "📜 Logs:"
    docker logs $CONTAINER_NAME
} else {
    Write-Host "❌ Failed to start container." -ForegroundColor Red
    exit 1
}
