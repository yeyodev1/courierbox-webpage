<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { proveedoresApi, type Proveedor } from '@/services/proveedores.api'

function normalizeType(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const proveedores = ref<Proveedor[]>([])
const showModal = ref(false)
const editing = ref<Proveedor | null>(null)
const showTypeModal = ref(false)
const typeDraft = ref('')
const providerTypes = ref<string[]>([])
const defaultProviderTypes = ref<string[]>([])
const typeError = ref('')
const confirmModal = ref<null | {
  title: string
  message: string
  confirmLabel: string
  kind: 'type' | 'provider'
  value: string
}>(null)

const form = ref({
  nombre: '',
  tipo: '',
  pais: '',
  ciudad: '',
  contacto: '',
  telefono: '',
  email: '',
  notas: '',
  activo: true,
})

const selectedTypeLabel = computed(() => form.value.tipo || 'Seleccionar tipo de proveedor')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return proveedores.value.filter((p) => {
    if (!q) return true
    return [p.nombre, p.tipo, p.pais, p.ciudad, p.contacto, p.email]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })
})

const activeCount = computed(() => proveedores.value.filter((p) => p.activo).length)
const typeCount = computed(() => new Set(proveedores.value.map((p) => p.tipo || 'General')).size)
const typeUsage = computed(() => {
  const counts: Record<string, number> = {}
  for (const p of proveedores.value) {
    const key = normalizeType(p.tipo || 'Sin tipo')
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
})
const defaultTypes = computed(() => defaultProviderTypes.value)
const customTypes = computed(() => providerTypes.value.filter((type) => !defaultProviderTypes.value.some((base) => normalizeType(base) === normalizeType(type))))

function resetForm() {
  form.value = { nombre: '', tipo: '', pais: '', ciudad: '', contacto: '', telefono: '', email: '', notas: '', activo: true }
  editing.value = null
}

async function loadProviderTypes() {
  const data = await proveedoresApi.listTypes()
  defaultProviderTypes.value = data.defaultTypes
  providerTypes.value = data.providerTypes
}

function openTypeModal() {
  typeDraft.value = ''
  showTypeModal.value = true
}

function chooseType(type: string) {
  form.value.tipo = type
  showTypeModal.value = false
}

async function addType() {
  const next = typeDraft.value.trim()
  if (!next) return
  typeError.value = ''
  try {
    await proveedoresApi.addType(next)
    await loadProviderTypes()
    form.value.tipo = next
    typeDraft.value = ''
    showTypeModal.value = false
  } catch (e: any) {
    error.value = e.message || 'No se pudo guardar el tipo'
  }
}

function removeType(type: string) {
  const normalized = normalizeType(type)
  const count = typeUsage.value[normalized] || 0
  if (count > 0) {
    typeError.value = `No puedes eliminar "${type}" porque ya está asignado a ${count} proveedor${count > 1 ? 'es' : ''}.`
    return
  }
  confirmModal.value = {
    kind: 'type',
    value: type,
    title: 'Eliminar tipo de proveedor',
    message: `¿Eliminar el tipo "${type}"?`,
    confirmLabel: 'Eliminar tipo',
  }
}

function removeProvider(p: Proveedor) {
  confirmModal.value = {
    kind: 'provider',
    value: p._id,
    title: 'Eliminar proveedor',
    message: `¿Eliminar a ${p.nombre}?`,
    confirmLabel: 'Eliminar proveedor',
  }
}

async function confirmRemoval() {
  if (!confirmModal.value) return
  const action = confirmModal.value
  confirmModal.value = null

  try {
    if (action.kind === 'type') {
      await proveedoresApi.removeType(action.value)
      await loadProviderTypes()
      if (normalizeType(form.value.tipo) === normalizeType(action.value)) form.value.tipo = ''
      return
    }

    await proveedoresApi.remove(action.value)
    await load()
  } catch (e: any) {
    error.value = e.message || 'No se pudo eliminar'
  }
}

function openCreate(prefill?: Partial<Proveedor>) {
  resetForm()
  if (prefill) form.value = { ...form.value, ...prefill }
  showModal.value = true
}

function openEdit(p: Proveedor) {
  editing.value = p
  form.value = { ...p }
  showModal.value = true
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await proveedoresApi.list({ q: search.value || undefined, limit: 200 })
    proveedores.value = data.proveedores
  } catch (e: any) {
    error.value = e.message || 'Error al cargar proveedores'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.nombre.trim()) {
    error.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await proveedoresApi.update(editing.value._id, form.value)
    } else {
      await proveedoresApi.create(form.value)
    }
    showModal.value = false
    resetForm()
    await load()
  } catch (e: any) {
    error.value = e.message || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

async function toggleActivo(p: Proveedor) {
  try {
    await proveedoresApi.update(p._id, { activo: !p.activo })
    await load()
  } catch (e: any) {
    error.value = e.message || 'No se pudo actualizar'
  }
}

function goToCosts(p: Proveedor) {
  router.push({ name: 'AdminCostos', query: { proveedor: p.nombre } })
}

watch(search, () => load())
onMounted(() => {
  Promise.all([loadProviderTypes(), load()]).catch((e: any) => {
    error.value = e.message || 'Error al cargar datos'
  })
})
</script>

<template>
  <div class="providers-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Proveedores</h1>
        <p class="page-subtitle">Crea, edita y conecta proveedores con costos y envíos</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="router.push({ name: 'AdminCostos' })">Ir a costos</button>
        <button class="btn-primary" @click="openCreate()"><i class="fa-solid fa-plus" /> Nuevo proveedor</button>
      </div>
    </div>

    <section class="stats-grid">
      <article class="stat-card"><span>Total</span><strong>{{ proveedores.length }}</strong></article>
      <article class="stat-card"><span>Activos</span><strong>{{ activeCount }}</strong></article>
      <article class="stat-card"><span>Tipos</span><strong>{{ typeCount }}</strong></article>
    </section>

    <div class="toolbar">
      <input v-model="search" class="field-input search-input" placeholder="Buscar proveedor, tipo, país, ciudad..." />
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-row"></div>
    </div>
    <div v-else-if="error" class="alert error"><i class="fa-solid fa-circle-exclamation" /> {{ error }}</div>
    <div v-else-if="filtered.length === 0" class="empty">
      <i class="fa-solid fa-truck-fast" />
      <p>No hay proveedores</p>
    </div>

    <div v-else class="providers-grid">
      <article v-for="p in filtered" :key="p._id" class="provider-card">
        <div class="provider-top">
          <div>
            <h3>{{ p.nombre }}</h3>
            <p>{{ p.tipo || 'General' }} · {{ p.pais || 'Sin país' }} · {{ p.ciudad || 'Sin ciudad' }}</p>
          </div>
          <span class="status" :class="{ active: p.activo }">{{ p.activo ? 'Activo' : 'Inactivo' }}</span>
        </div>

        <div class="provider-meta">
          <div><span>Contacto</span><strong>{{ p.contacto || '—' }}</strong></div>
          <div><span>Teléfono</span><strong>{{ p.telefono || '—' }}</strong></div>
          <div><span>Email</span><strong>{{ p.email || '—' }}</strong></div>
        </div>

        <p class="notes">{{ p.notas || 'Sin notas' }}</p>

        <div class="card-actions">
          <button class="btn-ghost" @click="goToCosts(p)"><i class="fa-solid fa-coins" /> Ver costos</button>
          <button class="btn-ghost" @click="openEdit(p)"><i class="fa-solid fa-pen" /> Editar</button>
          <button class="btn-ghost" @click="toggleActivo(p)">{{ p.activo ? 'Desactivar' : 'Activar' }}</button>
          <button class="btn-danger" @click="removeProvider(p)"><i class="fa-solid fa-trash-can" /></button>
        </div>
      </article>
    </div>

    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-card wide provider-modal">
          <button class="modal-close-btn" type="button" @click="showModal = false"><i class="fa-solid fa-xmark" /></button>
          <h3>{{ editing ? 'Editar' : 'Nuevo' }} proveedor</h3>
          <p class="modal-subtitle">Registra los datos que después usarás en costos y envíos.</p>
          <div class="form-grid">
            <label class="field"><span>Nombre *</span><input v-model="form.nombre" class="field-input" /></label>
            <div class="field">
              <span>Tipo de proveedor</span>
              <button type="button" class="type-picker" @click="openTypeModal">
                <div>
                  <strong>{{ selectedTypeLabel }}</strong>
                  <small>Selecciona o crea un tipo para clasificarlo mejor</small>
                </div>
                <i class="fa-solid fa-chevron-right" />
              </button>
              <div class="quick-types">
                <button v-for="type in providerTypes.slice(0, 6)" :key="type" type="button" class="quick-type" @click="form.tipo = type">
                  {{ type }}
                </button>
              </div>
            </div>
            <label class="field"><span>País</span><input v-model="form.pais" class="field-input" /></label>
            <label class="field"><span>Ciudad</span><input v-model="form.ciudad" class="field-input" /></label>
            <label class="field"><span>Contacto</span><input v-model="form.contacto" class="field-input" /></label>
            <label class="field"><span>Teléfono</span><input v-model="form.telefono" class="field-input" /></label>
            <label class="field full"><span>Email</span><input v-model="form.email" class="field-input" /></label>
            <label class="field full"><span>Notas</span><textarea v-model="form.notas" class="field-input" rows="4"></textarea></label>
            <label class="toggle-row full"><input v-model="form.activo" type="checkbox" /> Activo</label>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="showModal = false">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showTypeModal" class="modal-overlay" @click.self="showTypeModal = false">
        <div class="modal-card wide type-modal">
          <button class="modal-close-btn" type="button" @click="showTypeModal = false"><i class="fa-solid fa-xmark" /></button>
          <h3>Tipos de proveedor</h3>
          <p class="modal-subtitle">Los tipos base vienen del backend. Puedes crear y eliminar solo los personalizados.</p>

          <div class="type-create">
            <input v-model="typeDraft" class="field-input" placeholder="Ej: Courier Miami, Aduana, Transporte local" @keyup.enter="addType" />
            <button type="button" class="btn-primary" @click="addType">Agregar tipo</button>
          </div>

          <p v-if="typeError" class="type-error">{{ typeError }}</p>

          <div class="type-sections">
            <div>
              <h4>Por defecto</h4>
              <div class="type-list">
                <div
                  v-for="type in defaultTypes"
                  :key="type"
                  class="type-item"
                  :class="{ active: form.tipo === type }"
                >
                  <button type="button" class="type-select-btn" @click="chooseType(type)">
                    <span>
                      <strong>{{ type }}</strong>
                      <small>{{ (typeUsage[normalizeType(type)] || 0) }} asignaciones</small>
                    </span>
                    <i class="fa-solid fa-check" v-if="form.tipo === type" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4>Personalizados</h4>
              <div class="type-list">
                <div
                  v-for="type in customTypes"
                  :key="type"
                  class="type-item"
                  :class="{ active: form.tipo === type }"
                >
                  <button type="button" class="type-select-btn" @click="chooseType(type)">
                    <span>
                      <strong>{{ type }}</strong>
                      <small>{{ (typeUsage[normalizeType(type)] || 0) }} asignaciones</small>
                    </span>
                    <i class="fa-solid fa-check" v-if="form.tipo === type" />
                  </button>
                  <button type="button" class="type-delete-btn" :disabled="(typeUsage[normalizeType(type)] || 0) > 0" :title="(typeUsage[normalizeType(type)] || 0) > 0 ? 'Tiene asignaciones' : 'Eliminar tipo'" @click.stop="removeType(type)"><i class="fa-solid fa-trash-can" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="confirmModal" class="modal-overlay confirm-overlay" @click.self="confirmModal = null">
        <div class="modal-card confirm-card">
          <button class="modal-close-btn" type="button" @click="confirmModal = null"><i class="fa-solid fa-xmark" /></button>
          <h3>{{ confirmModal.title }}</h3>
          <p class="modal-subtitle">{{ confirmModal.message }}</p>
          <div class="modal-actions confirm-actions">
            <button class="btn-secondary" type="button" @click="confirmModal = null">Cancelar</button>
            <button class="btn-danger" type="button" @click="confirmRemoval">{{ confirmModal.confirmLabel }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.providers-page { display:flex; flex-direction:column; gap:$space-6; }
.page-header,.provider-top,.card-actions,.header-actions { display:flex; justify-content:space-between; gap:$space-3; align-items:flex-start; }
.page-title { font-size:1.5rem; font-weight:700; margin:0 0 $space-1; }
.page-subtitle { margin:0; color:$ink-400; }
.stats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:$space-4; }
.stat-card,.provider-card,.modal-card { background:$ink-900; border:1px solid rgba($ink-500,.12); border-radius:18px; padding:$space-5; }
.stat-card span,.provider-meta span,.notes,.modal-subtitle { color:$ink-400; }
.stat-card strong { display:block; font-size:1.6rem; margin-top:$space-2; }
.toolbar { display:flex; gap:$space-3; }
.search-input { width:100%; }
.providers-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:$space-4; }
.provider-top h3 { margin:0 0 $space-1; }
.provider-top p { margin:0; color:$ink-400; font-size:.85rem; }
.status { padding:.3rem .65rem; border-radius:999px; background:rgba($signal-red,.12); color:#ff8a8f; font-size:.75rem; font-weight:700; }
.status.active { background:rgba($signal-green,.12); color:$signal-green; }
.provider-meta { display:grid; grid-template-columns:1fr 1fr; gap:$space-3; margin:$space-4 0; }
.provider-meta strong { display:block; color:$fg-dark; font-size:.92rem; margin-top:.15rem; }
.notes { margin:0 0 $space-4; min-height:48px; }
.card-actions { align-items:center; flex-wrap:wrap; }
.btn-primary,.btn-secondary,.btn-ghost,.btn-danger { border:none; cursor:pointer; font-family:inherit; border-radius:12px; padding:.65rem .9rem; font-weight:700; }
.btn-primary { background:$brand-orange; color:$ink-1000; }
.btn-secondary,.btn-ghost { background:rgba($ink-700,.8); color:$fg-dark; }
.btn-danger { background:rgba($signal-red,.12); color:#ff8a8f; }
.field { display:flex; flex-direction:column; gap:$space-2; }
.field span { color:$ink-400; font-size:.85rem; font-weight:600; }
.field-input { background:$ink-1000; border:1px solid rgba($ink-500,.2); border-radius:12px; padding:$space-3 $space-4; color:$fg-dark; }
.type-picker {
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:$space-3;
  background:linear-gradient(180deg, rgba($brand-orange,.12), rgba($ink-1000,.75));
  border:1px solid rgba($brand-orange,.22);
  border-radius:14px;
  padding:$space-3 $space-4;
  color:$fg-dark;
  cursor:pointer;
  text-align:left;

  strong { display:block; font-size:.92rem; }
  small { color:$ink-400; display:block; margin-top:2px; }
}
.quick-types { display:flex; flex-wrap:wrap; gap:.5rem; }
.quick-type {
  border:1px solid rgba($ink-500,.18);
  background:rgba($ink-700,.55);
  color:$ink-200;
  border-radius:999px;
  padding:.45rem .7rem;
  font-size:.78rem;
  cursor:pointer;
}
.modal-overlay { position:fixed; inset:0; background:rgba($ink-1000,.75); display:flex; align-items:center; justify-content:center; padding:$space-4; z-index:100; }
.modal-card.wide {
  max-width:760px;
  width:100%;
  position:relative;
  max-height: calc(100vh - #{$space-8});
  overflow:auto;
}
.modal-close-btn { position:absolute; top:$space-3; right:$space-3; width:36px; height:36px; border:none; border-radius:10px; background:rgba($ink-700,.8); color:$fg-dark; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:$space-4; margin-top:$space-4; }
.full { grid-column:1/-1; }
.toggle-row { display:flex; align-items:center; gap:$space-2; color:$ink-300; }
.modal-actions { display:flex; justify-content:flex-end; gap:$space-3; margin-top:$space-5; }
.alert,.empty { padding:$space-5; border-radius:16px; background:rgba($ink-900,.7); border:1px solid rgba($ink-500,.12); color:$ink-300; }
.type-modal { max-width: 640px; }
.type-create { display:flex; gap:$space-3; margin:$space-4 0; }
.type-create .field-input { flex:1; }
.type-error { margin:0 0 $space-3; color:#ff8a8f; font-size:.85rem; }
.type-sections { display:grid; grid-template-columns:1fr 1fr; gap:$space-4; }
.type-sections h4 { margin:0 0 $space-3; font-size:.95rem; color:$fg-dark; }
.type-list { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:$space-3; max-height: 360px; overflow:auto; }
.type-item {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:$space-2;
  border:1px solid rgba($ink-500,.14);
  background:rgba($ink-1000,.42);
  border-radius:14px;
  padding:$space-2;
  color:$fg-dark;

  &.active { border-color: rgba($brand-orange,.35); background: rgba($brand-orange,.08); }
}
.type-select-btn {
  flex:1;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:$space-3;
  text-align:left;
  border:none;
  background:transparent;
  color:inherit;
  cursor:pointer;
  padding:.2rem .2rem .2rem .45rem;

  strong { display:block; }
  small { display:block; color:$ink-400; margin-top:2px; }
}
.type-actions { display:flex; align-items:center; gap:.35rem; }
.type-delete-btn {
  width:34px;
  height:34px;
  border:none;
  border-radius:10px;
  background:rgba($signal-red,.12);
  color:#ff8a8f;
  cursor:pointer;
  flex:0 0 auto;
}
.type-delete-btn:disabled { opacity:.45; cursor:not-allowed; }
.type-delete-btn i { pointer-events:none; }
.type-modal { max-width: 760px; }
.confirm-card { max-width: 460px; width: 100%; text-align:center; }
.confirm-actions { justify-content:center; }
.confirm-overlay { align-items:center; justify-content:center; }
.fade-enter-active,.fade-leave-active { transition:opacity .2s ease; }
.fade-enter-from,.fade-leave-to { opacity:0; }
@media (max-width: 900px) {
  .stats-grid,.form-grid,.type-sections { grid-template-columns:1fr; }
  .page-header,.header-actions,.provider-top,.card-actions,.type-create { flex-direction:column; align-items:stretch; }
  .modal-overlay { align-items:flex-end; padding:$space-2; }
  .confirm-overlay { align-items:center; padding:$space-4; }
  .provider-modal { width:100%; max-width:none; max-height:calc(100vh - #{$space-4}); border-radius:20px 20px 0 0; }
  .provider-modal .form-grid { margin-top:$space-3; }
  .provider-modal .modal-actions { flex-direction:column; }
  .provider-modal .modal-close-btn { top:$space-2; right:$space-2; }
  .type-modal { width:100%; max-width:none; max-height:calc(100vh - #{$space-4}); border-radius:20px 20px 0 0; }
}
</style>
