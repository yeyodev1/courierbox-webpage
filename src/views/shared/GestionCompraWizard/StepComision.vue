<template>
  <div class="step-comision">
    <h3 class="step__title">Valor de comisión</h3>
    <p class="step__desc">La comisión se calculó automáticamente según la regla activa. Puedes ajustarla.</p>

    <div v-if="loading" class="loading-msg">Calculando comisión...</div>
    <template v-else>
      <div class="rule-info" v-if="feeConfigNombre">
        Regla aplicada: <strong>{{ feeConfigNombre }}</strong>
      </div>

      <div class="input-group">
        <span class="currency-prefix">$</span>
        <input
          v-model.number="store.formData.valorComision"
          type="number"
          min="0"
          step="0.01"
          class="money-input"
          placeholder="0.00"
        />
      </div>

      <div v-if="store.formData.valorTotal" class="summary-row">
        <span>Valor total:</span><strong>${{ (store.formData.valorTotal ?? 0).toFixed(2) }}</strong>
        <span>Comisión:</span><strong class="orange">${{ (store.formData.valorComision ?? 0).toFixed(2) }}</strong>
      </div>

      <p v-if="error" class="field-error">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGestionCompraFormStore } from '@/stores/gestion_compra_form.store'
import { gestionesCompraAPI } from '@/services/gestiones_compra.api'

const store = useGestionCompraFormStore()
const loading = ref(true)
const error = ref('')
const feeConfigNombre = ref(store.formData.feeConfigNombre ?? '')

onMounted(async () => {
  if (store.formData.valorComision !== null) {
    loading.value = false
    return
  }
  try {
    const result = await gestionesCompraAPI.getComisionPreview(
      store.formData.valorTotal ?? 0,
      store.formData.feeConfigId || undefined
    )
    store.setComision(result.valorComision, store.formData.feeConfigId, result.feeConfigNombre)
    feeConfigNombre.value = result.feeConfigNombre
  } catch {
    store.formData.valorComision = 0
  } finally {
    loading.value = false
  }
})

defineExpose({
  isValid() {
    if (store.formData.valorComision === null || store.formData.valorComision < 0) {
      error.value = 'Ingresa el valor de comisión (puede ser 0)'
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
.step-comision { display: flex; flex-direction: column; gap: $space-4; }
.step__title { color: $fg-dark; font-size: 1.1rem; margin: 0; }
.step__desc { color: $ink-300; font-size: 0.9rem; margin: 0; }
.loading-msg { color: $ink-400; }
.rule-info {
  background: $ink-700; padding: $space-2 $space-4; border-radius: 8px;
  font-size: 0.85rem; color: $ink-300;
}
.input-group {
  display: flex; align-items: center;
  background: $ink-700; border: 1px solid $ink-500; border-radius: 10px;
  overflow: hidden; max-width: 240px;
}
.currency-prefix {
  padding: 0 $space-3; color: $brand-orange; font-size: 1.2rem; font-weight: 700;
  border-right: 1px solid $ink-500;
}
.money-input {
  flex: 1; background: none; border: none; outline: none;
  color: $fg-dark; font-size: 1.3rem; font-weight: 700;
  padding: $space-2 $space-3;
  &::placeholder { color: $ink-500; }
}
.summary-row {
  display: grid; grid-template-columns: auto 1fr auto 1fr;
  gap: $space-2 $space-4; align-items: center;
  background: $ink-900; border-radius: 8px; padding: $space-3 $space-4;
  color: $ink-300; font-size: 0.9rem;
  strong { color: $fg-dark; }
  .orange { color: $brand-orange; }
}
.field-error { color: $signal-red; font-size: 0.82rem; }
</style>
