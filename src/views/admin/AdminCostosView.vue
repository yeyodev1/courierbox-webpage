<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { costosApi, CATEGORIAS_POR_TIPO, type Gasto } from '@/services/costos.api'
import { proveedoresApi, type Proveedor } from '@/services/proveedores.api'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppFileUpload from '@/components/ui/AppFileUpload.vue'

const route = useRoute()
const router = useRouter()

const gastos = ref<Gasto[]>([])
const loading = ref(false)
const error = ref('')
const filtroTipo = ref('')
const filtroCategoria = ref('')
const filtroProveedor = ref(String(route.query.proveedor || ''))
const filtroDesde = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const filtroHasta = ref(new Date().toISOString().slice(0, 10))
const resumen = ref<any>(null)
const proveedores = ref<Proveedor[]>([])
const savingProveedor = ref(false)

const showModal = ref(false)
const showCloseConfirm = ref(false)
const showProveedorHint = ref(false)
const editId = ref<string | null>(null)
const initialSnapshot = ref('')

const form = ref({
  tipo: 'operacional' as string,
  categoria: '',
  monto: 0,
  descripcion: '',
  fecha: new Date().toISOString().slice(0, 10),
  proveedor: '',
  referencia: '',
  numeroFactura: '',
  fechaFactura: new Date().toISOString().slice(0, 10),
  libras: 0,
  valorPorLibra: 0,
  valorTotal: 0,
  valorPagado: 0,
  categoriaPersonalizada: '',
})

const facturaFile = ref<File | null>(null)
const providerQuery = ref('')

const currentSnapshot = computed(() => JSON.stringify(form.value))
const hasUnsavedChanges = computed(() => currentSnapshot.value !== initialSnapshot.value || !!facturaFile.value)

function syncSnapshot() {
  initialSnapshot.value = currentSnapshot.value
}

const categoriasDisponibles = computed(() => {
  if (!form.value.tipo) return []
  const cats = CATEGORIAS_POR_TIPO[form.value.tipo] || []
  return [...cats, 'Otro (especificar)']
})

const filtered = computed(() => {
  return gastos.value.filter((g) => {
    if (filtroTipo.value && g.tipo !== filtroTipo.value) return false
    if (filtroCategoria.value && g.categoria !== filtroCategoria.value) return false
    return true
  })
})

const proveedorSugeridos = computed(() => {
  const q = providerQuery.value.trim().toLowerCase()
  return proveedores.value
    .filter((p) => !q || p.nombre.toLowerCase().includes(q))
    .slice(0, 8)
})

const maxMes = computed(() => Math.max(1, ...(resumen.value?.porMes || []).map((m: any) => Number(m.total || 0))))
const maxCategoria = computed(() => Math.max(1, ...(resumen.value?.porCategoria || []).map((m: any) => Number(m.total || 0))))
const maxProveedor = computed(() => Math.max(1, ...(resumen.value?.porProveedor || []).map((m: any) => Number(m.total || 0))))
const resumenSeguro = computed(() => ({
  total: resumen.value?.total || { total: 0, facturas: 0, libras: 0 },
  porMes: resumen.value?.porMes || [],
  porCategoria: resumen.value?.porCategoria || [],
  porProveedor: resumen.value?.porProveedor || [],
}))

function formatMoney(n: number) {
  return '$' + Number(n || 0).toFixed(2)
}

function formatMonth(key: string) {
  const [yearRaw, monthRaw] = String(key || '').split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!year || !month) return key
  return new Date(year, month - 1, 1).toLocaleDateString('es-EC', { month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [data, resumenData] = await Promise.all([
      costosApi.list({
        tipo: filtroTipo.value || undefined,
        categoria: filtroCategoria.value || undefined,
        proveedor: filtroProveedor.value || undefined,
        desde: filtroDesde.value || undefined,
        hasta: filtroHasta.value || undefined,
        limit: 200,
      }),
      costosApi.resumen({
        tipo: filtroTipo.value || undefined,
        categoria: filtroCategoria.value || undefined,
        proveedor: filtroProveedor.value || undefined,
        desde: filtroDesde.value || undefined,
        hasta: filtroHasta.value || undefined,
      }),
    ])
    gastos.value = data.gastos
    resumen.value = resumenData.resumen
  } catch (e: any) {
    error.value = e.message || 'Error'
  } finally {
    loading.value = false
  }
}

