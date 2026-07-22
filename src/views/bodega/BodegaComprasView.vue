<template>
  <div class="bodega-compras">
    <header class="head">
      <div>
        <h1>Compras</h1>
        <p>Todas las gestiones de compra. Marca la recepción en bodega y notifica al cliente.</p>
      </div>
      <div class="search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input v-model="q" placeholder="Buscar cliente o tienda..." />
      </div>
    </header>

    <div v-if="loading" class="skeletons">
      <div v-for="i in 4" :key="i" class="sk" />
    </div>

    <template v-else>
      <p v-if="!filtered.length" class="empty">No hay compras registradas.</p>
      <div v-else class="grid">
        <article v-for="g in filtered" :key="g._id" class="card" @click="abrir(g._id)">
          <div class="card-head">
            <strong>{{ clienteNombre(g) }}</strong>
            <span class="badge" :class="`stage-${g.stage}`">{{ stageLabel(g.stage) }}</span>
          </div>
          <p class="tienda">{{ g.paginaCompra || '—' }}</p>
          <div class="card-foot">
            <span>{{ asesorNombre(g) }}</span>
            <span class="valor">${{ (g.valorTotal || 0).toFixed(2) }}</span>
          </div>
          <div class="card-tags">
            <span v-if="g.fotosRelacionadas?.length" class="tag ok"><i class="fa-solid fa-image" /> {{ g.fotosRelacionadas.length }}</span>
            <span class="tag date">{{ formatDate(g.createdAt) }}</span>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { gestionesCompraAPI, type GestionCompra } from '@/services/gestiones_compra.api'

const router = useRouter()
const loading = ref(true)
const gestiones = ref<GestionCompra[]>([])
const q = ref('')

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return gestiones.value
  return gestiones.value.filter((g) =>
    clienteNombre(g).toLowerCase().includes(term) || (g.paginaCompra || '').toLowerCase().includes(term)
  )
})

function clienteNombre(g: GestionCompra) {
  return typeof g.contactoId === 'object' && g.contactoId ? g.contactoId.nombre : 'Cliente'
}
function asesorNombre(g: GestionCompra) {
  return typeof g.asesorId === 'object' && g.asesorId ? (g.asesorId as any).name : '—'
}
function stageLabel(stage: string) {
  return {
    solicitada: 'Solicitada', revisando: 'Revisando', comprada: 'En bodega',
    en_transito: 'En tránsito', entregada: 'Entregada',
  }[stage] ?? stage
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
}
function abrir(id: string) {
  router.push(`/bodega/compras/${id}`)
}

onMounted(async () => {
  try {
    const res = await gestionesCompraAPI.list({ limit: 100 })
    gestiones.value = res.gestiones
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.bodega-compras { display: flex; flex-direction: column; gap: $space-5; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: $space-4; flex-wrap: wrap; }
.head h1 { margin: 0 0 4px; color: $fg-dark; font-size: 1.5rem; }
.head p { margin: 0; color: $ink-300; }
.search {
  display: flex; align-items: center; gap: $space-2; background: $ink-900;
  border: 1px solid $ink-700; border-radius: 12px; padding: $space-2 $space-4; color: $ink-400;
  input { background: none; border: none; outline: none; color: $fg-dark; font-family: inherit; min-width: 220px; }
}
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: $space-4; }
.card {
  background: $ink-900; border: 1px solid $ink-700; border-radius: 16px; padding: $space-4;
  cursor: pointer; display: flex; flex-direction: column; gap: $space-2; transition: border-color 0.14s, transform 0.14s;
  &:hover { border-color: $brand-orange; transform: translateY(-2px); }
}
.card-head { display: flex; align-items: center; justify-content: space-between; gap: $space-2; }
.card-head strong { color: $fg-dark; }
.tienda { margin: 0; color: $ink-300; font-size: 0.85rem; word-break: break-word; }
.card-foot { display: flex; align-items: center; justify-content: space-between; color: $ink-400; font-size: 0.82rem; }
.valor { color: $brand-orange; font-weight: 800; }
.card-tags { display: flex; gap: $space-2; }
.tag { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: $ink-700; color: $ink-300; }
.tag.ok { color: $signal-green; }
.badge { padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; background: $ink-700; color: $ink-300; }
.badge.stage-comprada { background: rgba(43,187,146,0.15); color: $signal-green; }
.badge.stage-en_transito { background: rgba(240,138,31,0.16); color: $brand-orange; }
.badge.stage-entregada { background: rgba(84,132,255,0.16); color: #7fa3ff; }
.empty { color: $ink-400; text-align: center; padding: $space-6 0; }
.skeletons { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: $space-4; }
.sk { height: 130px; border-radius: 16px; background: $ink-800; animation: pulse 1.4s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
</style>
