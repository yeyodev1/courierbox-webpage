<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Gestiones de Compra</h1>
        <p class="page-sub">Administra todas las gestiones del equipo</p>
      </div>
      <AppButton variant="primary" @click="$router.push('/admin/gestiones-compra/nueva')">
        + Nueva gestión
      </AppButton>
    </div>

    <!-- KPI del mes -->
    <div class="kpi-row" v-if="!statsLoading">
      <div class="kpi-card">
        <span class="kpi-label">Gestiones este mes</span>
        <span class="kpi-value">{{ stats.totalGestiones }}</span>
      </div>
      <div class="kpi-card kpi-highlight">
        <span class="kpi-label">Total gestionado</span>
        <span class="kpi-value">${{ stats.sumaValorTotal.toFixed(2) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Comisiones del mes</span>
        <span class="kpi-value">${{ stats.sumaComision.toFixed(2) }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Costo de ventas</span>
        <span class="kpi-value">${{ stats.sumaCostoVenta.toFixed(2) }}</span>
      </div>
    </div>
    <div v-else class="kpi-row skeleton-row">
      <div v-for="i in 4" :key="i" class="kpi-skeleton"></div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <AppInput v-model="filters.asesorId" label="" placeholder="ID asesor..." />
      <AppSelect
        v-model="filters.estado"
        :options="estadoOptions"
        label=""
        placeholder="Estado"
      />
      <AppButton variant="outline" @click="loadGestiones">Filtrar</AppButton>
      <AppButton variant="ghost" @click="resetFilters">Limpiar</AppButton>
    </div>

    <!-- Tabla -->
    <div class="table-wrapper" v-if="!loading">
      <table class="data-table" v-if="gestiones.length">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Asesor</th>
            <th>Valor Total</th>
            <th>Reserva</th>
            <th>Estado</th>
            <th>Fecha Entrega</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in gestiones" :key="g._id" @click="goToDetail(g._id)" class="data-row">
            <td>
              <span class="client-name">{{ clienteNombre(g) }}</span>
              <span class="client-email muted">{{ clienteEmail(g) }}</span>
            </td>
            <td>{{ asesorNombre(g) }}</td>
            <td class="amount">${{ g.valorTotal.toFixed(2) }}</td>
            <td>
              <span class="amount-sm">${{ g.valorReserva.toFixed(2) }}</span>
              <span v-if="g.reservaConfirmada" class="badge-confirmed">✓</span>
            </td>
            <td>
              <span class="estado-badge" :class="`estado-${g.estado}`">{{ estadoLabel(g.estado) }}</span>
            </td>
            <td>{{ formatDate(g.fechaEntregaTentativa) }}</td>
            <td @click.stop>
              <AppButton variant="ghost" size="sm" @click="goToDetail(g._id)">Ver</AppButton>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <p>No hay gestiones de compra para los filtros aplicados.</p>
        <AppButton variant="primary" @click="$router.push('/admin/gestiones-compra/nueva')">Crear primera gestión</AppButton>
      </div>
    </div>
    <div v-else class="table-skeleton">
      <div v-for="i in 5" :key="i" class="row-skeleton"></div>
    </div>

    <!-- Paginación -->
    <div class="pagination" v-if="pages > 1">
      <AppButton variant="outline" :disabled="page <= 1" @click="changePage(page - 1)">‹ Anterior</AppButton>
      <span class="page-info">Página {{ page }} de {{ pages }}</span>
      <AppButton variant="outline" :disabled="page >= pages" @click="changePage(page + 1)">Siguiente ›</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { gestionesCompraAPI } from '@/services/gestiones_compra.api'
import type { GestionCompra, GestionesStats } from '@/services/gestiones_compra.api'

const router = useRouter()

const gestiones = ref<GestionCompra[]>([])
const stats = ref<GestionesStats>({ totalGestiones: 0, sumaValorTotal: 0, sumaComision: 0, sumaCostoVenta: 0, porEstado: {} })
const loading = ref(true)
const statsLoading = ref(true)
const page = ref(1)
const pages = ref(1)

const filters = ref({ asesorId: '', estado: '' })

const estadoOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'activa', label: 'Activa' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
]

function estadoLabel(e: string) {
  return { borrador: 'Borrador', activa: 'Activa', completado: 'Completado', cancelado: 'Cancelado' }[e] ?? e
}

function clienteNombre(g: GestionCompra) {
  return typeof g.contactoId === 'object' ? (g.contactoId as any).nombre : '—'
}
function clienteEmail(g: GestionCompra) {
  return typeof g.contactoId === 'object' ? ((g.contactoId as any).email ?? '') : ''
}
function asesorNombre(g: GestionCompra) {
  return typeof g.asesorId === 'object' ? (g.asesorId as any).name : '—'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function goToDetail(id: string) {
  router.push(`/admin/gestiones-compra/${id}`)
}

async function loadGestiones() {
  loading.value = true
  try {
    const result = await gestionesCompraAPI.list({
      page: page.value,
      limit: 20,
      estado: filters.value.estado || undefined,
      asesorId: filters.value.asesorId || undefined,
    })
    gestiones.value = result.gestiones
    pages.value = result.pages
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    const now = new Date()
    stats.value = await gestionesCompraAPI.getStatsMensuales({ año: now.getFullYear(), mes: now.getMonth() + 1 })
  } finally {
    statsLoading.value = false
  }
}

function resetFilters() {
  filters.value = { asesorId: '', estado: '' }
  page.value = 1
  loadGestiones()
}

function changePage(p: number) {
  page.value = p
  loadGestiones()
}

onMounted(() => {
  loadGestiones()
  loadStats()
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.page { display: flex; flex-direction: column; gap: $space-5; padding: $space-6; max-width: 1200px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: $space-4; }
.page-title { color: $fg-dark; font-size: 1.6rem; font-weight: 700; margin: 0; }
.page-sub { color: $ink-300; font-size: 0.9rem; margin: $space-1 0 0; }
.header-left { display: flex; flex-direction: column; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: $space-4; }
.kpi-card {
  background: $ink-900; border: 1px solid $ink-500; border-radius: 12px;
  padding: $space-4 $space-5; display: flex; flex-direction: column; gap: $space-1;
  &.kpi-highlight { border-color: $brand-orange; background: rgba(240,138,31,0.06); }
}
.kpi-label { font-size: 0.78rem; color: $ink-300; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-value { font-size: 1.7rem; font-weight: 800; color: $fg-dark; }
.kpi-highlight .kpi-value { color: $brand-orange; }

.skeleton-row { }
.kpi-skeleton { height: 90px; background: $ink-700; border-radius: 12px; animation: pulse 1.4s infinite; }

.filters-bar { display: flex; gap: $space-3; align-items: flex-end; flex-wrap: wrap; }

.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: $space-3 $space-4; color: $ink-300;
  font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
  border-bottom: 1px solid $ink-500;
}
.data-row {
  cursor: pointer; transition: background 0.15s;
  td { padding: $space-3 $space-4; border-bottom: 1px solid $ink-700; color: $fg-dark; vertical-align: middle; }
  &:hover td { background: $ink-700; }
}
.client-name { display: block; font-weight: 600; font-size: 0.92rem; }
.client-email { display: block; font-size: 0.78rem; }
.muted { color: $ink-400; }
.amount { font-weight: 700; color: $brand-orange; }
.amount-sm { font-size: 0.9rem; }
.badge-confirmed { color: $signal-green; font-size: 0.8rem; margin-left: $space-1; }
.estado-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
}
.estado-activa { background: rgba(43,187,146,0.15); color: $signal-green; }
.estado-borrador { background: rgba(111,111,122,0.2); color: $ink-300; }
.estado-completado { background: rgba(43,187,146,0.25); color: $signal-green; }
.estado-cancelado { background: rgba(229,72,77,0.15); color: $signal-red; }
.row-skeleton { height: 52px; background: $ink-700; border-radius: 8px; margin-bottom: $space-2; animation: pulse 1.4s infinite; }

.empty-state { text-align: center; padding: $space-8; color: $ink-400; display: flex; flex-direction: column; gap: $space-4; align-items: center; }

.pagination { display: flex; align-items: center; justify-content: center; gap: $space-4; }
.page-info { color: $ink-300; font-size: 0.9rem; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