async function loadProveedores() {
  try {
    const data = await proveedoresApi.list({ q: providerQuery.value || undefined, limit: 50 })
    proveedores.value = data.proveedores
  } catch {
    proveedores.value = []
  }
}

async function crearProveedorDesdeCampo() {
  const nombre = form.value.proveedor.trim()
  if (!nombre) return
  const existe = proveedores.value.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())
  if (existe) return
  savingProveedor.value = true
  try {
    await proveedoresApi.create({ nombre, tipo: form.value.tipo || 'general' })
    await loadProveedores()
    showProveedorHint.value = true
    setTimeout(() => (showProveedorHint.value = false), 1800)
  } catch (e: any) {
    error.value = e.message || 'No se pudo crear el proveedor'
  } finally {
    savingProveedor.value = false
  }
}

function resetForm() {
  form.value = {
    tipo: 'operacional',
    categoria: '',
    monto: 0,
    descripcion: '',
    fecha: new Date().toISOString().slice(0, 10),
    proveedor: '',
    referencia: '',
    numeroFactura: '',
    fechaFactura: new Date().toISOString().slice(0, 10),
    libras: 0,
    valorPorLibra: 0,
    valorTotal: 0,
    valorPagado: 0,
    categoriaPersonalizada: '',
  }
  editId.value = null
  facturaFile.value = null
  providerQuery.value = ''
}

function openCreate() {
  resetForm()
  showModal.value = true
  syncSnapshot()
}

function requestCloseModal() {
  if (hasUnsavedChanges.value) {
    showCloseConfirm.value = true
    return
  }
  showModal.value = false
}

function discardAndCloseModal() {
  showCloseConfirm.value = false
  showModal.value = false
  resetForm()
  syncSnapshot()
}

async function save() {
  const categoria = form.value.categoria === 'Otro (especificar)'
    ? form.value.categoriaPersonalizada
    : form.value.categoria
  if (!categoria || !form.value.descripcion || form.value.monto <= 0) {
    error.value = 'Completa todos los campos requeridos'
    return
  }
  try {
    if (editId.value) {
      await costosApi.update(editId.value, {
        tipo: form.value.tipo as any,
        categoria,
        monto: form.value.monto,
        descripcion: form.value.descripcion,
        proveedor: form.value.proveedor,
        referencia: form.value.referencia,
        numeroFactura: form.value.numeroFactura,
        fechaFactura: form.value.fechaFactura,
        libras: form.value.libras,
        valorPorLibra: form.value.valorPorLibra,
        valorTotal: form.value.valorTotal || form.value.monto,
        valorPagado: form.value.valorPagado,
      })
    } else {
      const created = await costosApi.create({
        tipo: form.value.tipo,
        categoria,
        monto: form.value.monto,
        descripcion: form.value.descripcion,
        fecha: form.value.fecha,
        proveedor: form.value.proveedor,
        referencia: form.value.referencia,
        numeroFactura: form.value.numeroFactura,
        fechaFactura: form.value.fechaFactura,
        libras: form.value.libras,
        valorPorLibra: form.value.valorPorLibra,
        valorTotal: form.value.valorTotal || form.value.monto,
        valorPagado: form.value.valorPagado,
      })
      if (facturaFile.value && created.gasto?._id) {
        await costosApi.uploadFactura(created.gasto._id, facturaFile.value)
      }
    }
    showModal.value = false
    resetForm()
    syncSnapshot()
    await load()
  } catch (e: any) {
    error.value = e.message || 'Error al guardar'
  }
}

async function remove(id: string) {
  if (!confirm('¿Eliminar este gasto?')) return
  try {
    await costosApi.remove(id)
    await load()
  } catch (e: any) {
    error.value = e.message || 'Error'
  }
}

