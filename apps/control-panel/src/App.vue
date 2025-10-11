<template>
  <div class="wrapper">
    <header class="header">
      <div class="title-block">
        <h1>Controle de Senhas</h1>
        <p>Gerencie a chamada de senhas.</p>
      </div>
      <div class="status-pill" :class="{ online: isOnline }">
        <span class="dot" />
        <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
      </div>
    </header>

    <main class="stack">
      <section class="panel glass current-card">
        <div class="current-header">
          <span class="eyebrow-large">SENHA ATUAL</span>
        </div>
        <div class="current-main">
          <transition name="ticket-change" mode="out-in">
            <div :key="currentTicket?.code" class="current-code">{{ currentTicket?.code ?? '--' }}</div>
          </transition>
          <p class="current-service">{{ currentTicket?.service ?? 'Sem chamada ativa' }}</p>
        </div>
        <div class="current-footer">
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
            :class="{ loading: loading.preferencial }"
            :disabled="!queueByType.preferencial || loading.preferencial"
            @click="callNextPreferencial"
          >
            <span v-if="!loading.preferencial">Chamar Preferencial</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Chamando...
            </span>
          </button>
          <button
            class="primary geral"
            :class="{ loading: loading.geral }"
            :disabled="!queueByType.geral || loading.geral"
            @click="callNextGeral"
          >
            <span v-if="!loading.geral">Chamar Geral</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Chamando...
            </span>
          </button>
        </div>
        <div class="utility-buttons">
          <button 
            class="ghost" 
            :class="{ loading: loading.previous }"
            :disabled="!history.length || loading.previous" 
            @click="callPrevious"
          >
            <span v-if="!loading.previous">Voltar Senha</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Voltando...
            </span>
          </button>
          <button 
            class="danger" 
            :class="{ loading: loading.reset }"
            :disabled="loading.reset" 
            @click="confirmReset"
          >
            <span v-if="!loading.reset">Zerar Fila</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              Zerando...
            </span>
          </button>
        </div>
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
const queueByType = computed(() => state.queueByType ?? defaultQueueByType());
const history = computed(() => state.history);
</script>

<style scoped>
.wrapper {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  padding: clamp(0.5rem, 1.5vw, 1rem) clamp(0.8rem, 2vw, 1.2rem) clamp(0.3rem, 1vw, 0.6rem);
  gap: clamp(0.8rem, 2vw, 1.2rem);
  overflow: hidden;
  box-sizing: border-box;
}

.header {
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 1.5vw, 0.8rem);
  flex-shrink: 0;
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);
}

.title-block h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3.5vw, 2rem);
  line-height: 1.1;
  font-weight: 800;
}

.title-block p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  line-height: 1.2;
  font-size: clamp(0.8rem, 1.8vw, 0.95rem);
}

.status-pill {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.72);
  font-size: clamp(0.75rem, 1.5vw, 0.9rem);
}

.status-pill.online {
  color: #8ef8d0;
  border-color: rgba(142, 248, 208, 0.45);
  background: rgba(142, 248, 208, 0.12);
}

.status-pill .dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 1.8vw, 1rem);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);
  padding-bottom: 0;
}

.glass {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(18px);
  padding: clamp(1rem, 3vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 2vw, 1rem);
  flex-shrink: 0;
}

.glass:last-child {
  flex: 1;
  justify-content: space-between;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.25em;
  font-size: clamp(0.65rem, 1.2vw, 0.75rem);
  color: var(--text-muted);
}

.current-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: clamp(200px, 25vh, 300px);
}

.current-header {
  flex-shrink: 0;
  padding: 0.5rem 0;
}

.eyebrow-large {
  text-transform: uppercase;
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  letter-spacing: 0.4em;
  color: var(--accent);
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(255, 179, 71, 0.3);
}

.current-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(0.5rem, 1.5vw, 1rem);
}

.current-footer {
  flex-shrink: 0;
  padding: 0.5rem 0;
}

