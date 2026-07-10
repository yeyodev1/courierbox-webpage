<template>
  <div class="step-fecha">
    <h3 class="step__title">Fecha tentativa de entrega</h3>
    <p class="step__desc">¿Cuándo estimas que el producto llegará al cliente?</p>

    <div class="field-group">
      <label class="field-label">Fecha tentativa *</label>
      <input
        v-model="store.formData.fechaEntregaTentativa"
        type="date"
        class="date-input"
        :min="minDate"
      />
    </div>

    <div v-if="store.formData.fechaEntregaTentativa" class="date-preview">
      <span class="date-icon">📅</span>
      <span>{{ fechaFormateada }}</span>
    </div>

    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGestionCompraFormStore } from '@/stores/gestion_compra_form.store'

const store = useGestionCompraFormStore()
const error = ref('')

const minDate = computed(() => new Date().toISOString().split('T')[0])

const fechaFormateada = computed(() => {
  if (!store.formData.fechaEntregaTentativa) return ''
  return new Date(store.formData.fechaEntregaTentativa + 'T00:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

defineExpose({
  isValid() {
    if (!store.formData.fechaEntregaTentativa) {
      error.value = 'Selecciona una fecha tentativa de entrega'
      return false
    }
    error.value = ''
    return true
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;
.step-fecha { display: flex; flex-direction: column; gap: $space-4; }
.step__title { color: $fg-dark; font-size: 1.1rem; margin: 0; }
.step__desc { color: $ink-300; font-size: 0.9rem; margin: 0; }
.field-group { display: flex; flex-direction: column; gap: $space-2; }
.field-label { color: $ink-300; font-size: 0.85rem; font-weight: 600; }
.date-input {
  background: $ink-700; border: 1px solid $ink-500; border-radius: 10px;
  color: $fg-dark; padding: $space-3 $space-4; font-size: 1rem;
  outline: none; max-width: 260px;
  &:focus { border-color: $brand-orange; }
  color-scheme: dark;
}
.date-preview {
  display: flex; align-items: center; gap: $space-2;
  padding: $space-3 $space-4; background: $ink-700; border-radius: 8px;
  font-size: 0.9rem; color: $ink-300; text-transform: capitalize;
}
.field-error { color: $signal-red; font-size: 0.82rem; }
</style>
