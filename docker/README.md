# Docker - Sistema Ordine

Este diretório contém a configuração Docker para executar o sistema Ordine em containers.

## Estrutura

- `Dockerfile.backend` - Container para o backend (Node.js + Express + Socket.IO)
- `Dockerfile.frontend` - Container para os 3 frontends Vue.js
- `docker-compose.yml` - Produção (usa imagens do Docker Hub)
- `docker-compose.build.yml` - Desenvolvimento (build local com volumes)
- `.env` - Variáveis de ambiente para configuração
- `build-and-push.sh` - Script para build e push ao Docker Hub

## Arquitetura

O sistema é dividido em 2 containers:

1. **Backend Container** (porta 8000)
   - API REST
   - WebSocket Server
   - Gerenciamento de filas

2. **Frontend Container** (portas 8001, 8002, 8003)
   - Display Panel (8001) - Painel de TV
   - Control Panel (8002) - Painel de controle
   - Ticket Issuer (8003) - Totem de emissão

## Como Usar

### 1. Produção (Docker Hub)

Usa as imagens publicadas no Docker Hub (rafaelhschuh/ordine):

```bash
# Iniciar
docker-compose -f docker/docker-compose.yml --env-file docker/.env up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f

# Parar
docker-compose -f docker/docker-compose.yml down
```

### 2. Desenvolvimento (Build Local)

Faz build local e monta volumes para hot reload:

```bash
# Iniciar com build
docker-compose -f docker/docker-compose.build.yml --env-file docker/.env up --build

# Ou usar o script auxiliar
./docker/start.sh --dev

# Em background
./docker/start.sh --dev -d
```

### 3. Build e Push para Docker Hub

Para publicar novas versões no Docker Hub:

```bash
# Tornar o script executável
chmod +x docker/build-and-push.sh

# Build e push com versão específica
./docker/build-and-push.sh v1.0.0

# Build e push como latest
./docker/build-and-push.sh
```

O script irá:
1. Verificar login no Docker Hub
2. Fazer build das imagens backend e frontend
3. Criar tags com versão e latest
4. Fazer push para rafaelhschuh/ordine

## Acesso na Rede Local

1. Descubra o IP da sua máquina:
   ```bash
   # Linux/Mac
   ip addr show | grep "inet "
   # ou
   ifconfig
   ```

2. Edite `docker/.env`:
   ```env
   VITE_API_BASE=http://192.168.1.100:8000
   VITE_SOCKET_URL=http://192.168.1.100:8000
   ```

3. Execute os containers:
   ```bash
   docker-compose -f docker/docker-compose.yml --env-file docker/.env up -d
   ```

4. Acesse de outros dispositivos na rede:
   - Display Panel: http://192.168.1.100:8001
   - Control Panel: http://192.168.1.100:8002
   - Ticket Issuer: http://192.168.1.100:8003

## Scripts Auxiliares

### start.sh
```bash
./docker/start.sh              # Produção (Docker Hub)
./docker/start.sh --dev        # Desenvolvimento (build local)
./docker/start.sh -d           # Background
./docker/start.sh --build      # Rebuild e inicia
```

### stop.sh
```bash
./docker/stop.sh               # Para os containers
./docker/stop.sh -v            # Para e remove volumes
```

### logs.sh
```bash
./docker/logs.sh               # Todos os logs
./docker/logs.sh backend       # Logs do backend
./docker/logs.sh frontend      # Logs do frontend
```

### build-and-push.sh
```bash
./docker/build-and-push.sh           # Build e push como latest
./docker/build-and-push.sh v1.0.0    # Build e push com versão
```

## Variáveis de Ambiente

Todas as configurações estão no arquivo `docker/.env`:

- `BACKEND_PORT` - Porta do backend (padrão: 8000)
- `DISPLAY_PORT` - Porta do display panel (padrão: 8001)
- `CONTROL_PORT` - Porta do control panel (padrão: 8002)
- `ISSUER_PORT` - Porta do ticket issuer (padrão: 8003)
- `ALLOWED_ORIGINS` - CORS origins permitidas
- `VITE_API_BASE` - URL da API para os frontends
- `VITE_SOCKET_URL` - URL do WebSocket

## Docker Hub

Imagens publicadas em: https://hub.docker.com/r/rafaelhschuh/ordine

Tags disponíveis:
- `rafaelhschuh/ordine:backend-latest`
- `rafaelhschuh/ordine:frontend-latest`
- `rafaelhschuh/ordine:backend-v1.0.0` (exemplo)
- `rafaelhschuh/ordine:frontend-v1.0.0` (exemplo)

## Troubleshooting

### Containers não iniciam
```bash
docker-compose -f docker/docker-compose.yml logs
```

### Porta já em uso
Altere as portas no arquivo `docker/.env`

### Frontend não conecta ao backend
Verifique se `VITE_API_BASE` e `VITE_SOCKET_URL` estão corretos no `docker/.env`

### Erro ao fazer push
Faça login no Docker Hub:
```bash
docker login
```

### Imagens não atualizam
Force o pull das imagens:
```bash
docker-compose -f docker/docker-compose.yml pull
docker-compose -f docker/docker-compose.yml up -d
```