.current-code {
  font-size: clamp(4rem, 15vw, 8rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 0.85;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.current-service {
  margin: 0;
  font-size: clamp(1.2rem, 3.5vw, 1.8rem);
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.2;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  text-transform: uppercase;
  font-size: clamp(0.65rem, 1.2vw, 0.75rem);
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.meta strong {
  display: block;
  margin-top: 0.2rem;
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  color: #ffffff;
}

.counters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(0.8rem, 2vw, 1rem);
}

.counter-pill {
  border-radius: 18px;
  padding: clamp(1rem, 3vw, 1.4rem);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.counter-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
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
  font-size: clamp(2.2rem, 7vw, 4rem);
  color: #fff;
  line-height: 0.9;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.counter-pill .label {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: clamp(0.65rem, 1.2vw, 0.75rem);
  color: rgba(255, 255, 255, 0.76);
}

.counter-pill .muted {
  color: rgba(255, 255, 255, 0.68);
  font-size: clamp(0.7rem, 1.3vw, 0.8rem);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: clamp(0.8rem, 2vw, 1rem);
}

.call-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(0.8rem, 2vw, 1rem);
  flex: 1;
}

.utility-buttons {
  display: flex;
  flex-direction: column;
  gap: clamp(0.6rem, 1.5vw, 0.8rem);
  margin-top: auto;
}

.actions button {
  border-radius: 18px;
  border: none;
  padding: clamp(1.2rem, 3.5vw, 1.6rem);
  font-size: clamp(1.1rem, 2.8vw, 1.5rem);
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  min-height: clamp(60px, 9vw, 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actions button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

.actions button:not(:disabled):active {
  transform: translateY(0);
}

.primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #1b2440;
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  min-height: clamp(64px, 10vw, 84px);
  font-weight: 800;
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
  font-size: clamp(1rem, 2.5vw, 1.3rem);
  min-height: clamp(56px, 8vw, 72px);
}

.danger {
  background: rgba(255, 99, 132, 0.18);
  color: #ff8086;
  border: 1px solid rgba(255, 99, 132, 0.35);
  font-size: clamp(1rem, 2.5vw, 1.3rem);
  min-height: clamp(56px, 8vw, 72px);
}

.toast {
  position: fixed;
  bottom: clamp(0.5rem, 2vw, 1rem);
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-xl);
  font-size: clamp(0.85rem, 1.8vw, 1rem);
  z-index: 1000;
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

/* Responsividade melhorada */
@media (min-width: 480px) {
  .call-buttons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .utility-buttons {
    flex-direction: row;
    gap: clamp(0.8rem, 2vw, 1rem);
  }

  .utility-buttons button {
    flex: 1;
  }
}

@media (min-width: 600px) and (orientation: landscape) {
  .wrapper {
    max-width: 900px;
    padding: clamp(1rem, 2vw, 1.5rem);
  }

  .stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(280px, 1fr));
    grid-auto-rows: minmax(0, auto);
    gap: clamp(1rem, 2vw, 1.5rem);
    overflow: visible;
  }

  .current-card {
    grid-column: span 2;
  }

  .actions {
    grid-column: span 2;
  }
}

/* Telas muito altas (aproveitar espaço vertical) */
@media (min-height: 1000px) and (max-width: 768px) {
  .wrapper {
    padding: clamp(1.5rem, 3vh, 2.5rem) clamp(1.5rem, 4vw, 2rem) clamp(0.5rem, 1.5vh, 1rem);
  }
  
  .stack {
    gap: clamp(1.8rem, 3.5vh, 2.5rem);
    padding: 0 clamp(1.5rem, 3vw, 2rem);
  }
  
  .current-card {
    min-height: clamp(350px, 40vh, 450px);
  }
  
  .glass {
    padding: clamp(2rem, 4vh, 2.8rem);
  }
  
  .actions button {
    min-height: clamp(72px, 8vh, 88px);
    padding: clamp(1.6rem, 3vh, 2rem);
  }
  
  .counter-pill {
    padding: clamp(1.5rem, 3vh, 2rem);
  }
  
  .counter-pill strong {
    font-size: clamp(2.5rem, 5vh, 4.5rem);
  }
}

/* Telas muito largas (aproveitar espaço horizontal) */
@media (min-width: 1200px) and (max-height: 800px) {
  .wrapper {
    padding: clamp(0.8rem, 1.5vh, 1.2rem) clamp(3rem, 6vw, 5rem);
  }
  
  .header {
    padding: 0 clamp(2rem, 4vw, 3rem);
  }
  
  .stack {
    padding: 0 clamp(2rem, 4vw, 3rem);
  }
}

@media (max-width: 400px) {
  .wrapper {
    padding: 0.6rem 0.8rem 0.3rem;
  }
  
  .header {
    padding: 0 0.5rem;
  }
  
  .stack {
    padding: 0 0.5rem;
  }
  
  .meta {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }
  
  .toast {
    bottom: 0.3rem;
  }
}

/* Animações */
.ticket-change-enter-active,
.ticket-change-leave-active {
  transition: all 0.3s ease;
}

.ticket-change-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

.ticket-change-leave-to {
  opacity: 0;
  transform: scale(1.1) translateY(-10px);
}

/* Estilos para loading */
.loading-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.actions button.loading {
  opacity: 0.8;
}

/* Melhor feedback visual para touch */
@media (pointer: coarse) {
  .actions button {
    min-height: clamp(68px, 11vw, 88px);
    padding: clamp(1.4rem, 4vw, 1.8rem);
    font-size: clamp(1.2rem, 3.2vw, 1.6rem);
  }
  
  .primary {
    font-size: clamp(1.3rem, 3.5vw, 1.8rem);
    min-height: clamp(72px, 12vw, 92px);
  }
  
  .ghost, .danger {
    font-size: clamp(1.1rem, 2.8vw, 1.4rem);
    min-height: clamp(60px, 9vw, 76px);
  }
  
  .counter-pill {
    padding: clamp(1rem, 3vw, 1.4rem);
  }
  
  .glass {
    padding: clamp(1.2rem, 3.5vw, 1.8rem);
  }
}

/* iPad Mini e similares (768x1024) */
@media (min-width: 768px) and (max-width: 820px) and (orientation: portrait) {
  .wrapper {
    padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.5rem, 3.5vw, 2rem) clamp(0.4rem, 1.2vw, 0.8rem);
  }
  
  .stack {
    gap: clamp(1.2rem, 2.5vw, 1.5rem);
    padding: 0 clamp(1.2rem, 2.8vw, 1.6rem);
  }
  
  .current-card {
    min-height: clamp(260px, 32vh, 320px);
  }
  
  .glass {
    padding: clamp(1.4rem, 3.2vw, 1.8rem);
  }
  
  .actions button {
    min-height: clamp(64px, 9vh, 80px);
    font-size: clamp(1.1rem, 2.5vw, 1.4rem);
  }
  
  .primary {
    font-size: clamp(1.2rem, 2.8vw, 1.5rem);
    min-height: clamp(68px, 10vh, 84px);
  }
}

