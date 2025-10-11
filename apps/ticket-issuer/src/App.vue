<template>
  <div class="wrapper">
    <header>
      <div class="header-content">
        <h1>Retire sua senha</h1>
        <p>Escolha o tipo de atendimento e receba sua senha instantaneamente.</p>
      </div>
    </header>

    <main class="stack">
      <section class="glass services">
        <div class="service-header">
          <span class="eyebrow">Escolha o tipo de atendimento</span>
          <p class="service-description">Toque no botão para retirar sua senha</p>
        </div>
        
        <div class="buttons">
          <button 
            class="primary geral" 
            :disabled="loading" 
            @click="issueTicket('Geral')"
          >
            <div class="button-content">
              <span class="button-title">Atendimento Geral</span>
              <small>{{ formatPeople(queueByType.geral) }} aguardando</small>
            </div>
          </button>
          
          <button 
            class="primary preferencial" 
            :disabled="loading" 
            @click="issueTicket('Preferencial')"
          >
            <div class="button-content">
              <span class="button-title">Atendimento Preferencial</span>
              <small>{{ formatPeople(queueByType.preferencial) }} aguardando</small>
            </div>
          </button>
        </div>
        
        <div class="info-footer">
          <p class="muted">Preferencial: gestantes, idosos, pessoas com deficiência e demais prioridades legais</p>
          <p class="print-info">Sua senha será impressa automaticamente após a retirada</p>
        </div>
      </section>
    </main>

    <!-- Overlay de sucesso -->
    <transition name="success-overlay">
      <div v-if="showSuccess" class="success-overlay" :class="expandingButton">
        <div class="success-content">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">Senha Gerada!</h2>
          <p class="success-subtitle">{{ lastTicket?.code }}</p>
          <p class="success-message">Sua senha será impressa automaticamente</p>
        </div>
      </div>
    </transition>
    <transition name="success-overlay">
      <div v-if="showSuccess" class="success-overlay" :class="expandingButton">
        <div class="success-content">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="success-title">Senha Gerada!</h2>
          <p class="success-subtitle">{{ lastTicket?.code }}</p>
          <p class="success-message">Sua senha será impressa automaticamente</p>
        </div>
      </div>
    </transition>

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
const expandingButton = ref(null);
const showSuccess = ref(false);
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
  expandingButton.value = service.toLowerCase();
  
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
    
    // Mostra o sucesso imediatamente
    showSuccess.value = true;
    lastTicket.value = data.ticket;
    
    // Aguarda a animação de sucesso
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    state.value = {
      queueLength: data.state.queueLength,
      currentTicket: data.state.currentTicket,
      queueByType: {
        geral: data.state.queueByType?.geral ?? 0,
        preferencial: data.state.queueByType?.preferencial ?? 0,
      },
    };
    
    showToast(`Senha ${data.ticket.code} gerada com sucesso!`);
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    // Reset dos estados
    showSuccess.value = false;
    expandingButton.value = null;
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
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  padding: clamp(0.5rem, 1.5vw, 1rem) clamp(0.8rem, 2vw, 1.2rem) clamp(0.3rem, 1vw, 0.6rem);
  gap: clamp(0.8rem, 2vw, 1.2rem);
  overflow: hidden;
  box-sizing: border-box;
}

header {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
  padding: 0 clamp(0.5rem, 1.5vw, 1rem);
}

.header-content {
  flex: 1;
}

header h1 {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  margin: 0;
  line-height: 1.1;
  font-weight: 800;
}

header p {
  color: var(--text-muted);
  margin: 0.2rem 0 0;
  font-size: clamp(0.8rem, 1.8vw, 1rem);
  line-height: 1.2;
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
  border-radius: 24px;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: clamp(1.2rem, 2.5vw, 1.8rem);
  flex: 1;
  height: 100%;
  min-height: 0;
}

.service-header {
  text-align: center;
  flex-shrink: 0;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.3em;
  font-size: clamp(1rem, 2.2vw, 1.4rem);
  color: var(--accent);
  font-weight: 800;
  text-shadow: 0 2px 8px rgba(255, 179, 71, 0.3);
  margin-bottom: 0.5rem;
  display: block;
}

.service-description {
  font-size: clamp(1rem, 2vw, 1.3rem);
  color: var(--text-muted);
  margin: 0;
  line-height: 1.3;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 3vw, 2rem);
  flex: 1;
  height: 100%;
}

