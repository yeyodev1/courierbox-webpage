<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { asesoriaApi } from '@/services/asesoria.api'
import type { PurchaseOrder } from '@/services/asesoria.api'

const route = useRoute()
const router = useRouter()
const orderId = computed(() => String(route.params.id))

const order = ref<PurchaseOrder | null>(null)
const loading = ref(false)
const error = ref('')
const generatingLink = ref(false)
const uploading = ref(false)
const transferFile = ref<File | null>(null)
const transferReference = ref('')
const transferNotes = ref('')
const copied = ref(false)

const statusSteps = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'comprado', label: 'Comprado' },
  { key: 'en_envio', label: 'En envío' },
  { key: 'entregado', label: 'Entregado' },
]

const currentStepIndex = computed(() => {
  if (!order.value) return -1
  return statusSteps.findIndex((s) => s.key === order.value?.status)
})

async function loadOrder() {
  loading.value = true
  error.value = ''
  try {
    const data = await asesoriaApi.getOrder(orderId.value)
    order.value = data.order
  } catch (e: any) {
    error.value = e.message || 'Error al cargar la orden'
  } finally {
    loading.value = false
  }
}

async function generateLink() {
  generatingLink.value = true
  try {
    await asesoriaApi.generatePaymentLink(orderId.value)
    await loadOrder()
  } catch (e: any) {
    error.value = e.data?.detail || e.message || 'Error al generar link'
  } finally {
    generatingLink.value = false
  }
}

function copyLink() {
  if (!order.value?.paymentLinkUrl) return
  navigator.clipboard.writeText(order.value.paymentLinkUrl)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function submitTransfer() {
  if (!transferFile.value) {
    error.value = 'Selecciona una imagen del comprobante'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const formData = new FormData()
    formData.append('proof', transferFile.value)
    formData.append('reference', transferReference.value)
    formData.append('notes', transferNotes.value)
    await asesoriaApi.uploadTransferProof(orderId.value, formData)
    transferFile.value = null
    transferReference.value = ''
    transferNotes.value = ''
    await loadOrder()
  } catch (e: any) {
    error.value = e.data?.detail || e.message || 'Error al subir comprobante'
  } finally {
    uploading.value = false
  }
}

function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files?.length) {
      transferFile.value = target.files[0] as File
    }
  }

onMounted(loadOrder)
</script>

<template>
  <div class="order-detail-page">
    <button class="btn-back" @click="router.push({ name: 'AsesorOrders' })">
      <i class="fa-solid fa-arrow-left" /> Volver a órdenes
    </button>

    <div v-if="loading" class="loading">
      <i class="fa-solid fa-circle-notch fa-spin" />
      <span>Cargando orden...</span>
    </div>

    <div v-else-if="error" class="alert error">
      <i class="fa-solid fa-circle-exclamation" />
      <span>{{ error }}</span>
    </div>

    <template v-else-if="order">
      <div class="detail-header">
        <div>
          <div class="detail-id">Orden #{{ order._id.slice(-6).toUpperCase() }}</div>
          <h1 class="page-title">{{ order.clientName }}</h1>
          <p class="detail-desc">{{ order.description }}</p>
        </div>
        <div class="detail-total">
          <span>Total</span>
          <strong>${{ order.totalAmount.toFixed(2) }}</strong>
        </div>
      </div>

      <div class="detail-grid">
        <section class="card">
          <h3 class="card-title">Progreso</h3>
          <div class="steps">
            <div
              v-for="(step, idx) in statusSteps"
              :key="step.key"
              class="step"
              :class="{ active: idx <= currentStepIndex, current: idx === currentStepIndex }"
            >
              <div class="step-dot" />
              <span>{{ step.label }}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Detalles de la compra</h3>
          <div class="detail-list">
            <div class="detail-item"><span>Tienda</span><strong>{{ order.storeName }}</strong></div>
            <div class="detail-item"><span>Valor producto</span><strong>${{ order.productValue.toFixed(2) }}</strong></div>
            <div class="detail-item"><span>Envío USA</span><strong>${{ order.shippingValue.toFixed(2) }}</strong></div>
            <div class="detail-item"><span>Fee de gestión</span><strong>${{ order.feeAmount.toFixed(2) }}</strong></div>
            <div class="detail-item"><span>Peso</span><strong>{{ order.weightLb ? `${order.weightLb} lb` : 'N/A' }}</strong></div>
            <div class="detail-item"><span>Tracking USA</span><strong>{{ order.trackingUsa || 'N/A' }}</strong></div>
            <div class="detail-item" v-if="order.productUrl">
              <span>URL</span>
              <a :href="order.productUrl" target="_blank" rel="noopener">Ver producto <i class="fa-solid fa-external-link-alt" /></a>
            </div>
          </div>
        </section>

        <section class="card">
          <h3 class="card-title">Link de pago</h3>
          <div v-if="order.paymentLinkUrl" class="payment-link">
            <input :value="order.paymentLinkUrl" readonly class="field-input" />
            <button class="btn-secondary" @click="copyLink">
              <i :class="copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'" />
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <button v-else class="btn-primary" :disabled="generatingLink" @click="generateLink">
            <span v-if="generatingLink">Generando...</span>
            <span v-else><i class="fa-solid fa-link" /> Generar link Payphone</span>
          </button>
        </section>

        <section class="card">
          <h3 class="card-title">Comprobante de transferencia</h3>
          <div v-if="order.transferProofUrl" class="transfer-proof">
            <a :href="order.transferProofUrl" target="_blank" rel="noopener" class="proof-link">
              <i class="fa-solid fa-file-image" /> Ver comprobante
            </a>
            <p class="transfer-status">
              Estado: <span class="badge" :class="order.paymentStatus === 'pagado' ? 'badge-green' : 'badge-blue'">
                {{ order.paymentStatus === 'verificando' ? 'En verificación' : order.paymentStatus }}
              </span>
            </p>
          </div>
          <div v-else class="transfer-form">
            <label class="field">
              <span class="field-label">Imagen del comprobante</span>
              <input type="file" accept="image/*" class="field-input file" @change="onFileChange" />
            </label>
            <div class="field-row">
              <label class="field">
                <span class="field-label">Referencia</span>
                <input v-model="transferReference" class="field-input" placeholder="Número de referencia" />
              </label>
              <label class="field">
                <span class="field-label">Notas</span>
                <input v-model="transferNotes" class="field-input" placeholder="Banco, fecha..." />
              </label>
            </div>
            <button class="btn-primary" :disabled="uploading" @click="submitTransfer">
              <span v-if="uploading">Subiendo...</span>
              <span v-else><i class="fa-solid fa-upload" /> Subir comprobante</span>
            </button>
          </div>
        </section>

        <section v-if="order.notes || order.adminNotes" class="card full-width">
          <h3 class="card-title">Notas</h3>
          <p v-if="order.notes" class="note"><strong>Tuyas:</strong> {{ order.notes }}</p>
          <p v-if="order.adminNotes" class="note"><strong>Admin:</strong> {{ order.adminNotes }}</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.order-detail-page {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.btn-back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  background: transparent;
  border: 1px solid rgba($ink-500, 0.2);
  border-radius: 10px;
  color: $ink-300;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;

  &:hover {
    background: rgba($ink-500, 0.1);
    color: $fg-dark;
  }
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  padding: $space-12 0;
  color: $ink-500;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3 $space-4;
  border-radius: 12px;
  font-size: 0.9rem;
  background: rgba($signal-red, 0.1);
  color: #ff8a8f;
  border: 1px solid rgba($signal-red, 0.15);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $space-4;

  @media (max-width: 640px) {
    flex-direction: column;
  }
}

