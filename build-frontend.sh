#!/bin/bash
# Build frontend and copy to Spring Boot static resources

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
STATIC_DIR="$SCRIPT_DIR/src/main/resources/static"

echo "Building frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

echo "Copying build to static resources..."
rm -rf "$STATIC_DIR"
cp -r "$FRONTEND_DIR/build" "$STATIC_DIR"

echo "Frontend build complete!"
echo "Static files are in: $STATIC_DIR"
