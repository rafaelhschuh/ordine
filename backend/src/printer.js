const escpos = require('escpos');
escpos.Network = require('escpos-network');

const PRINTER_PROFILE = {
  /**
   * Defina como "false" se quiser desligar a impressão sem remover o código.
   */
  enabled: process.env.PRINTER_ENABLED !== 'false',
  /**
   * Configurações de conexão da impressora térmica de rede.
   * Ajuste os valores abaixo conforme o IP/porta da impressora.
   */
  connection: {
    ip: process.env.PRINTER_IP || '127.0.0.1',
    port: Number(process.env.PRINTER_PORT) || 9100,
  },
  /**
   * Ajustes da biblioteca escpos. Consulte a documentação para outros encodings.
   */
  options: {
    encoding: process.env.PRINTER_ENCODING || 'CP860',
  },
  /**
   * Layout de impressão simples para 58mm.
   */
  layout: {
    brand: 'ORDINE',
  },
};

// Largura otimizada para impressoras de 58mm (aproximadamente 32 caracteres)
const TICKET_WIDTH = 32;

const repeatChar = (char = '─', length = TICKET_WIDTH) => char.repeat(Math.max(length, 0));

const formatIssuedAt = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const centerText = (text, width = TICKET_WIDTH) => {
  const padding = Math.max(0, width - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
};

const centerTextInBox = (text, totalWidth = TICKET_WIDTH) => {
  // Para caixas com bordas, usamos totalWidth - 2 (bordas esquerda e direita)
  const innerWidth = totalWidth - 2;
  const padding = Math.max(0, innerWidth - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
};

const createBox = (char = '═') => repeatChar(char);
const createDoubleLine = () => repeatChar('═');
const createSingleLine = () => repeatChar('─');

const applyLayout = (printer, ticket, profile) => {
  const { layout } = profile;
  const separator = createSingleLine();

  // Cabeçalho simples
  printer
    .feed(1)
    .align('ct')
    .style('B')
    .size(1, 2)
    .text(layout.brand ?? 'ORDINE')
    .style('NORMAL')
    .size(1, 1)
    .text(separator)
    .feed(1);

  // Senha - destaque principal
  printer
    .align('ct')
    .style('B')
    .size(1, 1)
    .text('SENHA')
    .size(3, 3)
    .text(ticket.code)
    .size(1, 1)
    .style('NORMAL')
    .text(ticket.service.toUpperCase())
    .feed(1);

  // Rodapé simples
  printer
    .text(separator)
    .align('ct')
    .text('Aguarde ser chamado')
    .text(formatIssuedAt(ticket.issuedAt))
    .feed(1)
    .text(separator)
    .feed(3)
    .cut();
};

const printTicket = (ticket, overrides = {}) => {
  const profile = {
    ...PRINTER_PROFILE,
    ...overrides,
    connection: {
      ...PRINTER_PROFILE.connection,
      ...(overrides.connection || {}),
    },
    options: {
      ...PRINTER_PROFILE.options,
      ...(overrides.options || {}),
    },
    layout: {
      ...PRINTER_PROFILE.layout,
      ...(overrides.layout || {}),
      infoLines: overrides.layout?.infoLines || PRINTER_PROFILE.layout.infoLines,
    },
  };

  if (!profile.enabled) {
    return Promise.resolve({ printed: false, reason: 'disabled' });
  }

  return new Promise((resolve) => {
    const device = new escpos.Network(profile.connection.ip, profile.connection.port);
    const printer = new escpos.Printer(device, profile.options);

    device.open((error) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[printer] Falha ao conectar na impressora:', error.message || error);
        return resolve({ printed: false, error });
      }

      try {
  applyLayout(printer, ticket, profile);
  printer.close();
  resolve({ printed: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[printer] Erro ao enviar dados para impressão:', err.message || err);
        try {
          printer.close();
        } catch (closeError) {
          // eslint-disable-next-line no-console
          console.error('[printer] Falha ao fechar conexão:', closeError.message || closeError);
        }
        resolve({ printed: false, error: err });
      }
    });
  });
};

module.exports = {
  printTicket,
  PRINTER_PROFILE,
};