.detail-id {
  font-size: 0.8rem;
  font-weight: 700;
  color: $brand-orange;
  margin-bottom: $space-1;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 $space-2;
}

.detail-desc {
  color: $ink-300;
  margin: 0;
}

.detail-total {
  text-align: right;

  span {
    display: block;
    font-size: 0.85rem;
    color: $ink-400;
  }
  strong {
    font-size: 2rem;
    color: $brand-orange;
  }

  @media (max-width: 640px) {
    text-align: left;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-6;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.card {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.12);
  border-radius: 20px;
  padding: $space-6;

  &.full-width {
    grid-column: 1 / -1;
  }
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 $space-5;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  overflow-x: auto;
  padding-bottom: $space-2;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  font-size: 0.75rem;
  color: $ink-500;
  white-space: nowrap;
  flex: 1;

  .step-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: $ink-700;
    border: 2px solid $ink-600;
  }

  &.active .step-dot {
    background: $brand-orange;
    border-color: $brand-orange;
  }

  &.current {
    color: $brand-orange;
    font-weight: 600;
  }
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: $ink-300;

  strong, a {
    color: $fg-dark;
    font-weight: 600;
  }

  a {
    text-decoration: none;
    color: $brand-orange;
  }
}

.payment-link {
  display: flex;
  gap: $space-3;

  .field-input {
    flex: 1;
  }
}

.field-input {
  background: $ink-1000;
  border: 1px solid rgba($ink-500, 0.2);
  border-radius: 12px;
  padding: $space-3 $space-4;
  color: $fg-dark;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;

  &:focus {
    border-color: $brand-orange;
  }

  &.file {
    padding: $space-2;
  }
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: $space-3 $space-4;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-primary {
  background: $brand-orange;
  color: $ink-1000;

  &:hover:not(:disabled) {
    background: lighten($brand-orange, 6%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: $ink-700;
  color: $fg-dark;

  &:hover {
    background: $ink-600;
  }
}

.transfer-proof {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.proof-link {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  color: $brand-orange;
  text-decoration: none;
  font-weight: 600;
}

.transfer-status {
  margin: 0;
  color: $ink-300;
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

.badge-green { background: rgba($signal-green, 0.12); color: $signal-green; }
.badge-blue { background: rgba($signal-blue, 0.12); color: $signal-blue; }

.field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-4;

  .field-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: $ink-300;
  }
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.transfer-form {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.note {
  color: $ink-300;
  margin: 0 0 $space-2;
  line-height: 1.5;

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
