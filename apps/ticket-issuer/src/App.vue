<template>
  <div class="wrapper">
    <header>
      <h1>Retire sua senha</h1>
      <p>Escolha o tipo de atendimento e receba sua senha instantaneamente.</p>
    </header>

    <main class="stack">
      <section class="glass services">
        <span class="eyebrow">Escolha o atendimento</span>
        <div class="buttons">
          <button class="primary geral" :disabled="loading" @click="issueTicket('Geral')">
            <span>Atendimento Geral</span>
            <small>{{ formatPeople(queueByType.geral) }} aguardando</small>
          </button>
          <button class="primary preferencial" :disabled="loading" @click="issueTicket('Preferencial')">
            <span>Atendimento Preferencial</span>
            <small>{{ formatPeople(queueByType.preferencial) }} aguardando</small>
          </button>
        </div>
        <small class="muted">Preferencial inclui gestantes, idosos, pessoas com deficiência e demais prioridades legais.</small>
      </section>

      <section class="glass ticket" v-if="lastTicket">
        <span class="eyebrow">Sua senha</span>
        <div class="ticket-code">{{ lastTicket.code }}</div>
        <p class="service">{{ lastTicket.service }}</p>
        <p class="issued">Emitida às {{ formatTime(lastTicket.issuedAt) }}</p>
        <div class="actions">
          <button class="ghost" @click="printTicket">Imprimir</button>
          <button class="ghost" @click="shareTicket">Compartilhar</button>
        </div>
      </section>

      <section class="glass info">
        <h2>Fila em tempo real</h2>
        <div class="stats">
          <div>
            <span class="label">Preferenciais</span>
            <strong>{{ queueByType.preferencial }}</strong>
            <span class="muted">aguardando</span>
          </div>
          <div>
            <span class="label">Gerais</span>
            <strong>{{ queueByType.geral }}</strong>
            <span class="muted">aguardando</span>
          </div>
          <div>
            <span class="label">Última chamada</span>
            <strong>{{ currentTicket?.code ?? '—' }}</strong>
            <span class="muted">{{ currentTicket?.service ?? 'Sem chamadas' }}</span>
          </div>
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
import { computed, onMounted, ref } from 'vue';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const loading = ref(false);
const lastTicket = ref(null);
const state = ref({
  queueLength: 0,
  currentTicket: null,
  queueByType: {
    geral: 0,
    preferencial: 0,
  },
});
const toast = ref(null);
let toastTimer;

const showToast = (message, type = 'success') => {
  clearTimeout(toastTimer);
  toast.value = { message, type };
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, 3200);
};

const fetchState = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/tickets/state`);
    if (!response.ok) throw new Error();
    const data = await response.json();
    state.value = {
      queueLength: data.queueLength,
      currentTicket: data.currentTicket,
      queueByType: {
        geral: data.queueByType?.geral ?? 0,
        preferencial: data.queueByType?.preferencial ?? 0,
      },
    };
  } catch (error) {
    showToast('Não foi possível carregar a fila.', 'error');
  }
};

const issueTicket = async (service) => {
  if (loading.value) return;
  loading.value = true;
  try {
    const response = await fetch(`${API_BASE}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ service }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Falha ao emitir a senha');
    lastTicket.value = data.ticket;
    state.value = {
      queueLength: data.state.queueLength,
      currentTicket: data.state.currentTicket,
      queueByType: {
        geral: data.state.queueByType?.geral ?? 0,
        preferencial: data.state.queueByType?.preferencial ?? 0,
      },
    };
    showToast('Sua senha foi gerada com sucesso!');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    loading.value = false;
  }
};

const printTicket = () => {
  window.print();
};

const shareTicket = async () => {
  if (!lastTicket.value) return;
  const text = `Sua senha: ${lastTicket.value.code} - ${lastTicket.value.service}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'Senha de atendimento',
        text,
      });
    } else {
      await navigator.clipboard.writeText(text);
      showToast('Senha copiada para a área de transferência.');
    }
  } catch (error) {
    showToast('Não foi possível compartilhar.', 'error');
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
});

const queueLength = computed(() => state.value.queueLength ?? 0);
const currentTicket = computed(() => state.value.currentTicket);
const queueByType = computed(() => state.value.queueByType ?? { geral: 0, preferencial: 0 });
const formatPeople = (count) => {
  const safeCount = Number.isFinite(count) ? count : 0;
  return `${safeCount} ${safeCount === 1 ? 'pessoa' : 'pessoas'}`;
};
</script>

<style scoped>
.wrapper {
  min-height: 100vh;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 40px clamp(18px, 4vw, 32px);
  gap: 24px;
}

header h1 {
  font-size: clamp(30px, 6vw, 48px);
  margin-bottom: 12px;
}

header p {
  max-width: 360px;
  color: var(--text-muted);
  margin: 0;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.glass {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 28px;
  padding: clamp(24px, 4vw, 36px);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: 13px;
  color: var(--text-muted);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.buttons .primary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-radius: 20px;
  border: none;
  padding: 20px 24px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.buttons .primary span {
  font-size: inherit;
}

.buttons .primary small {
  font-size: 14px;
  opacity: 0.8;
}

.buttons .primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.buttons .primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.3);
}

.buttons .primary.geral {
  background: linear-gradient(135deg, #4fd1c5, #38b2ac);
  color: #0c1c30;
}

.buttons .primary.preferencial {
  background: linear-gradient(135deg, #ffb347, #ff8c42);
  color: #2b1608;
}

.ticket {
  align-items: center;
  text-align: center;
}

.ticket-code {
  font-size: 7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.service {
  font-size: clamp(20px, 4vw, 30px);
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.issued {
  color: var(--text-muted);
  margin: 0;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.ghost {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.ghost:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}

.info h2 {
  margin: 0;
}

.stats {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.stats strong {
  display: block;
  margin: 6px 0;
  font-size: clamp(36px, 9vw, 80px);
  color: var(--accent);
}

.label {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 12px;
  color: var(--text-muted);
}

.toast {
  position: fixed;
  bottom: 36px;
  right: 36px;
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
  transform: translateY(12px);
}

@media (orientation: landscape) and (min-width: 900px) {
  .wrapper {
    max-width: 720px;
  }

  .stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(280px, 1fr));
    gap: 24px;
  }

  .services {
    grid-column: span 2;
  }
}

@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .wrapper {
    padding: 24px;
    gap: 16px;
  }

  header,
  .services,
  .info,
  .toast {
    display: none !important;
  }

  .ticket {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
    border: 2px dashed #000000;
  }

  .ticket-code {
    color: #000000 !important;
  }

  .actions {
    display: none !important;
  }
}
</style>
