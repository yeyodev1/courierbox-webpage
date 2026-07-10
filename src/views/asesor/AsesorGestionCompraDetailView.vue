<template>
  <div class="page" v-if="!loading && gestion">
    <div class="page-header">
      <button class="btn-back" @click="$router.push('/asesor/gestiones-compra')">← Mis gestiones</button>
      <span class="estado-badge" :class="`estado-${gestion.estado}`">{{ estadoLabel(gestion.estado) }}</span>
    </div>

    <!-- Cliente -->
    <div class="detail-card">
      <h3 class="card-title">Cliente</h3>
      <div class="info-grid">
        <div class="info-item"><span class="label">Nombre</span><strong>{{ contacto?.nombre ?? '—' }}</strong></div>
        <div class="info-item" v-if="contacto?.email"><span class="label">Email</span><a :href="`mailto:${contacto.email}`" class="link">{{ contacto.email }}</a></div>
        <div class="info-item" v-if="contacto?.telefono"><span class="label">Teléfono</span><strong>{{ contacto.telefono }}</strong></div>
      </div>
    </div>

    <!-- Resumen financiero -->
    <div class="detail-card">
      <h3 class="card-title">Resumen</h3>
      <div class="info-grid">
        <div class="info-item"><span class="label">Valor total</span><strong class="orange">${{ gestion.valorTotal.toFixed(2) }}</strong></div>
        <div class="info-item">
          <span class="label">Reserva</span>
          <span>
            ${{ gestion.valorReserva.toFixed(2) }}
            <span v-if="gestion.reservaConfirmada" class="chip green">Confirmada ✓</span>
            <span v-else class="chip muted">Pendiente</span>
          </span>
        </div>
        <div class="info-item"><span class="label">Página de compra</span><a :href="gestion.paginaCompra" target="_blank" rel="noopener" class="link">{{ gestion.paginaCompra }}</a></div>
        <div class="info-item"><span class="label">Entrega tentativa</span><strong>{{ formatDate(gestion.fechaEntregaTentativa) }}</strong></div>
        <div class="info-item" v-if="gestion.notas"><span class="label">Notas</span><span class="muted">{{ gestion.notas }}</span></div>
      </div>
    </div>

    <!-- Imagen -->
    <div class="detail-card" v-if="gestion.imagenCompraUrl">
      <h3 class="card-title">Imagen de la compra</h3>
      <img :src="gestion.imagenCompraUrl" alt="Compra" class="compra-img" />
    </div>

    <!-- Editar campos que puede cambiar el asesor -->
    <div class="detail-card">
      <h3 class="card-title">Editar detalles</h3>
      <div class="edit-form">
        <AppInput v-model="editForm.paginaCompra" label="Página de compra" />
        <div class="field-group">
          <label class="field-label">Fecha tentativa</label>
          <input type="date" v-model="editForm.fechaEntregaTentativa" class="date-input" />
        </div>
        <AppInput v-model="editForm.notas" label="Notas" />
        <AppButton variant="primary" @click="saveEdits" :disabled="saving">
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </AppButton>
      </div>
    </div>

    <!-- Enlace público -->
    <div class="detail-card">
      <h3 class="card-title">Enlace para el cliente</h3>
      <div class="link-row">
        <code class="public-link">{{ viewUrl }}</code>
        <AppButton variant="outline" size="sm" @click="copyLink">Copiar</AppButton>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="loading-state">Cargando...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { gestionesCompraAPI } from '@/services/gestiones_compra.api'
import { useToastStore } from '@/stores/toast.store'
import type { GestionCompra } from '@/services/gestiones_compra.api'

const route = useRoute()
const toast = useToastStore()

const gestion = ref<GestionCompra | null>(null)
const loading = ref(true)
const saving = ref(false)

const id = computed(() => route.params.id as string)
const contacto = computed(() => typeof gestion.value?.contactoId === 'object' ? gestion.value.contactoId as any : null)
const viewUrl = computed(() => `${window.location.origin}/compra/${gestion.value?.viewToken ?? ''}`)