.buttons .primary {
  border-radius: 24px;
  border: none;
  padding: clamp(2rem, 5vw, 3rem);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.3s ease, opacity 0.2s ease;
  flex: 1;
  min-height: clamp(120px, 25vh, 200px);
  width: 100%;
  position: relative;
  overflow: hidden;
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  gap: clamp(0.8rem, 2vw, 1.2rem);
}

.button-title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.button-title.loading {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: clamp(1.4rem, 3.5vw, 2rem);
}

.buttons .primary small {
  font-size: clamp(1.1rem, 2.5vw, 1.4rem);
  opacity: 0.9;
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
}

.buttons .primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buttons .primary:not(:disabled):hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.buttons .primary:not(:disabled):active {
  transform: translateY(-1px) scale(0.98);
  transition: transform 0.1s ease;
}

/* Overlay de sucesso com fundo sólido */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-overlay.geral {
  background: linear-gradient(135deg, #4fd1c5, #38b2ac);
}

.success-overlay.preferencial {
  background: linear-gradient(135deg, #ffb347, #ff8c42);
}

.buttons .primary.expanding .button-content {
  opacity: 0;
  animation: fadeOut 0.3s ease forwards;
}

@keyframes expandButton {
  0% {
    border-radius: 24px;
  }
  50% {
    border-radius: 12px;
  }
  100% {
    border-radius: 0;
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Overlay de sucesso */
.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  animation: overlayAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards;
}

.success-overlay.geral {
  background: linear-gradient(135deg, #4fd1c5, #38b2ac);
}

.success-overlay.preferencial {
  background: linear-gradient(135deg, #ffb347, #ff8c42);
}

@keyframes overlayAppear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.success-content {
  text-align: center;
  color: white;
  opacity: 0;
  animation: successAppear 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) 0.2s forwards;
}

.success-icon {
  width: clamp(80px, 15vw, 120px);
  height: clamp(80px, 15vw, 120px);
  margin: 0 auto 1.5rem;
  opacity: 0;
  animation: successIcon 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.4s forwards;
}

.success-icon svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.3));
}

.success-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  opacity: 0;
  animation: successText 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) 0.6s forwards;
}

.success-subtitle {
  font-size: clamp(3rem, 8vw, 5rem);
  font-weight: 800;
  margin: 0 0 1rem 0;
  letter-spacing: 0.1em;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  opacity: 0;
  animation: successCode 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.8s forwards;
}

.success-message {
  font-size: clamp(1.2rem, 3vw, 1.8rem);
  margin: 0;
  opacity: 0;
  animation: successMessage 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) 1.0s forwards;
}

