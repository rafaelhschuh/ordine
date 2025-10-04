<template>
  <div class="wrapper">
    <header class="header">
      <div class="title-block">
        <h1>Controle de Senhas</h1>
        <p>Operação otimizada para tablet em pé, com foco em senhas geral e preferencial.</p>
      </div>
      <div class="status-pill" :class="{ online: isOnline }">
        <span class="dot" />
        <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
      </div>
    </header>

    <main class="stack">
      <section class="panel glass current-card">
        <span class="eyebrow">Senha atual</span>
        <div class="current-code">{{ currentTicket?.code ?? '--' }}</div>
        <p class="current-service">{{ currentTicket?.service ?? 'Sem chamada ativa' }}</p>
        <div class="meta">
          <div>
            <span>Emitida</span>
            <strong>{{ formatTime(currentTicket?.issuedAt) }}</strong>
          </div>
          <div>
            <span>Atendidas hoje</span>
            <strong>{{ history.length }}</strong>
          </div>
        </div>
      </section>

      <section class="panel glass highlight">
        <div class="split">
          <div>
            <span class="eyebrow">Próxima preferencial</span>
            <h2>{{ nextPreferencial?.code ?? '—' }}</h2>
            <p>{{ nextPreferencial?.service ?? 'Nenhuma na fila' }}</p>
          </div>
          <div>
            <span class="eyebrow">Próxima geral</span>
            <h2>{{ nextGeral?.code ?? '—' }}</h2>
            <p>{{ nextGeral?.service ?? 'Nenhuma na fila' }}</p>
          </div>
        </div>
      </section>

      <section class="panel glass counters">
        <div class="counter-pill preferencial">
          <span class="label">Preferenciais</span>
          <strong>{{ queueByType.preferencial }}</strong>
          <span class="muted">na fila</span>
        </div>
        <div class="counter-pill geral">
          <span class="label">Gerais</span>
          <strong>{{ queueByType.geral }}</strong>
          <span class="muted">na fila</span>
        </div>
      </section>

      <section class="panel glass actions">
        <div class="call-buttons">
          <button
            class="primary preferencial"
            :disabled="!queueByType.preferencial || loading.preferencial"
            @click="callNextPreferencial"
          >
            Chamar Preferencial
          </button>
          <button
            class="primary geral"
            :disabled="!queueByType.geral || loading.geral"
            @click="callNextGeral"
          >
            Chamar Geral
          </button>
        </div>
        <div class="utility-buttons">
          <button class="ghost" :disabled="!history.length || loading.previous" @click="callPrevious">
            Voltar senha
          </button>
          <button class="danger" :disabled="loading.reset" @click="confirmReset">
            Zerar fila
          </button>
        </div>
      </section>

      <section class="panel glass queue-list">
        <header>
          <span class="eyebrow">Fila completa</span>
          <button class="ghost" :disabled="loading.refresh" @click="fetchState">Atualizar</button>
        </header>
        <ul>
          <li v-for="ticket in queue" :key="ticket.id">
            <div class="line-left">
              <span class="code">{{ ticket.code }}</span>
              <span class="service">{{ ticket.service }}</span>
            </div>
            <span class="time">{{ formatTime(ticket.issuedAt) }}</span>
          </li>
          <li v-if="queue.length === 0" class="empty">Fila vazia no momento.</li>
        </ul>
      </section>
    </main>

    <transition name="toast">
      <div v-if="toast" class="toast" :class="toast.type">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const REFRESH_INTERVAL = 500;

const state = reactive({
  currentTicket: null,
  nextTicket: null,
  nextPreferencial: null,
  nextGeral: null,
  queue: [],
  history: [],
  queueLength: 0,
  queueByType: {
    geral: 0,
    preferencial: 0,
  },
});

const loading = reactive({
  preferencial: false,
  geral: false,
  previous: false,
  reset: false,
  refresh: false,
});

const isOnline = ref(false);
const toast = ref(null);
let toastTimer;
let refreshTimer;
let isFetching = false;

const showToast = (message, type = 'success') => {
  clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, 3500);
};

const defaultQueueByType = () => ({ geral: 0, preferencial: 0 });

const syncState = (payload) => {
  state.currentTicket = payload.currentTicket ?? null;
  state.nextTicket = payload.nextTicket ?? null;
  state.nextPreferencial = payload.nextPreferencial ?? null;
  state.nextGeral = payload.nextGeral ?? null;
  state.queue = payload.queue ?? [];
  state.queueLength = payload.queueLength ?? state.queue.length;
  state.history = payload.history ?? [];
  state.queueByType = payload.queueByType ? { ...defaultQueueByType(), ...payload.queueByType } : defaultQueueByType();
};

