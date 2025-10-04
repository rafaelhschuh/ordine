<template>
  <div class="wrapper">
    <header class="header">
      <div class="brand">Ordine</div>
      <div class="tagline">Organize o fluxo sem esforço</div>
      <div class="status-pill" :class="{ online: isOnline }">
        <span class="dot" />
        <span>{{ isOnline ? 'Conectado à central' : 'Reconectando…' }}</span>
      </div>
    </header>

    <main class="content">
      <section class="current-card glass">
        <span class="eyebrow">Senha atual</span>
        <h1 class="ticket-code">{{ currentTicket?.code ?? '--' }}</h1>
        <p class="service">{{ currentTicket?.service ?? 'Aguardando chamada' }}</p>
        <div class="meta">
          <span>Emitida às {{ formatTime(currentTicket?.issuedAt) }}</span>
          <span>Chamadas hoje: {{ issuedCount }}</span>
        </div>
      </section>

      <section class="next-card glass">
        <div class="next-columns">
          <div class="next-block preferencial">
            <span class="eyebrow">Próxima preferencial</span>
            <h2>{{ nextPreferencial?.code ?? '—' }}</h2>
            <p>{{ nextPreferencial?.service ?? 'Nenhuma na fila' }}</p>
          </div>
          <div class="next-block geral">
            <span class="eyebrow">Próxima geral</span>
            <h2>{{ nextGeral?.code ?? '—' }}</h2>
            <p>{{ nextGeral?.service ?? 'Nenhuma na fila' }}</p>
          </div>
        </div>
        <div class="queue-info">
          <span>Fila atual</span>
          <strong>{{ queueLength }}</strong>
          <span class="muted">senhas aguardando</span>
          <div class="queue-breakdown">
            <span><strong>{{ queueByType.preferencial }}</strong> preferenciais</span>
            <span><strong>{{ queueByType.geral }}</strong> gerais</span>
          </div>
        </div>
      </section>

      <section class="history glass">
        <header>
          <span class="eyebrow">Últimas senhas</span>
          <time>{{ now }}</time>
        </header>
        <ul>
          <li v-for="item in limitedHistory" :key="item.id">
            <span class="code">{{ item.code }}</span>
            <span class="service">{{ item.service }}</span>
            <span class="time">{{ formatTime(item.issuedAt) }}</span>
          </li>
          <li v-if="!limitedHistory.length" class="empty">Nenhuma senha atendida ainda.</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? API_BASE;

const state = reactive({
  currentTicket: null,
  nextTicket: null,
  nextPreferencial: null,
  nextGeral: null,
  queueLength: 0,
  queueByType: {
    geral: 0,
    preferencial: 0,
  },
  history: [],
  issuedCount: 0,
});

const now = ref(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
let timer;
let socket;

const isOnline = ref(false);

const limitedHistory = computed(() => state.history.slice().reverse().slice(0, 6));

const formatTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const syncState = (payload) => {
  state.currentTicket = payload.currentTicket ?? null;
  state.nextTicket = payload.nextTicket ?? null;
  state.nextPreferencial = payload.nextPreferencial ?? null;
  state.nextGeral = payload.nextGeral ?? null;
  state.queueLength = payload.queueLength ?? 0;
  state.queueByType = payload.queueByType
    ? {
        geral: payload.queueByType.geral ?? 0,
        preferencial: payload.queueByType.preferencial ?? 0,
      }
    : { geral: 0, preferencial: 0 };
  state.history = payload.history ?? [];
  state.issuedCount = payload.issuedCount ?? 0;
};

const fetchState = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/tickets/state`);
    if (!response.ok) throw new Error('Falha ao buscar estado');
    const data = await response.json();
    syncState(data);
    isOnline.value = true;
  } catch (error) {
    console.error(error);
    isOnline.value = false;
  }
};

onMounted(async () => {
  await fetchState();

  socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    isOnline.value = true;
  });

  socket.on('disconnect', () => {
    isOnline.value = false;
  });

  socket.on('ticket:update', (payload) => {
    syncState(payload);
  });

  timer = setInterval(() => {
    now.value = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, 1000 * 30);
});

onUnmounted(() => {
  if (socket) socket.disconnect();
  clearInterval(timer);
});

const currentTicket = computed(() => state.currentTicket);
const nextTicket = computed(() => state.nextTicket);
const queueLength = computed(() => state.queueLength);
const issuedCount = computed(() => state.issuedCount);
const queueByType = computed(() => state.queueByType ?? { geral: 0, preferencial: 0 });
const nextPreferencial = computed(() => state.nextPreferencial);
const nextGeral = computed(() => state.nextGeral);
</script>

<style scoped>
.wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 48px clamp(24px, 4vw, 72px);
  gap: 32px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand {
  font-size: clamp(28px, 5vw, 56px);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.tagline {
  font-size: clamp(16px, 3vw, 22px);
  color: var(--text-muted);
  max-width: 560px;
}

.status-pill {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: background 0.3s ease;
}

.status-pill.online {
  background: rgba(99, 230, 190, 0.12);
  color: #8ef8d0;
}

.status-pill .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.content {
  display: grid;
  gap: 28px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: stretch;
}

.glass {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 28px;
  padding: clamp(24px, 4vw, 40px);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.current-card {
  grid-column: span 2;
  min-height: clamp(320px, 50vh, 420px);
}

.eyebrow {
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.3em;
  color: var(--text-muted);
}

.ticket-code {
  margin: 12px 0;
  font-size: clamp(72px, 18vw, 196px);
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.08em;
}

.service {
  text-align: center;
  font-size: clamp(18px, 4vw, 28px);
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 16px;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  color: var(--text-muted);
}

.next-card {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 24px;
  align-items: stretch;
}

.next-columns {
  display: grid;
  gap: 16px;
}

.next-block {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.next-block.preferencial {
  box-shadow: inset 0 0 0 1px rgba(255, 140, 66, 0.3);
}

.next-block.geral {
  box-shadow: inset 0 0 0 1px rgba(79, 209, 197, 0.3);
}

.next-block h2 {
  font-size: clamp(36px, 8vw, 68px);
  margin: 6px 0;
}

.next-block p {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
}

.queue-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  gap: 6px;
}

.queue-info strong {
  font-size: clamp(42px, 10vw, 84px);
  color: var(--accent);
}

.queue-info .muted {
  color: var(--text-muted);
}

.queue-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.76);
}

.queue-breakdown strong {
  color: #ffffff;
}

.history {
  grid-column: span 2;
  gap: 16px;
}

.history header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history li {
  display: grid;
  grid-template-columns: 120px 1fr 90px;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.history li .code {
  font-weight: 600;
  letter-spacing: 0.1em;
}

.history li .service {
  color: rgba(255, 255, 255, 0.84);
}

.history li .time {
  text-align: right;
  color: var(--text-muted);
}

.history li.empty {
  justify-content: center;
  text-align: center;
  opacity: 0.65;
  font-style: italic;
}

@media (max-width: 960px) {
  .current-card {
    grid-column: span 1;
  }

  .history {
    grid-column: span 1;
  }

  .next-card {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .next-columns {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .queue-info {
    align-items: center;
  }

  .queue-breakdown {
    align-items: center;
  }

  .meta {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