const editForm = ref({ paginaCompra: '', fechaEntregaTentativa: '', notas: '' })

function estadoLabel(e: string) {
  return { borrador: 'Borrador', activa: 'Activa', completado: 'Completado', cancelado: 'Cancelado' }[e] ?? e
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    gestion.value = await gestionesCompraAPI.getById(id.value)
    editForm.value = {
      paginaCompra: gestion.value.paginaCompra,
      fechaEntregaTentativa: (gestion.value.fechaEntregaTentativa ?? '').split('T')[0] ?? '',
      notas: gestion.value.notas ?? '',
    }
  } finally {
    loading.value = false
  }
}

async function saveEdits() {
  saving.value = true
  try {
    gestion.value = await gestionesCompraAPI.update(id.value, editForm.value)
    toast.showNotification('Cambios guardados', 'success')
  } catch (e: any) {
    toast.showNotification(e?.message ?? 'Error', 'error')
  } finally {
    saving.value = false
  }
}

function copyLink() {
  navigator.clipboard.writeText(viewUrl.value)
  toast.showNotification('Enlace copiado', 'success')
}

onMounted(load)
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;
.page { display: flex; flex-direction: column; gap: $space-4; padding: $space-5; max-width: 800px; }
.page-header { display: flex; align-items: center; gap: $space-3; }
.btn-back { background: none; border: none; color: $brand-orange; cursor: pointer; font-size: 0.9rem; padding: 0; }
.detail-card {
  background: $ink-900; border: 1px solid $ink-500; border-radius: 12px; padding: $space-5;
}
.card-title { color: $fg-dark; font-size: 0.88rem; font-weight: 700; margin: 0 0 $space-4; text-transform: uppercase; letter-spacing: 0.04em; }
.info-grid { display: flex; flex-direction: column; gap: 0; }
.info-item {
  display: grid; grid-template-columns: 140px 1fr; gap: $space-2; align-items: center;
  padding: $space-2 0; border-bottom: 1px solid $ink-700;
  &:last-child { border-bottom: none; }
}
.label { color: $ink-300; font-size: 0.82rem; }
.orange { color: $brand-orange; font-size: 1.05rem; }
.chip { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; margin-left: $space-2; }
.chip.green { background: rgba(43,187,146,0.15); color: $signal-green; }
.chip.muted { background: $ink-700; color: $ink-300; }
.muted { color: $ink-400; }
.link { color: $brand-orange; font-size: 0.85rem; word-break: break-all; }
.compra-img { max-width: 100%; border-radius: 8px; }
.edit-form { display: flex; flex-direction: column; gap: $space-3; }
.field-group { display: flex; flex-direction: column; gap: $space-1; }
.field-label { color: $ink-300; font-size: 0.82rem; font-weight: 600; }
.date-input {
  background: $ink-700; border: 1px solid $ink-500; border-radius: 8px;
  color: $fg-dark; padding: $space-2 $space-3; font-size: 0.9rem;
  outline: none; max-width: 200px; color-scheme: dark;
  &:focus { border-color: $brand-orange; }
}
.link-row { display: flex; align-items: center; gap: $space-3; flex-wrap: wrap; }
.public-link { font-size: 0.78rem; color: $ink-300; word-break: break-all; background: $ink-700; padding: $space-2 $space-3; border-radius: 6px; }
.estado-badge {
  display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
}
.estado-activa { background: rgba(43,187,146,0.15); color: $signal-green; }
.estado-borrador { background: rgba(111,111,122,0.2); color: $ink-300; }
.estado-completado { background: rgba(43,187,146,0.25); color: $signal-green; }
.estado-cancelado { background: rgba(229,72,77,0.15); color: $signal-red; }
.loading-state { padding: $space-8; text-align: center; color: $ink-400; }
</style>
