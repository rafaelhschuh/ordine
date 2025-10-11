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

    <main class="layout">
      <section class="card current glass">
        <div class="current-header">
          <span class="eyebrow-large">SENHA ATUAL</span>
        </div>
        <div class="current-main">
          <transition name="ticket-change" mode="out-in">
            <h1 :key="currentTicket?.code" class="ticket-code">{{ currentTicket?.code ?? '--' }}</h1>
          </transition>
        </div>
        <div class="current-footer">
          <p class="service-large">{{ currentTicket?.service ?? 'Aguardando chamada' }}</p>
          <div class="meta-info">
            <span>Emitida às {{ formatTime(currentTicket?.issuedAt) }}</span>
            <span>Chamadas hoje: {{ issuedCount }}</span>
          </div>
        </div>
      </section>

      <aside class="sidebar">
        <div class="card glass next-card preferencial">
          <span class="eyebrow">Próxima preferencial</span>
          <div class="next-body">
            <strong class="ticket">{{ nextPreferencial?.code ?? '—' }}</strong>
            <span class="label">{{ nextPreferencial?.service ?? 'Nenhuma na fila' }}</span>
          </div>
        </div>

        <div class="card glass next-card geral">
          <span class="eyebrow">Próxima geral</span>
          <div class="next-body">
            <strong class="ticket">{{ nextGeral?.code ?? '—' }}</strong>
            <span class="label">{{ nextGeral?.service ?? 'Nenhuma na fila' }}</span>
          </div>
        </div>

        <div class="card glass queue-card">
          <span class="eyebrow">Fila atual</span>
          <div class="queue-total">
            <span class="hint">Senhas aguardando</span>
            <strong>{{ queueLength }}</strong>
          </div>
          <div class="queue-breakdown">
            <div class="breakdown">
              <span class="count">{{ queueByType.preferencial }}</span>
              <span class="type">Preferenciais</span>
            </div>
            <div class="breakdown">
              <span class="count">{{ queueByType.geral }}</span>
              <span class="type">Gerais</span>
            </div>
          </div>
        </div>
      </aside>
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
  issuedCount: 0,
});

let socket;
const isOnline = ref(false);

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
});

onUnmounted(() => {
  if (socket) socket.disconnect();
});

const currentTicket = computed(() => state.currentTicket);
const queueLength = computed(() => state.queueLength);
const issuedCount = computed(() => state.issuedCount);
const queueByType = computed(() => state.queueByType ?? { geral: 0, preferencial: 0 });
const nextPreferencial = computed(() => state.nextPreferencial);
const nextGeral = computed(() => state.nextGeral);
</script>

<style scoped>
.wrapper {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  padding: clamp(0.8rem, 1.5vw, 1.5rem) clamp(1rem, 2vw, 2rem);
  gap: clamp(0.8rem, 1.5vw, 1.2rem);
  overflow: hidden;
  box-sizing: border-box;
}

.header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.brand {
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--text-primary);
}

.tagline {
  font-size: clamp(0.9rem, 1.5vw, 1.1rem);
  color: var(--text-muted);
  max-width: 34rem;
  line-height: 1.3;
}

.status-pill {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: background 0.3s ease;
  font-size: clamp(0.75rem, 1.2vw, 0.9rem);
}

.status-pill.online {
  background: rgba(99, 230, 190, 0.12);
  color: #8ef8d0;
}

.status-pill .dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 2.3fr) minmax(0, 1fr);
  gap: clamp(0.8rem, 1.5vw, 1.5rem);
  align-items: stretch;
  overflow: hidden;
  min-height: 0;
  width: 100%;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: clamp(16px, 2vw, 24px);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(18px);
  padding: clamp(1.2rem, 2.5vw, 2rem);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(0.8rem, 1.5vw, 1.2rem);
  min-height: 0;
}

.current {
  overflow: hidden;
  justify-content: space-between;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vw, 1rem);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08));
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.current-header {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(0.5rem, 1vw, 1rem) 0;
}

.eyebrow-large {
  text-transform: uppercase;
  font-size: clamp(1.2rem, 2.5vw, 2rem);
  letter-spacing: 0.4em;
  color: var(--text-muted);
  font-weight: 800;
}

.current-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.current-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vw, 0.8rem);
  padding: clamp(0.5rem, 1vw, 1rem) 0;
}

