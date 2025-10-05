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
   * Layout de impressão. Modifique os textos conforme a identidade visual do seu ponto de atendimento.
   */
  layout: {
    brand: 'ORDINE',
    tagline: 'Gestão inteligente de senhas',
    separatorChar: '─',
    thankYou: 'Obrigado pela preferência!',
    infoLines: [
      'Apresente esta senha ao ser chamado.',
      'Preferenciais: gestantes, idosos, PCD e demais prioridades legais.',
    ],
  },
};

const repeatChar = (char = '─', length = 32) => char.repeat(Math.max(length, 0));

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

const applyLayout = (printer, ticket, profile) => {
  const { layout } = profile;
  const separator = repeatChar(layout.separatorChar ?? '─');

  printer
    .align('ct')
    .style('B')
    .size(2, 2)
    .text(layout.brand ?? '')
    .style('NORMAL')
    .size(1, 1);

  if (layout.tagline) {
    printer.text(layout.tagline);
  }

  printer.text(separator);

  printer
    .align('ct')
    .style('B')
    .size(1, 1)
    .text('SENHA')
    .size(2, 2)
    .text(ticket.code)
    .style('NORMAL')
    .size(1, 1)
    .text(ticket.service.toUpperCase());

  printer.text(separator);

  printer
    .align('lt')
    .text(`Emitida: ${formatIssuedAt(ticket.issuedAt)}`)
    .text(`Tipo: ${ticket.service}`)
    .text(`Número interno: ${ticket.number}`)
    .text(separator);

  if (Array.isArray(layout.infoLines)) {
    layout.infoLines.forEach((line) => {
      if (line) printer.text(line);
    });
  }

  if (layout.thankYou) {
    printer
      .text(separator)
      .align('ct')
      .style('B')
      .text(layout.thankYou)
      .style('NORMAL');
  }

  printer
    .align('ct')
    .style('NORMAL')
    .text('Aguarde a chamada no painel.')
    .feed(4)
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
