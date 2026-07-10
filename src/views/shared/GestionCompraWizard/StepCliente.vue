<template>
  <div class="step-cliente">
    <h3 class="step__title">Buscar o crear cliente</h3>

    <!-- Search -->
    <div class="search-box">
      <AppInput
        v-model="query"
        label="Buscar por nombre, email o teléfono"
        placeholder="Ej: Juan Pérez..."
        @input="onSearch"
      />
      <div v-if="loading" class="search-hint">Buscando...</div>
      <div v-else-if="results.length" class="search-results">
        <button
          v-for="c in results"
          :key="c._id"
          class="result-item"
          :class="{ selected: selected?._id === c._id }"
          @click="selectContacto(c)"
        >
          <span class="result-name">{{ c.nombre }}</span>
          <span class="result-meta">{{ c.email ?? '' }}{{ c.telefono ? ` · ${c.telefono}` : '' }}</span>
        </button>
      </div>
      <div v-else-if="query.length >= 2 && !loading" class="search-hint muted">
        No encontrado — puedes crear uno nuevo abajo.
      </div>
    </div>

    <!-- Selected -->
    <div v-if="selected" class="selected-card">
      <span class="selected-label">Cliente seleccionado:</span>
      <strong>{{ selected.nombre }}</strong>
      <span v-if="selected.email" class="muted"> · {{ selected.email }}</span>
      <span v-if="selected.telefono" class="muted"> · {{ selected.telefono }}</span>
      <button class="btn-clear" @click="clearSelected">Cambiar</button>
    </div>

    <!-- Create new -->
    <div v-if="!selected" class="create-section">
      <button class="btn-toggle-create" @click="showCreate = !showCreate">
        {{ showCreate ? '▲ Ocultar formulario' : '+ Crear nuevo cliente' }}
      </button>

      <div v-if="showCreate" class="create-form">
        <AppInput v-model="newForm.nombre" label="Nombre completo *" placeholder="Juan Pérez" />
        <AppInput v-model="newForm.email" label="Email" placeholder="juan@email.com" type="email" />
        <AppInput v-model="newForm.telefono" label="Teléfono" placeholder="+593..." />
        <AppInput v-model="newForm.notas" label="Notas" placeholder="Información adicional..." />
        <AppButton variant="primary" :disabled="!newForm.nombre.trim() || creating" @click="createContacto">
          {{ creating ? 'Creando...' : 'Crear cliente' }}
        </AppButton>
        <p v-if="createError" class="field-error">{{ createError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { contactosCbAPI } from '@/services/contactos_cb.api'
import type { Contacto } from '@/services/gestiones_compra.api'
import { useGestionCompraFormStore } from '@/stores/gestion_compra_form.store'

const store = useGestionCompraFormStore()

const query = ref('')
const results = ref<Contacto[]>([])
const loading = ref(false)
const selected = ref<Contacto | null>(store.formData.contacto)
const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')

const newForm = ref({ nombre: '', email: '', telefono: '', notas: '' })

let debounceTimer: ReturnType<typeof setTimeout>

function onSearch() {
  clearTimeout(debounceTimer)
  if (query.value.length < 2) { results.value = []; return }
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      results.value = await contactosCbAPI.search(query.value)
    } finally {
      loading.value = false
    }
  }, 300)
}

function selectContacto(c: Contacto) {
  selected.value = c
  store.setContacto(c)
  results.value = []
  query.value = ''
}

function clearSelected() {
  selected.value = null
  store.formData.contactoId = ''
  store.formData.contacto = null
}

async function createContacto() {
  if (!newForm.value.nombre.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const c = await contactosCbAPI.create(newForm.value)
    selectContacto(c)
    showCreate.value = false
    newForm.value = { nombre: '', email: '', telefono: '', notas: '' }
  } catch (e: any) {
    createError.value = e?.message ?? 'Error al crear contacto'
  } finally {
    creating.value = false
  }
}

defineExpose({ isValid: () => !!store.formData.contactoId })
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.step-cliente { display: flex; flex-direction: column; gap: $space-4; }
.step__title { color: $fg-dark; font-size: 1.1rem; margin: 0 0 $space-2; }
.search-box { display: flex; flex-direction: column; gap: $space-2; }
.search-results {
  display: flex; flex-direction: column; gap: $space-1;
  border: 1px solid $ink-500; border-radius: 8px; overflow: hidden;
}
.result-item {
  display: flex; flex-direction: column; gap: 2px;
  padding: $space-3 $space-4; background: $ink-900; border: none;
  cursor: pointer; text-align: left; color: $fg-dark;
  transition: background 0.15s;
  &:hover, &.selected { background: $ink-700; }
}
.result-name { font-weight: 600; }
.result-meta { font-size: 0.8rem; color: $ink-300; }
.search-hint { font-size: 0.85rem; color: $ink-400; }
.muted { color: $ink-400; }
.selected-card {
  display: flex; align-items: center; gap: $space-2; flex-wrap: wrap;
  padding: $space-3 $space-4; background: $ink-700; border-radius: 8px;
  border: 1px solid $brand-orange;
}
.selected-label { font-size: 0.8rem; color: $ink-300; }
.btn-clear {
  margin-left: auto; background: none; border: none; color: $brand-orange;
  cursor: pointer; font-size: 0.85rem; text-decoration: underline;
}
.btn-toggle-create {
  background: none; border: 1px dashed $ink-500; color: $ink-300;
  padding: $space-2 $space-4; border-radius: 8px; cursor: pointer;
  width: 100%; text-align: center; font-size: 0.9rem;
  &:hover { border-color: $brand-orange; color: $brand-orange; }
}
.create-form { display: flex; flex-direction: column; gap: $space-3; padding-top: $space-2; }
.field-error { color: $signal-red; font-size: 0.82rem; margin: 0; }
</style>