.eyebrow {
  text-transform: uppercase;
  font-size: clamp(0.8rem, 1.4vw, 1.1rem);
  letter-spacing: 0.3em;
  color: var(--text-muted);
  margin-bottom: clamp(0.4rem, 0.8vw, 0.6rem);
  font-weight: 600;
  text-align: center;
}

.next-card.preferencial .eyebrow {
  color: var(--text-muted);
}

.next-card.geral .eyebrow {
  color: var(--text-muted);
}

.queue-card .eyebrow {
  color: var(--text-muted);
}

.ticket-code {
  margin: 0;
  font-size: clamp(8rem, 17vw, 19rem);
  line-height: 0.8;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.08em;
  color: var(--text-primary);
}

.service-large {
  text-align: center;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  margin: 0;
  line-height: 1.1;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.service {
  text-align: center;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  color: var(--text-primary);
  margin: 0;
  line-height: 1.1;
  font-weight: 500;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: clamp(1rem, 1.8vw, 1.4rem);
  color: var(--text-muted);
  font-weight: 500;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: clamp(0.85rem, 1.4vw, 1.1rem);
  color: var(--text-muted);
  margin-top: 0.5rem;
  font-weight: 500;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.5vw, 1.2rem);
  min-height: 0;
}

.next-card {
  align-items: center;
  flex: 1;
  min-height: 0;
  justify-content: center;
  text-align: center;
}

.next-card.preferencial {
  box-shadow: inset 0 0 0 1px rgba(255, 140, 66, 0.3);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.next-card.geral {
  box-shadow: inset 0 0 0 1px rgba(79, 209, 197, 0.3);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.next-body {
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1vw, 0.8rem);
  flex: 1;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%;
}

.next-card.preferencial .next-body .ticket {
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 0.85;
  color: var(--text-primary);
  margin: clamp(0.4rem, 1vw, 1rem) 0;
  text-align: center;
  width: 100%;
}

.next-card.geral .next-body .ticket {
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 0.85;
  color: var(--text-primary);
  margin: clamp(0.4rem, 1vw, 1rem) 0;
  text-align: center;
  width: 100%;
}

.next-body .label {
  font-size: clamp(1.1rem, 2vw, 1.6rem);
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.2;
  font-weight: 500;
  text-align: center;
  width: 100%;
}

.queue-card {
  gap: clamp(0.6rem, 1.2vw, 1rem);
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: var(--shadow-xl);
}

.queue-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.3rem, 0.6vw, 0.4rem);
}

.queue-total .hint {
  font-size: clamp(0.6rem, 0.9vw, 0.75rem);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}

.queue-total strong {
  font-size: clamp(2.2rem, 4.5vw, 3.5rem);
  color: var(--text-muted);
  line-height: 0.85;
  font-weight: 700;
}

.queue-breakdown {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.breakdown {
  padding: clamp(0.5rem, 1vw, 0.7rem);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: clamp(0.2rem, 0.4vw, 0.25rem);
  transition: all 0.3s ease;
}

.breakdown:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.1));
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.breakdown .count {
  font-size: clamp(1.4rem, 2.8vw, 2.2rem);
  font-weight: 700;
  color: #ffffff;
  line-height: 0.9;
}

.breakdown .type {
  font-size: clamp(0.55rem, 0.8vw, 0.7rem);
  color: rgba(255, 255, 255, 0.76);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  line-height: 1.1;
  font-weight: 400;
}

/* Telas muito pequenas (abaixo de 720p) */
@media (max-width: 1280px) and (max-height: 720px) {
  .wrapper {
    padding: 0.4rem 0.6rem;
    gap: 0.5rem;
  }

  .card {
    padding: 0.6rem 0.8rem;
    gap: 0.3rem;
  }

  .eyebrow-large {
    font-size: clamp(0.9rem, 1.8vw, 1.3rem);
  }

  .ticket-code {
    font-size: clamp(9rem, 18vw, 12rem);
    line-height: 0.75;
  }

  .service-large {
    font-size: clamp(1.1rem, 2.2vw, 1.6rem);
  }

  .meta-info {
    font-size: clamp(0.7rem, 1.4vw, 1rem);
  }

  .service {
    font-size: clamp(0.9rem, 1.8vw, 1.3rem);
  }

  .next-body .ticket {
    font-size: clamp(1.2rem, 2.8vw, 1.8rem);
  }

  .queue-total strong {
    font-size: clamp(1.5rem, 3.2vw, 2.2rem);
  }

  .breakdown .count {
    font-size: clamp(0.9rem, 1.8vw, 1.3rem);
  }
}

