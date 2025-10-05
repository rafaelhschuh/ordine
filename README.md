# Ordine – Sistema de Chamadas de Senhas

Uma plataforma completa para gerenciamento de senhas com backend em Node.js e três painéis Vue.js independentes construídos com Vite. Pensado para funcionarem em totens, balcões de atendimento e painéis de TV.

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

2. **Configure variáveis de ambiente** (opcional):
   - Copie os arquivos `.env.example` para `.env` em cada painel/frontend ajustando `VITE_API_BASE` se a API estiver em outro host.
   - Para a API, utilize variáveis de ambiente padrão (`PORT` e `ALLOWED_ORIGINS`) caso precise customizar portas/domínios.

3. **Executando em desenvolvimento**

   **Rodar tudo em paralelo (requer o passo `npm install` na raiz):**

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

## Próximos passos sugeridos

- Persistência em banco de dados ou Redis para ambientes multi-instância.
- Autenticação básica no painel de controle.
- Suporte a múltiplas filas ou guichês simultâneos.
- Deploy usando Docker Compose para orquestrar os quatro serviços.

## Licença

Este projeto é distribuído sob a licença MIT. Personalize conforme as necessidades da sua operação.
