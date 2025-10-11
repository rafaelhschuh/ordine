# Ordine – Sistema de Chamadas de Senhas

Uma plataforma completa para gerenciamento de senhas com backend em Node.js e três painéis Vue.js independentes construídos com Vite. Pensado para funcionarem em totens, balcões de atendimento e painéis de TV.

## ✨ Melhorias Implementadas

### Interface Responsiva e Otimizada
- **Layout 100% responsivo**: Todas as telas se adaptam perfeitamente a diferentes tamanhos de dispositivos
- **Sem scroll desnecessário**: Interface otimizada para usar todo o espaço disponível da tela
- **Tipografia Montserrat**: Fonte moderna carregada via Google Fonts para melhor legibilidade
- **Animações sutis**: Transições suaves para mudanças de senha e feedback visual
- **Acessibilidade melhorada**: Suporte a navegação por teclado e redução de movimento

### Painel de Exibição (TV)
- Layout otimizado para telas grandes (TVs e monitores)
- Senha atual em destaque com animações de transição
- Informações de fila organizadas de forma clara
- Responsivo para diferentes orientações e tamanhos

### Painel de Controle (Tablet)
- Interface vertical otimizada para tablets
- Botões grandes e touch-friendly
- Feedback visual durante operações (loading states)
- Layout adaptável para modo paisagem

### Totem de Emissão
- Interface touch otimizada para interação do usuário
- Botões grandes e acessíveis
- Feedback imediato após emissão de senha
- Layout de impressão otimizado

## Visão geral da arquitetura

- **API central (`backend`, porta 8000)**: expõe endpoints REST e emite eventos em tempo real via WebSocket (Socket.IO) para gerenciar fila, senha atual, histórico e emissão de novas senhas.
- **Painel de exibição (`apps/display-panel`, porta 8001)**: interface estilo TV que mostra a senha atual, próxima senha e histórico recente. Atualização instantânea via WebSocket.
- **Painel de controle (`apps/control-panel`, porta 8002)**: tela em orientação vertical pensada para tablet, com chamadas separadas de senhas **preferenciais** e **gerais**, além de voltar senha, reiniciar fila e ver o status por categoria.
- **Totem de emissão (`apps/ticket-issuer`, porta 8003)**: interface touch-friendly (vertical) para clientes gerarem e imprimir senhas gerais ou preferenciais, com layout dedicado para impressão.

Todos os projetos compartilham a mesma estética: tipografia Montserrat, fundo degradê, cartões de vidro e animações sutis.

## Requisitos

- Node.js 18 ou superior.
- NPM (ou pnpm/yarn, se preferir ajustar os scripts).

## Configuração rápida

1. **Instale dependências**. Você pode fazer isso de duas formas:

   **Opção rápida (utilizando workspaces npm):**

   ```sh
   npm install
   ```

   **Opção manual (projeto por projeto):**

   ```sh
   cd backend && npm install
   cd ../apps/display-panel && npm install
   cd ../control-panel && npm install
   cd ../ticket-issuer && npm install
   ```

2. **Configure variáveis de ambiente**:
   
   Todas as variáveis de ambiente agora estão centralizadas em um único arquivo `.env` na raiz do projeto.

   ```sh
   # Copie o arquivo de exemplo
   cp .env.example .env
   ```

   ### Configuração para Desenvolvimento Local

   Edite o arquivo `.env` para acesso apenas local (localhost):

   ```env
   # Backend - Servidor API
   PORT=8000
   BACKEND_HOST=0.0.0.0
   ALLOWED_ORIGINS=*

   # Frontend - Configuração dos Apps Vue.js
   VITE_API_BASE=http://localhost:8000
   VITE_SOCKET_URL=http://localhost:8000
   VITE_HOST=0.0.0.0

   # Portas dos Painéis Frontend
   VITE_DISPLAY_PORT=8001   # Painel de Display (TV)
   VITE_CONTROL_PORT=8002   # Painel de Controle
   VITE_ISSUER_PORT=8003    # Totem de Emissão
   ```

   ### Configuração para Acesso Remoto (Outros Dispositivos na Rede)

   Para acessar os painéis de outros dispositivos (tablets, TVs, celulares) na mesma rede:

   1. **Descubra o IP da sua máquina**:
      
      **Opção 1 - Use o script helper:**
      ```sh
      chmod +x get-ip.sh
      ./get-ip.sh
      ```

      **Opção 2 - Manualmente:**
      ```sh
      # Linux/Mac
      ip addr show | grep "inet "
      # ou
      hostname -I
      
      # Windows
      ipconfig
      ```
      Exemplo de IP: `192.168.1.100`

   2. **Configure o `.env` com o IP da máquina**:
      ```env
      # Backend
      PORT=8000
      BACKEND_HOST=0.0.0.0
      ALLOWED_ORIGINS=*

      # Frontend - IMPORTANTE: Use o IP da sua máquina
      VITE_API_BASE=http://192.168.1.100:8000
      VITE_SOCKET_URL=http://192.168.1.100:8000
      VITE_HOST=0.0.0.0

      # Portas dos Painéis
      VITE_DISPLAY_PORT=8001
      VITE_CONTROL_PORT=8002
      VITE_ISSUER_PORT=8003
      ```

   3. **Acesse de outros dispositivos**:
      - Painel TV: `http://192.168.1.100:8001`
      - Painel Controle: `http://192.168.1.100:8002`
      - Totem: `http://192.168.1.100:8003`
      - API: `http://192.168.1.100:8000`

   **Nota**: O arquivo `.env` na raiz é compartilhado por todos os apps (backend e frontends). Não é mais necessário criar arquivos `.env` separados em cada subdiretório.

