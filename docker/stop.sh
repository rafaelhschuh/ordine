#!/bin/bash

# Script para parar o sistema Ordine com Docker
# Uso: ./docker/stop.sh [opções]

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sistema Ordine - Docker Stop      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Opções
REMOVE_VOLUMES=""

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --volumes|-v)
            REMOVE_VOLUMES="-v"
            shift
            ;;
        --help|-h)
            echo "Uso: ./docker/stop.sh [opções]"
            echo ""
            echo "Opções:"
            echo "  -v, --volumes  Remove também os volumes (dados persistentes)"
            echo "  -h, --help     Mostra esta mensagem de ajuda"
            echo ""
            echo "Exemplos:"
            echo "  ./docker/stop.sh           # Para os containers"
            echo "  ./docker/stop.sh -v        # Para e remove volumes"
            exit 0
            ;;
        *)
            echo -e "${RED}⚠️  Opção desconhecida: $1${NC}"
            echo "Use --help para ver as opções disponíveis"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🛑 Parando containers...${NC}"
echo ""

# Para os containers
docker-compose -f docker/docker-compose.yml down $REMOVE_VOLUMES

echo ""
echo -e "${GREEN}✅ Containers parados com sucesso!${NC}"

if [ -n "$REMOVE_VOLUMES" ]; then
    echo -e "${GREEN}✅ Volumes removidos!${NC}"
fi
