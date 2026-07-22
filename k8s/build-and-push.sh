#!/usr/bin/env bash
# Run this from the project TOP LEVEL (where docker-compose.yml lives),
# on a machine that has Docker installed and is logged in to your registry
# (docker login), with network access to nodes eventually pulling these images.
#
# Usage: DOCKERHUB_USER=yourusername ./k8s/build-and-push.sh
set -euo pipefail

: "${DOCKERHUB_USER:?Set DOCKERHUB_USER, e.g. DOCKERHUB_USER=yourname ./k8s/build-and-push.sh}"
TAG="${TAG:-latest}"

echo "Building and pushing images as ${DOCKERHUB_USER}/<service>:${TAG}"

docker build -f auth-service.Dockerfile -t "${DOCKERHUB_USER}/auth-service:${TAG}" ./backend-services
docker build -f task-service.Dockerfile -t "${DOCKERHUB_USER}/task-service:${TAG}" ./backend-services
docker build -f notification-service.Dockerfile -t "${DOCKERHUB_USER}/notification-service:${TAG}" ./backend-services
docker build -f api-gateway.Dockerfile -t "${DOCKERHUB_USER}/api-gateway:${TAG}" ./backend-services
docker build -t "${DOCKERHUB_USER}/frontend:${TAG}" ./frontend_fixed

docker push "${DOCKERHUB_USER}/auth-service:${TAG}"
docker push "${DOCKERHUB_USER}/task-service:${TAG}"
docker push "${DOCKERHUB_USER}/notification-service:${TAG}"
docker push "${DOCKERHUB_USER}/api-gateway:${TAG}"
docker push "${DOCKERHUB_USER}/frontend:${TAG}"

echo ""
echo "Done. Now update the 'image:' lines in k8s/*.yaml, e.g.:"
echo "  sed -i \"s|YOURUSER|${DOCKERHUB_USER}|g\" k8s/*.yaml"