3. **Executando em desenvolvimento**

   **Opção mais fácil - usar o script fornecido:**

   ```sh
   ./start-dev.sh
   ```

   **Ou rodar tudo em paralelo (requer o passo `npm install` na raiz):**

   ```sh
   npm run dev
   ```

   **Ou use terminais separados:**

   ```sh
   # Terminal 1 – API
   cd backend
   npm run dev

   # Terminal 2 – Painel de exibição
   cd ../apps/display-panel
   npm run dev

   # Terminal 3 – Painel de controle
   cd ../control-panel
   npm run dev

   # Terminal 4 – Totem de emissão
   cd ../ticket-issuer
   npm run dev
   ```

   Os serviços ficarão acessíveis em:
   - API: `http://localhost:8000`
   - Painel TV: `http://localhost:8001`
   - Painel controle: `http://localhost:8002`
   - Totem: `http://localhost:8003`

## Endpoints principais da API

| Método | Endpoint                | Descrição |
| ------ | ----------------------- | --------- |
| GET    | `/api/health`           | Healthcheck com uptime. |
| GET    | `/api/tickets/state`    | Estado completo (atual, próxima, fila, histórico). |
| POST   | `/api/tickets`          | Emite nova senha (`service` opcional no `body`). Valores suportados: `Geral` (default) ou `Preferencial`. |
| POST   | `/api/tickets/next`     | Avança para a próxima senha da fila. Envie `{ "category": "preferencial" }` ou `{ "category": "geral" }` para direcionar a chamada. |
| POST   | `/api/tickets/previous` | Retorna para a senha anterior (repondo a atual no início da fila). |
| POST   | `/api/tickets/reset`    | Reinicia completamente a fila. |

Eventos Socket.IO:
- `ticket:update`: enviado a todos os clientes sempre que o estado muda.

## Impressão térmica ESC/POS

- A emissão de novas senhas dispara automaticamente a impressão em uma impressora térmica de rede utilizando a biblioteca [`escpos`](https://www.npmjs.com/package/escpos).
- As configurações ficam todas concentradas no arquivo `backend/src/printer.js`. Lá você ajusta facilmente:
   - `enabled`: habilita/desabilita a impressão sem apagar o código.
   - `connection.ip` e `connection.port`: IP/porta da impressora (padrão `9100`).
   - `options.encoding`: encoding utilizado na impressora (padrão `CP860`).
   - `layout`: textos, separadores e mensagens finais impressas no comprovante.
- Caso prefira controlar via variáveis de ambiente, utilize `PRINTER_ENABLED`, `PRINTER_IP`, `PRINTER_PORT` e `PRINTER_ENCODING` ao iniciar o backend.
- O status da tentativa de impressão é retornado no campo `print` da resposta do endpoint `POST /api/tickets`, permitindo exibir feedback adicional no totem se desejado.

### Tratamento de senhas preferenciais

- As senhas são normalizadas para os tipos `Geral` e `Preferencial`. Valores como `prioritário` ou `p` também são entendidos como preferenciais.
- O endpoint `/api/tickets/next` permite decidir qual categoria chamar primeiro, mantendo o histórico e recolocando a senha atual em caso de retorno.
- A TV exibe próximos chamados por categoria, enquanto o controle dá visibilidade da fila e contadores individuais.

## Boas práticas incluídas

- **UX consistente**: mesma paleta, tipografia e efeitos visuais.
- **Feedbacks visuais**: toasts, indicadores online/offline e mensagens de erro.
- **Acessibilidade**: botões grandes, contraste alto e fluxo claro para usuários.
- **Impressão otimizada**: o totem possui estilos específicos para impressão da senha.

## Troubleshooting - Acesso Remoto

### Não consigo acessar os painéis de outros dispositivos

1. **Verifique se o firewall está bloqueando as portas**:
   ```sh
   # Linux (UFW)
   sudo ufw allow 8000:8003/tcp
   
   # Linux (firewalld)
   sudo firewall-cmd --add-port=8000-8003/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. **Certifique-se de que o `.env` está configurado corretamente**:
   - `BACKEND_HOST=0.0.0.0`
   - `VITE_HOST=0.0.0.0`
   - `VITE_API_BASE` e `VITE_SOCKET_URL` devem usar o IP da máquina (não localhost)

3. **Verifique se todos os dispositivos estão na mesma rede**

4. **Teste a conectividade**:
   ```sh
   # De outro dispositivo, teste se consegue acessar a API
   curl http://SEU_IP:8000/api/health
   ```

5. **Reinicie os serviços** após alterar o `.env`:
   - Pare todos os serviços (Ctrl+C)
   - Execute `npm run dev` novamente

### WebSocket não conecta de outros dispositivos

- Certifique-se de que `VITE_SOCKET_URL` no `.env` usa o IP da máquina, não localhost
- Verifique se `ALLOWED_ORIGINS=*` está configurado no `.env`
- Em produção, configure `ALLOWED_ORIGINS` com os IPs/domínios específicos por segurança

## Próximos passos sugeridos

- Persistência em banco de dados ou Redis para ambientes multi-instância.
- Autenticação básica no painel de controle.
- Suporte a múltiplas filas ou guichês simultâneos.
- Deploy usando Docker Compose para orquestrar os quatro serviços.

## Licença

Este projeto é distribuído sob a licença MIT. Personalize conforme as necessidades da sua operação.
