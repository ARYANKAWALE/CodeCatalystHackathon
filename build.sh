#!/bin/bash
set -e

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Build React frontend
cd ../frontend
npm install
npm run build

# Copy built frontend into backend/static_frontend
rm -rf ../backend/static_frontend
cp -r dist ../backend/static_frontend

echo "Build complete."
