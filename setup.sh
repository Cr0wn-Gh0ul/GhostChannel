#!/bin/bash

# GhostChannel Setup Script
# This script helps you set up the development environment

set -e

echo "🔒 GhostChannel Setup Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo -n "Checking Docker installation... "
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC}"
    echo "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check if Docker Compose is installed
echo -n "Checking Docker Compose installation... "
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗${NC}"
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check if Node.js is installed (optional for local development)
echo -n "Checking Node.js installation... "
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}"
    echo "Node.js is not installed. You can still use Docker, but local development won't work."
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} ($NODE_VERSION)"
fi

echo ""
echo "Setting up environment files..."

# Setup backend .env
if [ ! -f backend/.env ]; then
    echo -n "Creating backend/.env... "
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} backend/.env already exists, skipping"
fi

# Setup frontend .env
if [ ! -f frontend/.env ]; then
    echo -n "Creating frontend/.env... "
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} frontend/.env already exists, skipping"
fi

echo ""
echo "Installing dependencies..."

# Install backend dependencies
if [ -d backend ]; then
    echo "Installing backend dependencies..."
    if command -v node &> /dev/null; then
        (cd backend && npm install --legacy-peer-deps) || echo -e "${RED}✗${NC} Failed to install backend dependencies"
    else
        echo -e "${YELLOW}⚠${NC} Skipped - Node.js not found"
    fi
fi

# Install frontend dependencies
if [ -d frontend ]; then
    echo "Installing frontend dependencies..."
    if command -v node &> /dev/null; then
        (cd frontend && npm install) || echo -e "${RED}✗${NC} Failed to install frontend dependencies"
    else
        echo -e "${YELLOW}⚠${NC} Skipped - Node.js not found"
    fi
fi

echo ""
echo "Environment files are ready!"
echo ""
echo "⚠️  IMPORTANT: Please update the following in backend/.env:"
echo "   - JWT_SECRET (use a strong random string)"
echo "   - DB_PASSWORD (if deploying to production)"
echo ""

# Ask user how they want to run the project
echo "How would you like to run the project?"
echo "1) Full Docker setup (all services in containers)"
echo "2) Local development (only DB/Redis in Docker, run backend/frontend locally)"
echo "3) Skip for now (just setup, don't start services)"
echo ""
read -p "Enter choice [1-3]: " -n 1 -r
echo ""

if [[ $REPLY == "1" ]]; then
    echo ""
    echo "Starting all services with Docker Compose..."
    echo "This may take a few minutes on first run..."
    echo ""
    
    sudo docker compose up --build -d
    
    echo ""
    echo -e "${GREEN}✓${NC} Services started successfully!"
    echo ""
    echo "Services are running:"
    echo "  - Frontend:  http://localhost:5173"
    echo "  - Backend:   http://localhost:3000"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis:      localhost:6379"
    echo ""
    echo "View logs with: docker compose logs -f"
    echo "Stop services with: docker compose down"
    echo ""
    echo "Next steps:"
    echo "1. Visit http://localhost:5173"
    echo "2. Register a new account"
    echo "3. Start chatting!"
elif [[ $REPLY == "2" ]]; then
    echo ""
    echo "Starting PostgreSQL and Redis with Docker..."
    echo ""
    
    # Check if containers are already running
    if sudo docker compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        echo -e "${YELLOW}⚠${NC} Docker containers are already running. Resetting..."
        echo ""
        
        echo "Stopping existing containers..."
        sudo docker compose -f docker-compose.dev.yml down
        
        echo "Removing volumes to reset data..."
        sudo docker volume rm ghostchannel_postgres_data 2>/dev/null || true
        sudo docker volume rm ghostchannel_redis_data 2>/dev/null || true
        
        echo "Pruning unused images..."
        sudo docker image prune -f
        
        echo ""
    fi
    
    echo "Starting fresh containers..."
    sudo docker compose -f docker-compose.dev.yml up -d
    
    echo ""
    echo "Waiting for database to be ready..."
    sleep 5
    
    echo "Pushing database schema..."
    (cd backend && npx prisma db push) || echo -e "${RED}✗${NC} Failed to push schema"
    
    echo "Seeding database with test accounts..."
    (cd backend && npx prisma db seed) || echo -e "${RED}✗${NC} Failed to seed database"
    
    echo ""
    echo -e "${GREEN}✓${NC} Database services started successfully!"
    echo ""
    echo "Services running:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis:      localhost:6379"
    echo ""
    echo "Test accounts created:"
    echo "  - User 1: test1@test.com / test123?"
    echo "  - User 2: test2@test.com / test123?"
    echo ""
    echo "Now start the backend and frontend locally:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd backend"
    echo "  npm run start:dev"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd frontend"
    echo "  npm run dev"
    echo ""
    echo "Stop database services with: docker compose -f docker-compose.dev.yml down"
else
    echo ""
    echo "Setup complete! When you're ready to start, run:"
    echo ""
    echo "For full Docker setup:"
    echo "  docker compose up --build"
    echo ""
    echo "For local development (DB/Redis only):"
    echo "  docker compose -f docker-compose.dev.yml up -d"
    echo "  cd backend && npm run start:dev"
    echo "  cd frontend && npm run dev"
    echo ""
fi

echo ""
echo "📚 For more information, see:"
echo "   - README.md for project overview"
echo "   - DEVELOPMENT.md for development guide"
echo "   - SECURITY.md for security considerations"
echo ""
echo "Happy coding! 🚀"