function formatCurrency(n: number) {
  return '$' + n.toFixed(2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

const tipoLabel: Record<string, string> = {
  operacional: 'Operacional',
  logistico: 'Logístico',
  envio: 'Envío',
}

onMounted(load)
onMounted(loadProveedores)

watch([filtroTipo, filtroCategoria, filtroDesde, filtroHasta], load)
watch(filtroProveedor, load)
watch(providerQuery, () => loadProveedores())
watch(
  () => route.query.proveedor,
  (value) => {
    filtroProveedor.value = String(value || '')
  }
)
</script>

<template>
  <div class="costos-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Costos y Gastos</h1>
        <p class="page-subtitle">Registra costos operacionales, logísticos y de envío</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <i class="fa-solid fa-plus" /> Nuevo gasto
      </button>
    </div>

    <div class="toolbar">
      <div class="filter">
        <span>Tipo</span>
        <select v-model="filtroTipo" class="field-input">
          <option value="">Todos</option>
          <option value="operacional">Operacional</option>
          <option value="logistico">Logístico</option>
          <option value="envio">Envío</option>
        </select>
      </div>
      <div class="filter">
        <span>Categoría</span>
        <select v-model="filtroCategoria" class="field-input">
          <option value="">Todas</option>
          <option v-for="cat in categoriasDisponibles" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <div class="filter grow">
        <span>Proveedor</span>
        <div class="filter-inline">
          <input v-model="filtroProveedor" class="field-input" placeholder="Filtrar por proveedor" />
          <button type="button" class="btn-secondary" @click="router.push({ name: 'AdminProveedores' })">Gestionar</button>
        </div>
      </div>
      <div class="filter date-range">
        <AppDatePicker v-model="filtroDesde" label="Desde" />
        <AppDatePicker v-model="filtroHasta" label="Hasta" />
      </div>
    </div>

    <section v-if="resumenSeguro" class="summary-grid">
      <article class="summary-card accent">
        <span>Total gastado</span>
        <strong>{{ formatMoney(resumenSeguro.total.total) }}</strong>
        <small>{{ resumenSeguro.total.facturas }} facturas · {{ Number(resumenSeguro.total.libras || 0).toFixed(2) }} lbs</small>
      </article>
      <article class="summary-card">
        <span>Top categoría</span>
        <strong>{{ resumenSeguro.porCategoria[0]?._id || 'N/A' }}</strong>
        <small>{{ formatMoney(resumenSeguro.porCategoria[0]?.total || 0) }}</small>
      </article>
      <article class="summary-card">
        <span>Top proveedor</span>
        <strong>{{ resumenSeguro.porProveedor[0]?._id || 'N/A' }}</strong>
        <small>{{ formatMoney(resumenSeguro.porProveedor[0]?.total || 0) }}</small>
      </article>
    </section>

    <section v-if="resumenSeguro" class="insights-grid">
      <article class="insight-card">
        <h3>Gasto mes a mes</h3>
        <div class="bar-list">
          <div v-for="m in resumenSeguro.porMes" :key="m._id" class="bar-row">
            <span>{{ formatMonth(m._id) }}</span>
            <div class="bar-track"><div class="bar-fill" :style="{ width: `${(Number(m.total || 0) / maxMes) * 100}%` }"></div></div>
            <strong>{{ formatMoney(m.total) }}</strong>
          </div>
        </div>
      </article>
      <article class="insight-card">
        <h3>Por categoría</h3>
        <div class="bar-list compact">
          <div v-for="c in resumenSeguro.porCategoria.slice(0, 6)" :key="c._id" class="bar-row">
            <span>{{ c._id }}</span>
            <div class="bar-track"><div class="bar-fill category" :style="{ width: `${(Number(c.total || 0) / maxCategoria) * 100}%` }"></div></div>
            <strong>{{ formatMoney(c.total) }}</strong>
          </div>
        </div>
      </article>
      <article class="insight-card">
        <h3>Por proveedor</h3>
        <div class="bar-list compact">
          <div v-for="p in resumenSeguro.porProveedor.slice(0, 6)" :key="p._id" class="bar-row">
            <span>{{ p._id }}</span>
            <div class="bar-track"><div class="bar-fill provider" :style="{ width: `${(Number(p.total || 0) / maxProveedor) * 100}%` }"></div></div>
            <strong>{{ formatMoney(p.total) }}</strong>
          </div>
        </div>
      </article>
    </section>

    <div v-if="loading" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-row"></div>
    </div>
    <div v-else-if="error" class="alert error"><i class="fa-solid fa-circle-exclamation" /> {{ error }}</div>
    <div v-else-if="filtered.length === 0" class="empty">
      <i class="fa-solid fa-coins" />
      <p>No hay gastos registrados</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="gastos-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Factura</th>
            <th>Lbs</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Monto</th>
            <th>Proveedor</th>
            <th>Ref.</th>
            <th>Archivo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in filtered" :key="g._id">
            <td class="mono">{{ formatDate(g.fecha) }}</td>
            <td><span class="badge" :class="g.tipo">{{ tipoLabel[g.tipo] || g.tipo }}</span></td>
            <td>{{ g.categoria }}</td>
            <td>{{ g.descripcion }}</td>
            <td class="mono">{{ g.numeroFactura || '—' }}</td>
            <td class="mono">{{ Number(g.libras || 0).toFixed(2) }}</td>
            <td class="mono total">{{ formatCurrency(g.valorTotal || g.monto) }}</td>
            <td class="mono total">{{ formatCurrency(g.valorPagado || 0) }}</td>
            <td class="mono total">{{ formatCurrency(g.monto) }}</td>
            <td>{{ g.proveedor || '—' }}</td>
            <td class="mono">{{ g.referencia || '—' }}</td>
            <td>
              <a v-if="g.comprobanteUrl" :href="g.comprobanteUrl" target="_blank" class="file-link">Abrir</a>
              <span v-else>—</span>
            </td>
            <td>
              <button class="btn-icon danger" @click="remove(g._id)" title="Eliminar">
                <i class="fa-solid fa-trash-can" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="requestCloseModal">
        <div class="modal-card wide">
          <button class="modal-close-btn" type="button" aria-label="Cerrar modal" @click="requestCloseModal">
            <i class="fa-solid fa-xmark" />
          </button>
          <div class="modal-icon-box info"><i class="fa-solid fa-coins" /></div>
          <h3>{{ editId ? 'Editar' : 'Nuevo' }} gasto</h3>
          <form @submit.prevent="save" class="form-grid">
            <div class="form-field">
              <span>Tipo *</span>
              <AppSelect
                v-model="form.tipo"
                :options="[
                  { value: 'operacional', label: 'Operacional' },
                  { value: 'logistico', label: 'Logístico' },
                  { value: 'envio', label: 'Envío' },
                ]"
                placeholder="Seleccionar tipo"
              />
            </div>
            <div class="form-field">
              <span>Categoría *</span>
              <AppSelect
                v-model="form.categoria"
                :options="categoriasDisponibles"
                placeholder="Seleccionar categoría"
              />
            </div>
            <div v-if="form.categoria === 'Otro (especificar)'" class="form-field">
              <span>Especificar categoría *</span>
              <input v-model="form.categoriaPersonalizada" class="field-input" placeholder="Nueva categoría" />
            </div>
            <div class="form-field">
              <span>Descripción *</span>
              <input v-model="form.descripcion" class="field-input" placeholder="Ej: Pago de renta enero" />
            </div>
            <div class="form-field">
              <span>Monto USD *</span>
              <input v-model.number="form.monto" type="number" step="0.01" min="0" class="field-input" />
            </div>
            <div class="form-field">
              <AppDatePicker v-model="form.fecha" label="Fecha" />
            </div>
            <div class="form-field full-width provider-field">
              <div class="provider-head">
                <span>Proveedor</span>
                <button type="button" class="provider-save-btn" :disabled="savingProveedor || !form.proveedor.trim()" @click="crearProveedorDesdeCampo">
                  <i class="fa-solid fa-plus" /> Crear proveedor
                </button>
              </div>
              <input v-model="form.proveedor" class="field-input" placeholder="Nombre o empresa" @input="providerQuery = form.proveedor" />
              <div v-if="showProveedorHint" class="provider-hint success">Proveedor guardado y disponible para futuros gastos.</div>
              <div v-if="proveedorSugeridos.length" class="provider-chips">
                <button v-for="p in proveedorSugeridos" :key="p._id" type="button" class="provider-chip" @click="form.proveedor = p.nombre">
                  {{ p.nombre }}
                </button>
              </div>
            </div>
            <div class="form-field">
              <span>Referencia</span>
              <input v-model="form.referencia" class="field-input" placeholder="Factura # o código" />
            </div>
            <div class="form-field">
              <span>Número de factura</span>
              <input v-model="form.numeroFactura" class="field-input" placeholder="F001-001-000123" />
            </div>
            <div class="form-field">
              <AppDatePicker v-model="form.fechaFactura" label="Fecha factura" />
            </div>
            <div class="form-field">
              <span>Libras</span>
              <input v-model.number="form.libras" type="number" min="0" step="0.01" class="field-input" />
            </div>
            <div class="form-field">
              <span>Valor por libra</span>
              <input v-model.number="form.valorPorLibra" type="number" min="0" step="0.01" class="field-input" />
            </div>
            <div class="form-field">
              <span>Valor total</span>
              <input v-model.number="form.valorTotal" type="number" min="0" step="0.01" class="field-input" />
            </div>
            <div class="form-field">
              <span>Valor pagado</span>
              <input v-model.number="form.valorPagado" type="number" min="0" step="0.01" class="field-input" />
            </div>
            <div class="form-field full-width">
              <AppFileUpload
                v-model="facturaFile"
                label="Factura / comprobante"
                accept="image/*,.pdf"
                hint="Sube una foto legible o el PDF. Cloudinary lo guardará al enviar el formulario."
                variant="proof"
              />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-ghost" @click="requestCloseModal">Cancelar</button>
              <button type="submit" class="btn-primary">{{ editId ? 'Actualizar' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showCloseConfirm" class="modal-overlay confirm-overlay" @click.self="showCloseConfirm = false">
        <div class="modal-card confirm-card">
          <div class="modal-icon-box warn"><i class="fa-solid fa-triangle-exclamation" /></div>
          <h3>¿Seguro que quieres cerrar?</h3>
          <p>Perderás el progreso no guardado.</p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="showCloseConfirm = false">Seguir editando</button>
            <button type="button" class="btn-primary" @click="discardAndCloseModal">Sí, cerrar</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.costos-page {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-4;
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
  flex-wrap: wrap;
  gap: $space-4;
}

.filter {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: $space-2;
  color: $ink-300;
  font-size: 0.9rem;
}

.date-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: $space-3;
  flex: 1 1 380px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-4;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.summary-card,
.insight-card {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.12);
  border-radius: 18px;
  padding: $space-5;
}

.summary-card {
  span {
    color: $ink-400;
    font-size: 0.8rem;
  }

  strong {
    display: block;
    margin-top: $space-2;
    font-size: 1.6rem;
    color: $fg-dark;
  }

  small {
    color: $ink-400;
  }

  &.accent {
    background: linear-gradient(180deg, rgba($brand-orange, 0.15), rgba($ink-900, 0.95));
    border-color: rgba($brand-orange, 0.2);

    strong {
      color: $brand-orange;
    }
  }
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-4;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.insight-card h3 {
  margin: 0 0 $space-4;
  font-size: 1rem;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;

  &.compact .bar-row span {
    max-width: 140px;
  }
}

.bar-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: center;
  gap: $space-3;

  span {
    color: $ink-300;
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.82rem;
    color: $fg-dark;
  }
}

.bar-track {
  height: 10px;
  border-radius: 999px;
  background: rgba($ink-700, 0.75);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, $brand-orange, lighten($brand-orange, 12%));

  &.category {
    background: linear-gradient(90deg, #7c9cff, #9cb3ff);
  }

  &.provider {
    background: linear-gradient(90deg, #7fd8c7, #9ae6b4);
  }
}

.field-input {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.2);
  border-radius: 10px;
  padding: $space-2 $space-3;
  color: $fg-dark;
  font-family: inherit;
  outline: none;
  &:focus { border-color: $brand-orange; }
}

.provider-field {
  background: rgba($ink-1000, 0.25);
  border: 1px solid rgba($ink-500, 0.08);
  border-radius: 16px;
  padding: $space-4;
}

.provider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;

  span {
    color: $ink-300;
    font-size: 0.8rem;
    font-weight: 600;
  }
}

.provider-save-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 0.55rem 0.85rem;
  border: 1px solid rgba($brand-orange, 0.25);
  border-radius: 12px;
  background: rgba($brand-orange, 0.12);
  color: $brand-orange;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.provider-hint {
  margin-top: $space-2;
  font-size: 0.8rem;

  &.success {
    color: #9ae6b4;
  }
}

.provider-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: $space-3;
}