/* iPad Air e similares (820x1180) */
@media (min-width: 820px) and (max-width: 900px) and (orientation: portrait) {
  .wrapper {
    padding: clamp(1rem, 2.2vw, 1.4rem) clamp(2rem, 4vw, 2.5rem) clamp(0.5rem, 1.5vw, 1rem);
  }
  
  .stack {
    gap: clamp(1.3rem, 2.8vw, 1.6rem);
    padding: 0 clamp(1.5rem, 3.2vw, 2rem);
  }
  
  .current-card {
    min-height: clamp(280px, 34vh, 350px);
  }
  
  .glass {
    padding: clamp(1.6rem, 3.5vw, 2rem);
  }
}

/* iPad Pro 11" e similares (834x1194) */
@media (min-width: 834px) and (max-width: 950px) and (orientation: portrait) {
  .wrapper {
    padding: clamp(1.2rem, 2.5vw, 1.6rem) clamp(2.2rem, 4.5vw, 3rem) clamp(0.6rem, 1.8vw, 1.2rem);
  }
  
  .stack {
    gap: clamp(1.4rem, 3vw, 1.8rem);
    padding: 0 clamp(1.8rem, 3.5vw, 2.2rem);
  }
  
  .current-card {
    min-height: clamp(300px, 36vh, 380px);
  }
}