const fetchState = async ({ silent = false } = {}) => {
  try {
    if (silent && isFetching) return;
    if (!silent) loading.refresh = true;
    isFetching = true;
    const response = await fetch(`${API_BASE}/api/tickets/state`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    syncState(data);
    isOnline.value = true;
  } catch (error) {
    if (!silent || isOnline.value) {
      showToast('Não foi possível conectar à API.', 'error');
    }
    isOnline.value = false;
  } finally {
    if (!silent) loading.refresh = false;
    isFetching = false;
  }
};

const callNextByCategory = async (category) => {
  const key = category === 'preferencial' ? 'preferencial' : 'geral';
  if (loading[key]) return;
  loading[key] = true;
  try {
    const response = await fetch(`${API_BASE}/api/tickets/next`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha na chamada');
    syncState(data.state);
    showToast(category === 'preferencial' ? 'Senha preferencial chamada.' : 'Senha geral chamada.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    loading[key] = false;
  }
};

const callNextPreferencial = () => callNextByCategory('preferencial');
const callNextGeral = () => callNextByCategory('geral');

const callPrevious = async () => {
  if (loading.previous) return;
  loading.previous = true;
  try {
    const response = await fetch(`${API_BASE}/api/tickets/previous`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha ao retornar');
    syncState(data.state);
    showToast('Retornou para a senha anterior.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    loading.previous = false;
  }
};

const confirmReset = async () => {
  if (loading.reset) return;
  const confirmed = window.confirm('Tem certeza que deseja reiniciar toda a fila? Esta ação não pode ser desfeita.');
  if (!confirmed) return;

  loading.reset = true;
  try {
    const response = await fetch(`${API_BASE}/api/tickets/reset`, { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error('Falha ao reiniciar');
    syncState(data.state);
    showToast('Fila reiniciada.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    loading.reset = false;
  }
};

const formatTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchState();
  refreshTimer = setInterval(() => fetchState({ silent: true }), REFRESH_INTERVAL);
});

onUnmounted(() => {
  clearInterval(refreshTimer);
});

const currentTicket = computed(() => state.currentTicket);
const queue = computed(() => state.queue);
const queueByType = computed(() => state.queueByType ?? defaultQueueByType());
const history = computed(() => state.history);
const nextPreferencial = computed(() => state.nextPreferencial);
const nextGeral = computed(() => state.nextGeral);
</script>

<style scoped>
.wrapper {
  min-height: 100vh;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 32px clamp(16px, 3vw, 32px) 48px;
  gap: 24px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.title-block h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 40px);
}

.title-block p {
  margin: 6px 0 0;
  color: var(--text-muted);
  line-height: 1.4;
}

.status-pill {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.72);
}

.status-pill.online {
  color: #8ef8d0;
  border-color: rgba(142, 248, 208, 0.45);
  background: rgba(142, 248, 208, 0.12);
}

.status-pill .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
}

.glass {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 26px;
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(18px);
  padding: 24px clamp(20px, 4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 12px;
  color: var(--text-muted);
}

.current-card {
  text-align: center;
  gap: 14px;
}

.current-code {
  font-size: clamp(64px, 18vw, 120px);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.current-service {
  margin: 0;
  font-size: clamp(18px, 4vw, 26px);
  color: rgba(255, 255, 255, 0.86);
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.meta strong {
  display: block;
  margin-top: 4px;
  font-size: 16px;
  color: #ffffff;
}

.highlight .split {
  display: grid;
  gap: 12px;
}

.highlight h2 {
  margin: 8px 0;
  font-size: clamp(34px, 10vw, 60px);
}

.highlight p {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
}

.counters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.counter-pill {
  border-radius: 20px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.counter-pill.preferencial {
  background: rgba(255, 140, 66, 0.18);
  border-color: rgba(255, 140, 66, 0.35);
}

.counter-pill.geral {
  background: rgba(79, 209, 197, 0.18);
  border-color: rgba(79, 209, 197, 0.35);
}

.counter-pill strong {
  font-size: clamp(32px, 10vw, 54px);
  color: #fff;
}

.counter-pill .label {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.76);
}

.counter-pill .muted {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.call-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.utility-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions button {
  border-radius: 18px;
  border: none;
  padding: 18px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actions button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #1b2440;
}

.primary.preferencial {
  background: linear-gradient(135deg, #ffb347, #ff8c42);
}

.primary.geral {
  background: linear-gradient(135deg, #4fd1c5, #38b2ac);
}

.ghost {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.danger {
  background: rgba(255, 99, 132, 0.18);
  color: #ff8086;
  border: 1px solid rgba(255, 99, 132, 0.35);
}

.queue-list header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.queue-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.queue-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.queue-list .line-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-list .code {
  font-weight: 600;
  letter-spacing: 0.12em;
}

.queue-list .service {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.queue-list .time {
  color: var(--text-muted);
  font-size: 13px;
}

.queue-list .empty {
  justify-content: center;
  text-align: center;
  font-style: italic;
  opacity: 0.62;
}

.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 24px;
  border-radius: 18px;
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-xl);
}

.toast.success {
  background: rgba(142, 248, 208, 0.15);
  color: #8ef8d0;
  border: 1px solid rgba(142, 248, 208, 0.35);
}

.toast.error {
  background: rgba(255, 99, 132, 0.15);
  color: #ff8086;
  border: 1px solid rgba(255, 99, 132, 0.35);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (min-width: 520px) {
  .call-buttons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .call-buttons button {
    width: 100%;
  }

  .utility-buttons {
    flex-direction: row;
    gap: 14px;
  }

  .utility-buttons button {
    flex: 1;
  }

  .highlight .split {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (orientation: landscape) and (min-width: 960px) {
  .wrapper {
    max-width: 840px;
  }

  .stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(280px, 1fr));
    grid-auto-rows: minmax(0, auto);
    gap: 24px;
  }

  .current-card {
    grid-column: span 2;
  }

  .queue-list {
    grid-column: span 2;
  }
}
</style>