.provider-chip {
  border: 1px solid rgba($ink-500, 0.18);
  background: rgba($ink-700, 0.55);
  color: $ink-200;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;

  &:hover {
    border-color: rgba($brand-orange, 0.3);
    color: $fg-dark;
  }
}

.loading, .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  padding: $space-12 0;
  color: $ink-500;
  i { font-size: 1.5rem; }
}

.skeleton-list { display: flex; flex-direction: column; gap: $space-3; }
.skeleton-row { height: 58px; border-radius: 14px; background: linear-gradient(90deg, rgba($ink-700,.7), rgba($ink-600,.7), rgba($ink-700,.7)); background-size: 200% 100%; animation: shimmer 1.4s infinite; }

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

.gastos-table {
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
  tbody tr:last-child td { border-bottom: none; }
  .mono { font-variant-numeric: tabular-nums; }
  .total { color: $brand-orange; font-weight: 700; }
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  &.operacional { background: rgba($brand-orange, 0.12); color: $brand-orange; }
  &.logistico { background: rgba(#4fc3f7, 0.12); color: #4fc3f7; }
  &.envio { background: rgba(#81c784, 0.12); color: #81c784; }
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: $ink-400;
  transition: all 0.2s;
  &.danger:hover { background: rgba($signal-red, 0.1); color: #ff8a8f; }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 0.6rem 1.25rem;
  background: $brand-orange;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  &:hover { background: darken($brand-orange, 8%); }
}

.btn-ghost {
  padding: 0.6rem 1.25rem;
  background: transparent;
  border: 1px solid rgba($ink-500, 0.3);
  border-radius: 10px;
  color: $ink-300;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  &:hover { background: rgba($ink-500, 0.15); color: $fg-dark; }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba($ink-1000, 0.75);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-4;

  @media (max-width: 640px) {
    align-items: flex-start;
    padding: $space-2;
  }
}

.modal-card.wide {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.15);
  border-radius: 20px;
  padding: $space-8;
  max-width: 600px;
  width: 100%;
  text-align: left;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  position: relative;

  @media (max-width: 640px) {
    max-width: none;
    padding: $space-4;
    border-radius: 16px;
    max-height: calc(100vh - 1rem);
    width: 100%;
    margin-top: $space-2;
  }

  .modal-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto $space-4;
    font-size: 1.2rem;
    &.info { background: rgba($brand-orange, 0.12); color: $brand-orange; }
  }

  h3 { text-align: center; font-size: 1.15rem; margin: 0 0 $space-6; }

  @media (max-width: 640px) {
    h3 { font-size: 1.05rem; margin-bottom: $space-4; }
  }
}

.modal-close-btn {
  position: absolute;
  top: $space-3;
  right: $space-3;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba($ink-500, 0.18);
  border-radius: 10px;
  background: rgba($ink-800, 0.8);
  color: $ink-300;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: $fg-dark;
    border-color: rgba($signal-red, 0.35);
    background: rgba($signal-red, 0.12);
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-4;
  @media (max-width: 640px) { grid-template-columns: 1fr; gap: $space-3; }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  span { font-size: 0.8rem; color: $ink-400; font-weight: 500; }
}

.full-width { grid-column: 1 / -1; }

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: $space-3;
  margin-top: $space-2;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
}

.confirm-card {
  max-width: 420px !important;
  text-align: center !important;

  .modal-icon-box.warn {
    background: rgba($signal-red, 0.12);
    color: #ff8a8f;
  }

  p {
    margin: 0 0 $space-5;
    color: $ink-300;
  }
}

.file-link {
  color: $brand-orange;
  text-decoration: none;
  font-weight: 600;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
