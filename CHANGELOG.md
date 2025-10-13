# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.1.0] - 2025-10-11

### ✨ Adicionado
- **Sistema de numeração separada**: Senhas Preferenciais (P001, P002...) e Gerais (G001, G002...) agora têm contadores independentes
- **Contadores individuais**: API retorna `issuedCountGeral` e `issuedCountPreferencial` separadamente
- **Documentação completa**: README atualizado com screenshots, badges, exemplos de API e troubleshooting
- **Script helper**: `get-ip.sh` para descobrir automaticamente o IP da máquina
- **Arquivo LICENSE**: Licença MIT adicionada ao projeto
- **CHANGELOG**: Histórico de mudanças do projeto

### 🔄 Modificado
- **Backend**: Estrutura `queueState` agora mantém `counterGeral` e `counterPreferencial` separados
- **Função `createTicket`**: Atualizada para usar contadores específicos por tipo de senha
- **Função `buildState`**: Retorna contadores separados além do total
- **Endpoint `/api/tickets/reset`**: Reseta ambos os contadores independentemente
- **ID das senhas**: Agora usa o código completo (P001, G001) como identificador único

### 🐛 Corrigido
- Vulnerabilidades de segurança do npm (0 vulnerabilidades)
- Conflitos de versão entre Vite 7 e @vitejs/plugin-vue
- Problemas com dependências opcionais do Rollup

### 📚 Documentação
- README completamente reformulado com:
  - Badges de tecnologias e licença
  - Screenshots de todos os painéis
  - Diagramas de arquitetura
  - Exemplos completos de uso da API
  - Guia de troubleshooting expandido
  - Seção de melhores práticas
  - Roadmap de funcionalidades futuras

## [1.0.0] - 2025-10-10

### ✨ Adicionado
- **Sistema inicial de gerenciamento de senhas**
- **Backend em Node.js** com Express e Socket.IO
- **Três painéis Vue.js**:
  - Display Panel (porta 8001) - Painel de TV
  - Control Panel (porta 8002) - Painel de controle
  - Ticket Issuer (porta 8003) - Totem de emissão
- **Suporte a WebSocket** para atualizações em tempo real
- **Integração com impressoras térmicas ESC/POS**
- **Sistema de filas** com suporte a senhas preferenciais e gerais
- **Configuração centralizada** via arquivo `.env` na raiz
- **Interface responsiva** com design moderno
- **Suporte a acesso remoto** via rede local

### 🎨 Design
- Tipografia Montserrat
- Fundos degradê
- Cartões de vidro (glassmorphism)
- Animações sutis e transições suaves
- Alto contraste para melhor legibilidade
- Botões grandes e touch-friendly

### 🔧 Funcionalidades
- Emissão de senhas via totem
- Chamada de senhas com priorização
- Histórico de senhas chamadas
- Reset completo da fila
- Retorno para senha anterior
- Impressão automática de comprovantes
- Visualização em tempo real do estado da fila

---

## Tipos de Mudanças

- `✨ Adicionado` - Novas funcionalidades
- `🔄 Modificado` - Mudanças em funcionalidades existentes
- `❌ Removido` - Funcionalidades removidas
- `🐛 Corrigido` - Correção de bugs
- `🔒 Segurança` - Vulnerabilidades corrigidas
- `📚 Documentação` - Mudanças na documentação
- `🎨 Design` - Mudanças visuais
- `⚡ Performance` - Melhorias de performance
- `♻️ Refatoração` - Refatoração de código