/* Responsividade melhorada */
@media (max-width: 1200px) {
  .layout {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1.5fr) minmax(0, 1fr);
  }

  .current {
    min-height: 0;
  }

  .sidebar {
    flex-direction: row;
    flex-wrap: wrap;
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .sidebar>.card {
    flex: 1 1 calc(50% - 0.5rem);
    min-width: 200px;
  }

  .queue-card {
    flex-basis: 100%;
  }
}

@media (max-width: 600px) {
  .wrapper {
    padding: clamp(0.8rem, 3vw, 1.2rem);
    gap: 1rem;
  }

  .sidebar {
    flex-direction: column;
  }

  .sidebar>.card {
    flex: none;
  }

  .meta-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
    font-size: clamp(0.8rem, 2vw, 1rem);
  }

  .meta {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }

  .ticket-code {
    font-size: clamp(3rem, 15vw, 6rem);
  }
}

/* Animações */
.ticket-change-enter-active,
.ticket-change-leave-active {
  transition: all 0.4s ease;
}

.ticket-change-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.ticket-change-leave-to {
  opacity: 0;
  transform: scale(1.1) translateY(-20px);
}

/* Otimização específica para 720p */
@media (max-width: 1366px) and (max-height: 768px) {
  .wrapper {
    padding: 0.5rem 0.8rem;
    gap: 0.6rem;
  }

  .card {
    padding: 0.8rem 1rem;
    gap: 0.4rem;
    border-radius: 16px;
  }

  .eyebrow-large {
    font-size: clamp(1rem, 2vw, 1.5rem);
  }

  .ticket-code {
    font-size: clamp(8rem, 12vw, 14rem);
    line-height: 0.75;
  }

  .service-large {
    font-size: clamp(1.2rem, 2.5vw, 1.8rem);
  }

  .meta-info {
    font-size: clamp(0.8rem, 1.5vw, 1.1rem);
  }

  .service {
    font-size: clamp(1rem, 2.2vw, 1.6rem);
  }

  .next-body .ticket {
    font-size: clamp(3rem, 4.5vw, 5rem);
  }

  .queue-total strong {
    font-size: clamp(1.8rem, 4vw, 2.8rem);
  }

  .breakdown .count {
    font-size: clamp(1.1rem, 2.4vw, 1.8rem);
  }

  .eyebrow {
    font-size: clamp(0.6rem, 0.9vw, 0.7rem);
  }

  .meta {
    font-size: clamp(0.7rem, 1vw, 0.8rem);
  }
}

/* Otimização específica para 1080p */
@media (min-width: 1920px) and (min-height: 1080px) {
  .wrapper {
    padding: 1rem 1.5rem;
    gap: 1rem;
    max-width: none;
    width: 100vw;
  }

  .layout {
    gap: 1.2rem;
  }

  .card {
    padding: 1.5rem 2rem;
    gap: 0.8rem;
  }

  .eyebrow-large {
    font-size: clamp(1.6rem, 2.8vw, 2.4rem);
  }

  .ticket-code {
    font-size: clamp(8rem, 12vw, 14rem);
    line-height: 0.75;
  }

  .service-large {
    font-size: clamp(2.2rem, 3.2vw, 3.5rem);
  }

  .meta-info {
    font-size: clamp(1.3rem, 2vw, 1.8rem);
  }

  .service {
    font-size: clamp(1.8rem, 2.5vw, 2.8rem);
  }

  .next-body .ticket {
    font-size: clamp(3rem, 4.5vw, 5rem);
  }

  .queue-total strong {
    font-size: clamp(4rem, 5.5vw, 6rem);
  }

  .breakdown .count {
    font-size: clamp(2.2rem, 3vw, 3.5rem);
  }
}

/* Otimização para telas ultra-wide */
@media (min-width: 2560px) {
  .wrapper {
    max-width: 2400px;
    margin: 0 auto;
    padding: 1.5rem 2.5rem;
  }
}
</style>
