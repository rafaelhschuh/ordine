#!/bin/bash

# Script para iniciar o sistema Ordine com Docker
# Uso: ./docker/start.sh [opções]

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sistema Ordine - Docker Start     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verifica se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker não encontrado. Por favor, instale o Docker primeiro.${NC}"
    exit 1
fi

# Verifica se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose não encontrado. Por favor, instale o Docker Compose primeiro.${NC}"
    exit 1
fi

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Verifica se o arquivo .env existe
if [ ! -f "docker/.env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo docker/.env não encontrado!${NC}"
    echo -e "${YELLOW}   Criando a partir do exemplo...${NC}"
    cp docker/.env.example docker/.env 2>/dev/null || true
fi

# Opções
BUILD_FLAG=""
DETACHED_FLAG=""
COMPOSE_FILE="docker/docker-compose.yml"

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            BUILD_FLAG="--build"
            COMPOSE_FILE="docker/docker-compose.build.yml"
            shift
            ;;
        --detach|-d)
            DETACHED_FLAG="-d"
            shift
            ;;
        --dev)
            COMPOSE_FILE="docker/docker-compose.build.yml"
            shift
            ;;
        --help|-h)
            echo "Uso: ./docker/start.sh [opções]"
            echo ""
            echo "Opções:"
            echo "  -b, --build    Usa docker-compose.build.yml e reconstrói as imagens"
            echo "  --dev          Usa docker-compose.build.yml (desenvolvimento com volumes)"
            echo "  -d, --detach   Executa em background (modo detached)"
            echo "  -h, --help     Mostra esta mensagem de ajuda"
            echo ""
            echo "Exemplos:"
            echo "  ./docker/start.sh              # Inicia com imagens do Docker Hub"
            echo "  ./docker/start.sh --dev        # Inicia em modo desenvolvimento"
            echo "  ./docker/start.sh --build      # Reconstrói e inicia"
            echo "  ./docker/start.sh -d           # Inicia em background"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}⚠️  Opção desconhecida: $1${NC}"
            echo "Use --help para ver as opções disponíveis"
            exit 1
            ;;
    esac
done

if [ "$COMPOSE_FILE" = "docker/docker-compose.build.yml" ]; then
    echo -e "${YELLOW}🔧 Modo: Desenvolvimento (com volumes)${NC}"
else
    echo -e "${GREEN}🚀 Modo: Produção (imagens do Docker Hub)${NC}"
fi

echo -e "${GREEN}🚀 Iniciando containers...${NC}"
echo ""

# Executa docker-compose
docker-compose -f "$COMPOSE_FILE" --env-file docker/.env up $BUILD_FLAG $DETACHED_FLAG

if [ -n "$DETACHED_FLAG" ]; then
    echo ""
    echo -e "${GREEN}✅ Containers iniciados em background!${NC}"
    echo ""
    echo -e "${BLUE}📡 Acesse os serviços:${NC}"
    echo "   Backend:       http://localhost:8000"
    echo "   Display Panel: http://localhost:8001"
    echo "   Control Panel: http://localhost:8002"
    echo "   Ticket Issuer: http://localhost:8003"
    echo ""
    echo -e "${BLUE}📋 Comandos úteis:${NC}"
    echo "   Ver logs:      docker-compose -f $COMPOSE_FILE logs -f"
    echo "   Parar:         docker-compose -f $COMPOSE_FILE down"
    echo "   Reiniciar:     docker-compose -f $COMPOSE_FILE restart"
fi