@keyframes successAppear {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes successIcon {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes successText {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes successCode {
  0% {
    opacity: 0;
    transform: scale(0.5) translateY(30px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes successMessage {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }
  100% {
    opacity: 0.9;
    transform: translateY(0);
  }
}

/* Transições do overlay */
.success-overlay-enter-active {
  transition: opacity 0.3s ease;
}

.success-overlay-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.success-overlay-enter-from {
  opacity: 0;
}

.success-overlay-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.buttons .primary.geral {
  background: linear-gradient(135deg, #4fd1c5, #38b2ac);
  color: #0c1c30;
}

.buttons .primary.preferencial {
  background: linear-gradient(135deg, #ffb347, #ff8c42);
  color: #2b1608;
}

.info-footer {
  text-align: center;
  flex-shrink: 0;
}

.info-footer .muted {
  font-size: clamp(0.85rem, 1.8vw, 1.1rem);
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0 0 0.8rem 0;
}

.print-info {
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  color: var(--accent);
  margin: 0;
  font-weight: 600;
  line-height: 1.3;
}

/* Spinner para loading */
.spinner {
  width: 1.2rem;
  height: 1.2rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.toast {
  position: fixed;
  bottom: clamp(0.5rem, 2vw, 1rem);
  right: clamp(0.8rem, 2.5vw, 1.5rem);
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

.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(1.05);
}

/* Responsividade melhorada */
@media (min-width: 480px) {
  .buttons {
    gap: clamp(1.8rem, 4vw, 2.5rem);
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(140px, 30vh, 200px);
  }
  
  .button-title {
    font-size: clamp(1.8rem, 4.5vw, 2.8rem);
  }
}

@media (orientation: landscape) and (min-width: 800px) {
  .wrapper {
    padding: clamp(1rem, 2vh, 1.5rem) clamp(2rem, 4vw, 3rem) clamp(0.8rem, 1.5vh, 1.2rem);
  }

  .buttons {
    flex-direction: row;
    gap: clamp(2rem, 5vw, 3rem);
    height: 100%;
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(180px, 40vh, 250px);
  }
  
  .button-title {
    font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  }
}

@media (max-width: 400px) {
  .wrapper {
    padding: 0.6rem 0.8rem 0.3rem;
  }
  
  .stack {
    padding: 0 0.5rem;
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(100px, 25vh, 150px);
  }
  
  .button-title {
    font-size: clamp(1.3rem, 3.5vw, 1.8rem);
  }
  
  .toast {
    bottom: 0.3rem;
    right: 0.5rem;
  }
}

/* Tablets pequenos (7-8 polegadas) */
@media (min-width: 600px) and (max-width: 800px) {
  .wrapper {
    padding: clamp(0.6rem, 1.8vw, 1rem) clamp(1rem, 2.5vw, 1.5rem) clamp(0.4rem, 1.2vw, 0.8rem);
  }
  
  .stack {
    padding: 0 clamp(0.8rem, 2vw, 1.2rem);
    gap: 1rem;
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(130px, 28vh, 180px);
  }
  
  .button-title {
    font-size: clamp(1.4rem, 3.2vw, 1.8rem);
  }
  
  .glass {
    padding: clamp(1.2rem, 3.2vw, 1.6rem);
  }
}

/* Tablets médios (9-10 polegadas) */
@media (min-width: 800px) and (max-width: 1024px) {
  .wrapper {
    padding: clamp(0.8rem, 2vw, 1.2rem) clamp(1.2rem, 3vw, 2rem) clamp(0.5rem, 1.5vw, 1rem);
  }
  
  .stack {
    padding: 0 clamp(1rem, 2.5vw, 1.5rem);
    gap: clamp(1rem, 2.2vw, 1.3rem);
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(140px, 30vh, 190px);
  }
  
  .button-title {
    font-size: clamp(1.5rem, 3.5vw, 2rem);
  }
}

/* Tablets grandes (11+ polegadas) */
@media (min-width: 1024px) and (max-width: 1366px) {
  .wrapper {
    padding: clamp(1rem, 2.5vw, 1.5rem) clamp(1.5rem, 4vw, 2.5rem) clamp(0.8rem, 2vw, 1.5rem);
  }
  
  .stack {
    padding: 0 clamp(1.2rem, 3vw, 2rem);
    gap: clamp(1.2rem, 2.5vw, 1.6rem);
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(150px, 32vh, 220px);
  }
  
  .button-title {
    font-size: clamp(1.6rem, 3.8vw, 2.2rem);
  }
  
  .glass {
    padding: clamp(1.6rem, 3.8vw, 2.2rem);
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
  
  .glass {
    padding: clamp(2rem, 4vh, 2.8rem);
  }
  
  .buttons .primary {
    flex: 1;
    min-height: clamp(180px, 35vh, 280px);
    padding: clamp(2.5rem, 5vh, 3.5rem);
  }
  
  .button-title {
    font-size: clamp(1.8rem, 4vw, 2.6rem);
  }
}

/* Otimização para dispositivos touch */
@media (pointer: coarse) {
  .buttons .primary {
    flex: 1;
    min-height: clamp(140px, 28vh, 190px);
    padding: clamp(2rem, 4.5vw, 2.8rem);
  }
  
  .button-title {
    font-size: clamp(1.5rem, 3.5vw, 2.1rem);
  }
  
  .glass {
    padding: clamp(1.4rem, 3.5vw, 1.8rem);
  }
}

/* Estilos para impressão */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .wrapper {
    height: auto;
    padding: 1rem;
    gap: 1rem;
  }

  header,
  .services,
  .info,
  .toast {
    display: none !important;
  }

  .actions {
    display: flex !important;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
  }

  .ticket-info {
    display: block !important;
  }

  .actions-grid {
    display: none !important;
  }

  .ticket-code {
    color: #000000 !important;
    font-size: 4rem !important;
  }

  .service {
    color: #333333 !important;
    font-size: 1.5rem !important;
  }
}

/* Botões desabilitados durante loading */
.buttons .primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Animações */
.ticket-issued-enter-active {
  transition: all 0.5s ease;
}

.ticket-issued-leave-active {
  transition: all 0.3s ease;
}

.ticket-issued-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}

.ticket-issued-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
