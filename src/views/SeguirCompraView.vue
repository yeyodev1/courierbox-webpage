<template>
  <div class="seguir-compra">
    <div class="header">
      <span class="logo-text">CB</span>
      <h1 class="brand">Courier Box Logistics</h1>
    </div>

    <div v-if="loading" class="card loading-card">
      <div class="skeleton-block"></div>
      <div class="skeleton-block short"></div>
      <div class="skeleton-block"></div>
    </div>

    <div v-else-if="error" class="card error-card">
      <span class="error-icon">❌</span>
      <h2>Gestión no encontrada</h2>
      <p>El enlace puede ser inválido o la gestión fue eliminada.</p>
    </div>

    <div v-else-if="gestion" class="card">
      <div class="status-hero">
        <span class="status-icon">{{ statusIcon }}</span>
        <div>
          <h2 class="status-title">{{ estadoLabel(gestion.estado) }}</h2>
          <p class="status-sub">Tu gestión de compra está {{ estadoDescripcion(gestion.estado) }}</p>
        </div>
      </div>

      <!-- Imagen -->
      <div v-if="gestion.imagenCompraUrl" class="imagen-section">
        <img :src="gestion.imagenCompraUrl" alt="Tu compra" class="compra-img" />
      </div>

      <!-- Detalles -->
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Cliente</span>
          <span class="detail-value">{{ clienteNombre }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Valor total</span>
          <span class="detail-value orange">${{ gestion.valorTotal.toFixed(2) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Reserva</span>
          <span class="detail-value">
            ${{ gestion.valorReserva.toFixed(2) }}
            <span v-if="gestion.reservaConfirmada" class="badge-confirmed">Confirmada ✓</span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Tienda / Página</span>
          <span class="detail-value">{{ gestion.paginaCompra }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Entrega tentativa</span>
          <span class="detail-value">{{ formatDate(gestion.fechaEntregaTentativa) }}</span>
        </div>
        <div class="detail-item" v-if="asesorNombre">
          <span class="detail-label">Tu asesor</span>
          <span class="detail-value">{{ asesorNombre }}</span>
        </div>
      </div>

      <!-- Términos y condiciones -->
      <details class="tc-section">
        <summary class="tc-toggle">Ver Términos y Condiciones</summary>
        <div class="tc-content">
          <p>Al solicitar el servicio de gestión de compra con Courier Box Logistics, el cliente acepta que:</p>
          <ol>
            <li>Los tiempos de entrega son estimados y pueden variar por factores externos al courier (aduana, proveedor, logística internacional).</li>
            <li>El valor de reserva no es reembolsable en caso de cancelación del pedido por parte del cliente.</li>
            <li>Courier Box no se responsabiliza por demoras aduaneras ni restricciones de importación vigentes en Ecuador.</li>
            <li>El cliente debe verificar que el producto no esté restringido para importación al Ecuador antes de confirmar la gestión.</li>
            <li>Los precios incluyen el servicio de compra internacional; costos adicionales de aduana, impuestos o flete local serán informados oportunamente.</li>
            <li>Toda comunicación sobre el estado de la compra se realizará a través del asesor asignado o el enlace de seguimiento.</li>
          </ol>
        </div>
      </details>
    </div>

    <footer class="footer">
      <p>Courier Box Logistics · <a href="https://courierboxlogistics.com" target="_blank" rel="noopener">courierboxlogistics.com</a></p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { gestionesCompraAPI } from '@/services/gestiones_compra.api'
import type { GestionCompra } from '@/services/gestiones_compra.api'

const route = useRoute()
const token = computed(() => route.params.token as string)

const gestion = ref<GestionCompra | null>(null)
const loading = ref(true)
const error = ref(false)

const clienteNombre = computed(() =>
  typeof gestion.value?.contactoId === 'object'
    ? (gestion.value.contactoId as any).nombre
    : '—'
)
const asesorNombre = computed(() =>
  typeof gestion.value?.asesorId === 'object'
    ? (gestion.value.asesorId as any).name
    : null
)

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    borrador: '📋',
    activa: '🛒',
    completado: '✅',
    cancelado: '❌',
  }
  return icons[gestion.value?.estado ?? ''] ?? '📦'
})

function estadoLabel(e: string) {
  return { borrador: 'En preparación', activa: 'Compra en proceso', completado: 'Completado', cancelado: 'Cancelado' }[e] ?? e
}

function estadoDescripcion(e: string) {
  return {
    borrador: 'siendo preparada por nuestro equipo.',
    activa: 'en proceso. Estamos trabajando en tu pedido.',
    completado: '¡Todo listo!',
    cancelado: 'cancelada. Contáctanos para más información.',
  }[e] ?? 'siendo procesada.'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  try {
    gestion.value = await gestionesCompraAPI.getByToken(token.value)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.seguir-compra {
  min-height: 100vh; background: $ink-1000;
  display: flex; flex-direction: column; align-items: center;
  padding: $space-6 $space-4;
}

.header {
  display: flex; align-items: center; gap: $space-3; margin-bottom: $space-6;
}
.logo-text {
  width: 40px; height: 40px; border-radius: 10px;
  background: $brand-orange; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1rem;
}
.brand { color: $brand-orange; font-size: 1.2rem; font-weight: 700; margin: 0; }

.card {
  width: 100%; max-width: 560px; background: $ink-900;
  border: 1px solid $ink-500; border-radius: 16px;
  overflow: hidden; margin-bottom: $space-5;
}

.loading-card { padding: $space-6; display: flex; flex-direction: column; gap: $space-3; }
.skeleton-block { height: 20px; background: $ink-700; border-radius: 4px; animation: pulse 1.4s infinite; }
.skeleton-block.short { width: 60%; }

.error-card {
  padding: $space-8; text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: $space-3; color: $ink-300;
}
.error-icon { font-size: 3rem; }

.status-hero {
  display: flex; align-items: center; gap: $space-4;
  padding: $space-5 $space-6; background: rgba(240,138,31,0.08);
  border-bottom: 1px solid $ink-700;
}
.status-icon { font-size: 2.5rem; }
.status-title { color: $fg-dark; font-size: 1.3rem; font-weight: 700; margin: 0; }
.status-sub { color: $ink-300; font-size: 0.88rem; margin: $space-1 0 0; }

.imagen-section {
  padding: $space-4 $space-6; border-bottom: 1px solid $ink-700; text-align: center;
}
.compra-img { max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: contain; }

.details-grid {
  display: flex; flex-direction: column;
  padding: $space-4 $space-6;
  border-bottom: 1px solid $ink-700;
}
.detail-item {
  display: grid; grid-template-columns: 140px 1fr; gap: $space-2;
  padding: $space-2 0; border-bottom: 1px solid $ink-700;
  &:last-child { border-bottom: none; }
}
.detail-label { font-size: 0.82rem; color: $ink-300; }
.detail-value { font-size: 0.9rem; color: $fg-dark; font-weight: 500; word-break: break-word; }
.orange { color: $brand-orange; font-weight: 700; }
.badge-confirmed { color: $signal-green; font-size: 0.78rem; margin-left: $space-2; }

.tc-section {
  padding: $space-4 $space-6;
}
.tc-toggle {
  cursor: pointer; color: $ink-300; font-size: 0.85rem;
  &:hover { color: $fg-dark; }
}
.tc-content {
  margin-top: $space-3; color: $ink-400; font-size: 0.78rem; line-height: 1.7;
  p { margin: 0 0 $space-2; }
  ol { margin: 0; padding-left: $space-4; }
  li { margin-bottom: $space-1; }
}

.footer {
  color: $ink-400; font-size: 0.78rem; text-align: center;
  a { color: $brand-orange; }
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
