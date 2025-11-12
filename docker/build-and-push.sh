#!/bin/bash

# Script para fazer build e push das imagens Docker para o Docker Hub
# Uso: ./docker/build-and-push.sh [versão]

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Ordine - Build & Push Docker Hub    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Configurações
DOCKER_USERNAME="rafaelhschuh"
DOCKER_REPO="ordine"
VERSION="${1:-latest}"

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Verifica se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Por favor, instale o Docker primeiro.${NC}"
    exit 1
fi

# Verifica se está logado no Docker Hub
echo -e "${BLUE}🔐 Verificando login no Docker Hub...${NC}"
if ! docker info | grep -q "Username: $DOCKER_USERNAME"; then
    echo -e "${YELLOW}⚠️  Você não está logado no Docker Hub.${NC}"
    echo -e "${YELLOW}   Fazendo login...${NC}"
    docker login
fi

echo -e "${GREEN}✅ Login verificado!${NC}"
echo ""

# Build das imagens
echo -e "${BLUE}🔨 Construindo imagens Docker...${NC}"
echo ""

echo -e "${YELLOW}📦 Building backend...${NC}"
docker build -f docker/Dockerfile.backend -t ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-${VERSION} .
docker tag ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-${VERSION} ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-latest

echo ""
echo -e "${YELLOW}📦 Building frontend...${NC}"
docker build -f docker/Dockerfile.frontend -t ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-${VERSION} .
docker tag ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-${VERSION} ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-latest

echo ""
echo -e "${GREEN}✅ Build concluído!${NC}"
echo ""

# Push das imagens
echo -e "${BLUE}🚀 Enviando imagens para o Docker Hub...${NC}"
echo ""

echo -e "${YELLOW}📤 Pushing backend:${VERSION}...${NC}"
docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-${VERSION}
docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-latest

echo ""
echo -e "${YELLOW}📤 Pushing frontend:${VERSION}...${NC}"
docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-${VERSION}
docker push ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-latest

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Sucesso!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📦 Imagens publicadas:${NC}"
echo "   ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-${VERSION}"
echo "   ${DOCKER_USERNAME}/${DOCKER_REPO}:backend-latest"
echo "   ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-${VERSION}"
echo "   ${DOCKER_USERNAME}/${DOCKER_REPO}:frontend-latest"
echo ""
echo -e "${BLUE}🎯 Para usar em produção:${NC}"
echo "   docker-compose -f docker/docker-compose.yml --env-file docker/.env up -d"
echo ""
echo -e "${BLUE}🔗 Docker Hub:${NC}"
echo "   https://hub.docker.com/r/${DOCKER_USERNAME}/${DOCKER_REPO}"
