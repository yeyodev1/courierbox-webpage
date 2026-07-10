<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Cuentas Bancarias</h1>
        <p class="page-sub">Configura las cuentas de la empresa para recibir reservas</p>
      </div>
      <AppButton variant="primary" @click="openCreate">+ Nueva cuenta</AppButton>
    </div>

    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skeleton-item"></div>
    </div>

    <div v-else class="cuenta-list">
      <div v-for="c in cuentas" :key="c._id" class="cuenta-card" :class="{ inactive: !c.activa }">
        <div class="cuenta-info">
          <span class="banco">{{ c.banco }}</span>
          <span class="numero">{{ c.numeroCuenta }}</span>
          <span class="titular">{{ c.titular }}</span>
          <span class="tipo-chip">{{ c.tipoCuenta }}</span>
          <span v-if="!c.activa" class="inactive-chip">Inactiva</span>
        </div>
        <div class="cuenta-actions">
          <AppButton variant="ghost" size="sm" @click="openEdit(c)">Editar</AppButton>
          <AppButton variant="ghost" size="sm" @click="toggleActive(c)">
            {{ c.activa ? 'Desactivar' : 'Activar' }}
          </AppButton>
        </div>
      </div>
      <div v-if="!cuentas.length" class="empty-state">
        No hay cuentas bancarias configuradas.
      </div>
    </div>

    <!-- Modal crear/editar -->
    <AppModal :show="showModal" @close="showModal = false" title="Cuenta Bancaria">
      <div class="form-grid">
        <AppInput v-model="form.banco" label="Banco *" placeholder="Ej: Banco Pichincha" />
        <AppInput v-model="form.numeroCuenta" label="Número de cuenta *" placeholder="2200123456" />
        <AppInput v-model="form.titular" label="Titular *" placeholder="Courier Box Logistics" />
        <AppSelect
          v-model="form.tipoCuenta"
          label="Tipo de cuenta"
          :options="['corriente', 'ahorros']"
        />
      </div>
      <template #footer>
        <AppButton variant="outline" @click="showModal = false">Cancelar</AppButton>
        <AppButton variant="primary" @click="saveCuenta" :disabled="saving">
          {{ saving ? 'Guardando...' : (editId ? 'Actualizar' : 'Crear') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { cuentasBancariasAPI } from '@/services/cuentas_bancarias.api'
import { useToastStore } from '@/stores/toast.store'
import type { CuentaBancaria } from '@/services/gestiones_compra.api'

const toast = useToastStore()
const cuentas = ref<CuentaBancaria[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const editId = ref<string | null>(null)

const form = ref({ banco: '', numeroCuenta: '', titular: '', tipoCuenta: 'corriente' as 'corriente' | 'ahorros' })

async function load() {
  loading.value = true
  try { cuentas.value = await cuentasBancariasAPI.list(false) }
  finally { loading.value = false }
}

function openCreate() {
  editId.value = null
  form.value = { banco: '', numeroCuenta: '', titular: '', tipoCuenta: 'corriente' }
  showModal.value = true
}

function openEdit(c: CuentaBancaria) {
  editId.value = c._id
  form.value = { banco: c.banco, numeroCuenta: c.numeroCuenta, titular: c.titular, tipoCuenta: c.tipoCuenta }
  showModal.value = true
}

async function saveCuenta() {
  if (!form.value.banco || !form.value.numeroCuenta || !form.value.titular) {
    toast.showNotification('Completa todos los campos requeridos', 'error')
    return
  }
  saving.value = true
  try {
    if (editId.value) {
      await cuentasBancariasAPI.update(editId.value, form.value)
    } else {
      await cuentasBancariasAPI.create(form.value)
    }
    toast.showNotification('Cuenta guardada', 'success')
    showModal.value = false
    await load()
  } catch (e: any) {
    toast.showNotification(e?.message ?? 'Error', 'error')
  } finally {
    saving.value = false
  }
}

async function toggleActive(c: CuentaBancaria) {
  try {
    await cuentasBancariasAPI.update(c._id, { activa: !c.activa })
    await load()
  } catch (e: any) {
    toast.showNotification(e?.message ?? 'Error', 'error')
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;
.page { display: flex; flex-direction: column; gap: $space-5; padding: $space-6; max-width: 800px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: $space-4; }
.page-title { color: $fg-dark; font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-sub { color: $ink-300; font-size: 0.88rem; margin: $space-1 0 0; }

.cuenta-list { display: flex; flex-direction: column; gap: $space-3; }
.cuenta-card {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: $space-3; padding: $space-4 $space-5;
  background: $ink-900; border: 1px solid $ink-500; border-radius: 12px;
  &.inactive { opacity: 0.5; }
}
.cuenta-info { display: flex; align-items: center; flex-wrap: wrap; gap: $space-3; }
.banco { font-weight: 700; color: $fg-dark; }
.numero { font-size: 0.85rem; color: $ink-300; }
.titular { font-size: 0.85rem; color: $ink-400; }
.tipo-chip {
  font-size: 0.72rem; background: $ink-700; color: $ink-300;
  padding: 2px 8px; border-radius: 4px;
}
.inactive-chip {
  font-size: 0.72rem; background: rgba(229,72,77,0.15); color: $signal-red;
  padding: 2px 8px; border-radius: 4px;
}
.cuenta-actions { display: flex; gap: $space-2; }
.form-grid { display: flex; flex-direction: column; gap: $space-4; }
.empty-state { color: $ink-400; padding: $space-6; text-align: center; }
.skeleton-list { display: flex; flex-direction: column; gap: $space-3; }
.skeleton-item { height: 72px; background: $ink-700; border-radius: 12px; animation: pulse 1.4s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
