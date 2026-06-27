<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { asesoriaApi } from '@/services/asesoria.api'
import type { PurchaseOrder } from '@/services/asesoria.api'

const orders = ref<PurchaseOrder[]>([])
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')
const paymentFilter = ref('')

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'comprado', label: 'Comprado' },
  { value: 'en_envio', label: 'En envío' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const paymentOptions = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'verificando', label: 'Verificando' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'rechazado', label: 'Rechazado' },
]

const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    if (statusFilter.value && o.status !== statusFilter.value) return false
    if (paymentFilter.value && o.paymentStatus !== paymentFilter.value) return false
    return true
  })
})

async function loadOrders() {
  loading.value = true
  error.value = ''
  try {
    const data = await asesoriaApi.listOrders({ limit: 200 })
    orders.value = data.orders
  } catch (e: any) {
    error.value = e.message || 'Error al cargar órdenes'
  } finally {
    loading.value = false
  }
}

async function updateStatus(order: PurchaseOrder, status: string) {
  try {
    await asesoriaApi.updateOrderStatus(order._id, status)
    await loadOrders()
  } catch (e: any) {
    error.value = e.message || 'Error al actualizar estado'
  }
}

async function updatePayment(order: PurchaseOrder, paymentStatus: string) {
  try {
    await asesoriaApi.updatePaymentStatus(order._id, paymentStatus)
    await loadOrders()
  } catch (e: any) {
    error.value = e.message || 'Error al actualizar pago'
  }
}

function asesorName(order: PurchaseOrder) {
  if (typeof order.asesorId === 'object') {
    return order.asesorId.name || order.asesorId.email
  }
  return 'Asesor'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(loadOrders)
</script>

<template>
  <div class="orders-admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Órdenes de compra</h1>
        <p class="page-subtitle">Gestión completa de órdenes creadas por los asesores</p>
      </div>
    </div>

    <div class="toolbar">
      <label class="filter">
        <span>Estado</span>
        <select v-model="statusFilter" class="field-input">
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label class="filter">
        <span>Pago</span>
        <select v-model="paymentFilter" class="field-input">
          <option v-for="opt in paymentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="loading">
      <i class="fa-solid fa-circle-notch fa-spin" /> Cargando...
    </div>

    <div v-else-if="error" class="alert error">
      <i class="fa-solid fa-circle-exclamation" /> {{ error }}
    </div>

    <div v-else-if="filteredOrders.length === 0" class="empty">
      <i class="fa-solid fa-clipboard-list" />
      <p>No hay órdenes para mostrar</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Asesor</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Comprobante</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order._id">
            <td class="mono">#{{ order._id.slice(-6).toUpperCase() }}</td>
            <td>
              <strong>{{ order.clientName }}</strong>
              <div class="cell-sub">{{ order.description.slice(0, 40) }}{{ order.description.length > 40 ? '...' : '' }}</div>
            </td>
            <td>{{ asesorName(order) }}</td>
            <td class="mono total">${{ order.totalAmount.toFixed(2) }}</td>
            <td>
              <select
                class="badge-select"
                :value="order.status"
                @change="updateStatus(order, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in statusOptions.filter((o) => o.value)" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td>
              <select
                class="badge-select"
                :value="order.paymentStatus"
                @change="updatePayment(order, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in paymentOptions.filter((o) => o.value)" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </td>
            <td>
              <a v-if="order.transferProofUrl" :href="order.transferProofUrl" target="_blank" rel="noopener" class="proof-link">
                <i class="fa-solid fa-file-image" /> Ver
              </a>
              <span v-else class="muted">—</span>
            </td>
            <td class="mono">{{ formatDate(order.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.orders-admin-page {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 $space-1;
}

.page-subtitle {
  color: $ink-400;
  margin: 0;
  font-size: 0.9rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.filter {
  display: flex;
  align-items: center;
  gap: $space-3;
  color: $ink-300;
  font-size: 0.9rem;

  .field-input {
    background: $ink-900;
    border: 1px solid rgba($ink-500, 0.2);
    border-radius: 10px;
    padding: $space-2 $space-3;
    color: $fg-dark;
    font-family: inherit;
    outline: none;

    &:focus {
      border-color: $brand-orange;
    }
  }
}

.loading,
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  padding: $space-12 0;
  color: $ink-500;

  i {
    font-size: 1.5rem;
  }
}

.alert {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  border-radius: 12px;
  font-size: 0.9rem;
  background: rgba($signal-red, 0.1);
  color: #ff8a8f;
  border: 1px solid rgba($signal-red, 0.15);
}

.table-wrapper {
  overflow-x: auto;
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.12);
  border-radius: 16px;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th, td {
    padding: $space-3 $space-4;
    text-align: left;
    border-bottom: 1px solid rgba($ink-500, 0.1);
    white-space: nowrap;
  }

  th {
    color: $ink-400;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .mono {
    font-variant-numeric: tabular-nums;
  }

  .total {
    color: $brand-orange;
    font-weight: 700;
  }

  .cell-sub {
    color: $ink-400;
    font-size: 0.8rem;
    margin-top: 2px;
  }

  .proof-link {
    color: $brand-orange;
    text-decoration: none;
    font-weight: 600;
  }

  .muted {
    color: $ink-500;
  }
}

.badge-select {
  background: $ink-1000;
  border: 1px solid rgba($ink-500, 0.2);
  border-radius: 8px;
  padding: $space-1 $space-2;
  color: $fg-dark;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}
</style>
