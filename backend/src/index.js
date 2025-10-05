const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { printTicket } = require('./printer');

const PORT = Number(process.env.PORT) || 8000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS
  || 'http://localhost:8001,http://localhost:8002,http://localhost:8003,http://127.0.0.1:8001,http://127.0.0.1:8002,http://127.0.0.1:8003')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

const queueState = {
  counter: 0,
  currentTicket: null,
  queue: [],
  history: [],
};

const SERVICE_TYPES = {
  GERAL: 'Geral',
  PREFERENCIAL: 'Preferencial',
};

const SERVICE_KEYS = {
  [SERVICE_TYPES.GERAL]: 'geral',
  [SERVICE_TYPES.PREFERENCIAL]: 'preferencial',
};

const MAX_HISTORY = 50;

const normalizeService = (input = SERVICE_TYPES.GERAL) => {
  const value = String(input).trim().toLowerCase();

  if ([
    'preferencial',
    'preferencia',
    'preferência',
    'prioritario',
    'prioritário',
    'prioridade',
    'p',
  ].includes(value)) {
    return SERVICE_TYPES.PREFERENCIAL;
  }

  return SERVICE_TYPES.GERAL;
};

const summarizeQueue = () => {
  return queueState.queue.reduce(
    (acc, ticket) => {
      const key = SERVICE_KEYS[ticket.service] ?? 'geral';
      acc.byType[key] = (acc.byType[key] ?? 0) + 1;
      if (ticket.type === 'preferencial' && acc.nextPreferencial === null) {
        acc.nextPreferencial = ticket;
      }
      if (ticket.type === 'geral' && acc.nextGeral === null) {
        acc.nextGeral = ticket;
      }
      return acc;
    },
    {
      byType: {
        geral: 0,
        preferencial: 0,
      },
      nextPreferencial: null,
      nextGeral: null,
    },
  );
};

const buildState = () => {
  const summary = summarizeQueue();
  const nextTicket = queueState.queue[0] ?? null;

  return {
    currentTicket: queueState.currentTicket,
    nextTicket,
    nextPreferencial: summary.nextPreferencial,
    nextGeral: summary.nextGeral,
    queue: queueState.queue,
    queueLength: queueState.queue.length,
    queueByType: summary.byType,
    history: queueState.history.slice(-MAX_HISTORY),
    issuedCount: queueState.counter,
    updatedAt: new Date().toISOString(),
  };
};

const emitState = () => {
  io.emit('ticket:update', buildState());
};

const createTicket = (serviceInput = SERVICE_TYPES.GERAL) => {
  const service = normalizeService(serviceInput);
  const type = SERVICE_KEYS[service] ?? 'geral';

  queueState.counter += 1;
  const number = queueState.counter;
  const paddedNumber = number.toString().padStart(3, '0');
  const prefix = type === 'preferencial' ? 'P' : 'G';

  return {
    id: number,
    code: `${prefix}${paddedNumber}`,
    number,
    service,
    type,
    issuedAt: new Date().toISOString(),
  };
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/tickets/state', (req, res) => {
  res.json(buildState());
});

app.post('/api/tickets', async (req, res) => {
  const { service } = req.body || {};
  const ticket = createTicket(service);

  queueState.queue.push(ticket);
  emitState();

  let printResult = { printed: false, reason: 'skipped' };
  try {
    printResult = await printTicket(ticket);
    if (!printResult.printed && printResult.error) {
      // eslint-disable-next-line no-console
      console.error('[printer] Impressão não concluída:', printResult.error.message || printResult.error);
    }
  } catch (error) {
    printResult = { printed: false, error };
    // eslint-disable-next-line no-console
    console.error('[printer] Falha inesperada ao imprimir:', error.message || error);
  }

  res.status(201).json({
    ticket,
    state: buildState(),
    message: 'Senha criada e adicionada à fila.',
    print: printResult,
  });
});

const extractNextTicket = (category = 'automatic') => {
  if (queueState.queue.length === 0) {
    return { ticket: null, reason: 'Não há senhas na fila.' };
  }

  const normalizedCategory = String(category).toLowerCase();
  let index = 0;

  if (normalizedCategory === 'preferencial') {
    index = queueState.queue.findIndex((ticket) => ticket.type === 'preferencial');
    if (index === -1) {
      return { ticket: null, reason: 'Não há senhas preferenciais na fila.' };
    }
  } else if (normalizedCategory === 'geral') {
    index = queueState.queue.findIndex((ticket) => ticket.type === 'geral');
    if (index === -1) {
      return { ticket: null, reason: 'Não há senhas gerais na fila.' };
    }
  }

  const [ticket] = queueState.queue.splice(index, 1);
  return { ticket };
};

app.post('/api/tickets/next', (req, res) => {
  const { category } = req.body || {};

  const { ticket, reason } = extractNextTicket(category ?? 'automatic');
  if (!ticket) {
    return res.status(400).json({
      error: reason,
      state: buildState(),
    });
  }

  if (queueState.currentTicket) {
    queueState.history.push(queueState.currentTicket);
    if (queueState.history.length > MAX_HISTORY) {
      queueState.history.shift();
    }
  }

  queueState.currentTicket = ticket;
  emitState();

  return res.json({
    currentTicket: queueState.currentTicket,
    state: buildState(),
    message: 'Avançou para a próxima senha.',
  });
});

app.post('/api/tickets/previous', (req, res) => {
  if (queueState.history.length === 0) {
    return res.status(400).json({
      error: 'Não há senhas anteriores.',
      state: buildState(),
    });
  }

  const previousTicket = queueState.history.pop();

  if (queueState.currentTicket) {
    queueState.queue.unshift(queueState.currentTicket);
  }

  queueState.currentTicket = previousTicket;
  emitState();

  return res.json({
    currentTicket: queueState.currentTicket,
    state: buildState(),
    message: 'Retornou para a senha anterior.',
  });
});

app.post('/api/tickets/reset', (req, res) => {
  queueState.counter = 0;
  queueState.currentTicket = null;
  queueState.queue = [];
  queueState.history = [];
  emitState();

  res.json({
    state: buildState(),
    message: 'Fila reiniciada com sucesso.',
  });
});

io.on('connection', (socket) => {
  socket.emit('ticket:update', buildState());

  socket.on('disconnect', () => {
    // noop - placeholder para futuras auditorias
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor de senhas rodando na porta ${PORT}`);
});