/* iPad Pro 12.9" e similares (1024x1366) */
@media (min-width: 1024px) and (max-width: 1100px) and (orientation: portrait) {
  .wrapper {
    padding: clamp(1.5rem, 3vw, 2rem) clamp(3rem, 5vw, 4rem) clamp(0.8rem, 2vw, 1.5rem);
  }
  
  .stack {
    gap: clamp(1.6rem, 3.2vw, 2rem);
    padding: 0 clamp(2.5rem, 4vw, 3rem);
  }
  
  .current-card {
    min-height: clamp(320px, 38vh, 420px);
  }
  
  .glass {
    padding: clamp(2rem, 4vw, 2.5rem);
  }
  
  .actions button {
    min-height: clamp(72px, 10vh, 88px);
    font-size: clamp(1.2rem, 2.8vw, 1.6rem);
  }
  
  .primary {
    font-size: clamp(1.3rem, 3vw, 1.7rem);
    min-height: clamp(76px, 11vh, 92px);
  }
}

/* Tablets pequenos (7-8 polegadas) */
@media (min-width: 600px) and (max-width: 800px) {
  .wrapper {
    padding: clamp(0.6rem, 1.8vw, 1rem) clamp(1rem, 2.5vw, 1.5rem);
  }
  
  .header {
    padding: 0 clamp(0.8rem, 2vw, 1.2rem);
  }
  
  .stack {
    padding: 0 clamp(0.8rem, 2vw, 1.2rem);
    gap: 1rem;
  }
  
  .current-card {
    min-height: clamp(220px, 28vh, 280px);
  }
  
  .glass {
    padding: clamp(1.2rem, 3.2vw, 1.6rem);
  }
}

/* Tablets médios (9-10 polegadas) */
@media (min-width: 800px) and (max-width: 1024px) {
  .wrapper {
    padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.2rem, 3vw, 2rem);
  }
  
  .header {
    padding: 0 clamp(1rem, 2.5vw, 1.5rem);
  }
  
  .stack {
    padding: 0 clamp(1rem, 2.5vw, 1.5rem);
    gap: clamp(1rem, 2.2vw, 1.3rem);
  }
  
  .current-card {
    min-height: clamp(240px, 30vh, 320px);
  }
}

/* Tablets grandes (11+ polegadas) */
@media (min-width: 1024px) and (max-width: 1366px) {
  .wrapper {
    padding: clamp(1rem, 2.5vw, 1.5rem) clamp(1.5rem, 4vw, 2.5rem);
  }
  
  .header {
    padding: 0 clamp(1.2rem, 3vw, 2rem);
  }
  
  .stack {
    padding: 0 clamp(1.2rem, 3vw, 2rem);
    gap: clamp(1.2rem, 2.5vw, 1.6rem);
  }
  
  .current-card {
    min-height: clamp(280px, 32vh, 360px);
  }
  
  .glass {
    padding: clamp(1.6rem, 3.8vw, 2.2rem);
  }
}

/* Otimização para tablets em modo paisagem */
@media (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
  .wrapper {
    padding: clamp(0.8rem, 1.5vw, 1.2rem) clamp(1.5rem, 3vw, 2.5rem);
  }
  
  .header {
    padding: 0 clamp(1rem, 2vw, 1.5rem);
  }
  
  .stack {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: clamp(1rem, 2vw, 1.5rem);
    padding: 0 clamp(1rem, 2vw, 1.5rem);
    overflow: visible;
  }
  
  .current-card {
    grid-column: span 2;
    min-height: clamp(180px, 25vh, 240px);
  }
  
  .counters {
    grid-column: 1;
  }
  
  .actions {
    grid-column: 2;
  }
}

/* Tablets ultra-wide (modo paisagem) */
@media (min-width: 1200px) and (orientation: landscape) {
  .wrapper {
    padding: clamp(1rem, 2vw, 1.5rem) clamp(2rem, 5vw, 4rem);
  }
  
  .stack {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-rows: auto;
    gap: clamp(1.5rem, 3vw, 2rem);
    padding: 0 clamp(1.5rem, 3vw, 2rem);
  }
  
  .current-card {
    grid-column: 1;
    grid-row: 1;
    min-height: clamp(300px, 40vh, 400px);
  }
  
  .counters {
    grid-column: 2;
    grid-row: 1;
  }
  
  .actions {
    grid-column: 3;
    grid-row: 1;
  }
}
</style>
