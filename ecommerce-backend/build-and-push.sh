#!/usr/bin/env nix-shell
#!nix-shell -i bash -p buildah skopeo

set -e

IMAGE="docker.io/dockerstefn/chobble-template-ecommerce-backend"

cd "$(dirname "$0")"

echo "Building image..."
buildah bud -t "$IMAGE" .

echo "Logging in to Docker Hub..."
buildah login docker.io

echo "Pushing image..."
buildah push "$IMAGE"

echo "Done: $IMAGE"
