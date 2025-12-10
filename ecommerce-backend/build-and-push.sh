#!/usr/bin/env nix-shell
#!nix-shell -i bash -p buildah skopeo nodejs pnpm

set -e

IMAGE="docker.io/dockerstefn/chobble-template-ecommerce-backend"
TAG="${1:-$(date +%Y%m%d-%H%M%S)}"

cd "$(dirname "$0")"

echo "Running tests..."
pnpm install --silent
pnpm test
echo ""

echo "Building image with tag: $TAG"
buildah bud -t "$IMAGE:$TAG" -t "$IMAGE:latest" .

echo "Logging in to Docker Hub..."
buildah login docker.io

echo "Pushing images..."
buildah push "$IMAGE:$TAG"
buildah push "$IMAGE:latest"

echo "Done: $IMAGE:$TAG and $IMAGE:latest"
