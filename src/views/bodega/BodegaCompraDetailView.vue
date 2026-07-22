<template>
  <div class="detail">
    <button class="back" @click="$router.push('/bodega')">
      <i class="fa-solid fa-arrow-left" aria-hidden="true" /> Compras
    </button>

    <div v-if="loading" class="loading">Cargando compra...</div>

    <template v-else-if="gestion">
      <section class="card info">
        <div class="info-head">
          <div>
            <span class="eyebrow">Gestión de compra</span>
            <h1>{{ clienteNombre }}</h1>
          </div>
          <span class="badge" :class="`stage-${gestion.stage}`">{{ stageLabel(gestion.stage) }}</span>
        </div>
        <div class="meta">
          <div><span>Tienda</span><strong>{{ gestion.paginaCompra || '—' }}</strong></div>
          <div><span>Valor total</span><strong>${{ (gestion.valorTotal || 0).toFixed(2) }}</strong></div>
          <div><span>Asesor</span><strong>{{ asesorNombre }}</strong></div>
          <div><span>Correo cliente</span><strong>{{ clienteEmail || 'Sin correo' }}</strong></div>
        </div>
      </section>

      <section class="card">
        <h3>Fotos de recepción en bodega</h3>
        <p class="muted">Sube las fotos de lo que llegó. Se guardan como evidencia y se muestran al cliente.</p>

        <div class="fotos-grid">
          <div v-for="(f, i) in fotosExistentes" :key="'e'+i" class="foto"><img :src="f.url" alt="foto" /></div>
          <div v-for="(url, i) in nuevasFotos" :key="'n'+i" class="foto nueva">
            <img :src="url" alt="nueva" />
            <button class="rm" @click="nuevasFotos.splice(i, 1)"><i class="fa-solid fa-xmark" /></button>
          </div>
          <button class="foto add" @click="fileInput?.click()" :disabled="uploading">
            <i class="fa-solid fa-plus" aria-hidden="true" />
            <span>{{ uploading ? 'Subiendo...' : 'Agregar' }}</span>
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFiles" />

        <div class="field">
          <label>Nota para el cliente (opcional)</label>
          <textarea v-model="notas" rows="2" placeholder="Ej: llegó en buen estado, listo para envío..."></textarea>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <button class="btn ghost" @click="openPreview"><i class="fa-solid fa-eye" /> Previsualizar</button>
          <button class="btn primary" :disabled="saving" @click="confirmar">
            <i class="fa-solid fa-paper-plane" /> {{ saving ? 'Enviando...' : 'Registrar y enviar correo' }}
          </button>
        </div>
      </section>
    </template>

    <p v-else class="loading">No se encontró la compra.</p>

    <!-- Preview modal -->
    <transition name="fade">
      <div v-if="showPreview" class="overlay" @click.self="showPreview = false">
        <div class="preview-modal">
          <div class="pm-head">
            <h3>Previsualización — lo que verá el cliente</h3>
            <button class="close" @click="showPreview = false"><i class="fa-solid fa-xmark" /></button>
          </div>

          <div class="pm-tabs">
            <button :class="{ active: pvTab === 'correo' }" @click="pvTab = 'correo'">Correo</button>
            <button :class="{ active: pvTab === 'pagina' }" @click="pvTab = 'pagina'">Página de seguimiento</button>
          </div>

          <!-- Email preview -->
          <div v-if="pvTab === 'correo'" class="email-preview">
            <div class="ep-banner">Producto recibido en bodega</div>
            <div class="ep-body">
              <p>Hola <strong>{{ clienteNombre }}</strong>,</p>
              <p>¡Tu producto llegó a nuestra bodega y está siendo procesado para su envío!</p>
              <div class="ep-fotos">
                <img v-for="(u, i) in todasLasFotos" :key="i" :src="u" alt="foto" />
              </div>
              <p v-if="notas" class="ep-nota">{{ notas }}</p>
              <div class="ep-btn">Ver estado de mi pedido</div>
            </div>
          </div>

          <!-- Page preview -->
          <div v-else class="page-preview">
            <p class="muted">Así abre el cliente su seguimiento con el enlace:</p>
            <a class="page-link" :href="trackingUrl" target="_blank" rel="noopener">
              <i class="fa-solid fa-arrow-up-right-from-square" /> Abrir página de seguimiento
            </a>
            <iframe v-if="trackingPath" :src="trackingPath" class="page-frame" title="Seguimiento"></iframe>
          </div>

          <div class="pm-foot">
            <button class="btn ghost" @click="showPreview = false">Cerrar</button>
            <button class="btn primary" :disabled="saving" @click="confirmar">
              <i class="fa-solid fa-paper-plane" /> {{ saving ? 'Enviando...' : 'Confirmar y enviar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gestionesCompraAPI, type GestionCompra } from '@/services/gestiones_compra.api'
import { useToastStore } from '@/stores/toast.store'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const id = String(route.params.id)
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const error = ref('')
const gestion = ref<GestionCompra | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const nuevasFotos = ref<string[]>([])
const notas = ref('')

const showPreview = ref(false)
const pvTab = ref<'correo' | 'pagina'>('correo')

const clienteNombre = computed(() =>
  typeof gestion.value?.contactoId === 'object' && gestion.value?.contactoId ? gestion.value.contactoId.nombre : 'Cliente'
)
const clienteEmail = computed(() =>
  typeof gestion.value?.contactoId === 'object' && gestion.value?.contactoId ? (gestion.value.contactoId as any).email : ''
)
const asesorNombre = computed(() =>
  typeof gestion.value?.asesorId === 'object' && gestion.value?.asesorId ? (gestion.value.asesorId as any).name : '—'
)
const fotosExistentes = computed(() => gestion.value?.fotosRelacionadas ?? [])
const todasLasFotos = computed(() => [...fotosExistentes.value.map((f) => f.url), ...nuevasFotos.value])

const trackingPath = computed(() => (gestion.value?.viewToken ? `/compra/${gestion.value.viewToken}` : ''))
const trackingUrl = computed(() => (trackingPath.value ? `${window.location.origin}${trackingPath.value}` : ''))

function stageLabel(stage: string) {
  return {
    solicitada: 'Solicitada', revisando: 'Revisando', comprada: 'En bodega',
    en_transito: 'En tránsito', entregada: 'Entregada',
  }[stage] ?? stage
}

async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploading.value = true
  error.value = ''
  try {
    for (const file of files) {
      const url = await gestionesCompraAPI.uploadImagen(file)
      if (url) nuevasFotos.value.push(url)
      else error.value = 'Alguna foto no se subió (revisa Cloudinary).'
    }
  } catch (err: any) {
    error.value = err?.message ?? 'No se pudo subir la foto'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function openPreview() {
  pvTab.value = 'correo'
  showPreview.value = true
}

async function confirmar() {
  if (!clienteEmail.value) {
    error.value = 'Este cliente no tiene correo registrado; no se puede notificar.'
    showPreview.value = false
    return
  }
  saving.value = true
  error.value = ''
  try {
    await gestionesCompraAPI.recepcionBodega(id, {
      fotos: nuevasFotos.value.map((url) => ({ url, title: 'Recibido en bodega' })),
      notas: notas.value || undefined,
      enviarCorreo: true,
    })
    toast.showNotification('Recepción registrada y cliente notificado', 'success')
    showPreview.value = false
    router.push('/bodega')
  } catch (err: any) {
    error.value = err?.message ?? 'No se pudo registrar la recepción'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    gestion.value = await gestionesCompraAPI.getById(id)
  } catch {
    gestion.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.detail { display: flex; flex-direction: column; gap: $space-4; }
.back { align-self: flex-start; background: transparent; border: none; color: $brand-orange; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: $space-2; }
.loading { color: $ink-400; text-align: center; padding: $space-6 0; }
.card { background: $ink-900; border: 1px solid $ink-700; border-radius: 16px; padding: $space-5; display: flex; flex-direction: column; gap: $space-4; }
.card h3 { margin: 0; color: $fg-dark; font-size: 1.05rem; }
.info-head { display: flex; align-items: flex-start; justify-content: space-between; gap: $space-3; }
.eyebrow { color: $brand-orange; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.info-head h1 { margin: 4px 0 0; color: $fg-dark; font-size: 1.4rem; }
.meta { display: flex; flex-wrap: wrap; gap: $space-4; }
.meta > div { display: flex; flex-direction: column; gap: 2px; }
.meta span { color: $ink-400; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
.meta strong { color: $fg-dark; }
.muted { color: $ink-400; font-size: 0.85rem; margin: 0; }
.badge { padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: $ink-700; color: $ink-300; }
.badge.stage-comprada { background: rgba(43,187,146,0.15); color: $signal-green; }
.badge.stage-en_transito { background: rgba(240,138,31,0.16); color: $brand-orange; }

.fotos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: $space-3; }
.foto { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid $ink-700; aspect-ratio: 1; background: $ink-1000; }
.foto img { width: 100%; height: 100%; object-fit: cover; }
.foto.nueva { border-color: $brand-orange; }
.foto .rm { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; color: #fff; border-radius: 8px; width: 24px; height: 24px; cursor: pointer; }
.foto.add {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  border: 2px dashed $ink-500; color: $ink-400; cursor: pointer; background: $ink-900;
  i { font-size: 1.2rem; color: $brand-orange; } span { font-size: 0.78rem; }
}
.hidden { display: none; }
.field { display: flex; flex-direction: column; gap: $space-2; }
.field label { color: $ink-300; font-size: 0.85rem; font-weight: 600; }
textarea { background: $ink-1000; border: 1px solid $ink-500; border-radius: 10px; color: $fg-dark; padding: $space-3; resize: vertical; font-family: inherit; outline: none; &:focus { border-color: $brand-orange; } }
.error { color: $signal-red; font-size: 0.85rem; margin: 0; }
.actions { display: flex; gap: $space-3; justify-content: flex-end; flex-wrap: wrap; }
.btn { border-radius: 12px; padding: $space-3 $space-4; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: $space-2; border: 1px solid transparent; }
.btn.primary { background: $brand-orange; color: $ink-1000; &:disabled { opacity: 0.5; cursor: not-allowed; } }
.btn.ghost { background: transparent; color: $brand-orange; border-color: rgba($brand-orange, 0.25); }

.overlay { position: fixed; inset: 0; z-index: 120; background: rgba($ink-1000, 0.8); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: $space-4; }
.preview-modal { width: min(680px, 100%); max-height: 90vh; overflow: auto; background: $ink-900; border: 1px solid $ink-700; border-radius: 20px; padding: $space-5; display: flex; flex-direction: column; gap: $space-4; }
.pm-head { display: flex; align-items: center; justify-content: space-between; }
.pm-head h3 { margin: 0; color: $fg-dark; font-size: 1.05rem; }
.close { background: transparent; border: 1px solid $ink-600; color: $ink-300; border-radius: 10px; width: 34px; height: 34px; cursor: pointer; }
.pm-tabs { display: flex; gap: $space-2; }
.pm-tabs button { flex: 1; padding: $space-2; border-radius: 10px; background: $ink-1000; border: 1px solid $ink-700; color: $ink-300; cursor: pointer; font-weight: 700; &.active { border-color: $brand-orange; color: $brand-orange; } }
.email-preview { border: 1px solid $ink-700; border-radius: 12px; overflow: hidden; }
.ep-banner { background: #f57c00; color: #fff; padding: $space-4; font-weight: 800; }
.ep-body { background: #1a1a1a; color: #e0e0e0; padding: $space-4; }
.ep-body p { line-height: 1.5; }
.ep-fotos { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.ep-fotos img { width: 46%; border-radius: 8px; border: 1px solid #333; }
.ep-nota { color: #aaa; }
.ep-btn { background: #f57c00; color: #fff; text-align: center; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 12px; }
.page-preview { display: flex; flex-direction: column; gap: $space-3; }
.page-link { color: $brand-orange; display: inline-flex; align-items: center; gap: $space-2; text-decoration: none; }
.page-frame { width: 100%; height: 420px; border: 1px solid $ink-700; border-radius: 12px; background: #fff; }
.pm-foot { display: flex; justify-content: flex-end; gap: $space-3; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
