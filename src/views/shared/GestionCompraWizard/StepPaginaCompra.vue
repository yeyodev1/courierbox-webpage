<template>
  <div class="step-pagina">
    <h3 class="step__title">Página de compra</h3>
    <p class="step__desc">Ingresa la URL o nombre de la tienda donde se realizará la compra.</p>

    <AppInput
      v-model="store.formData.paginaCompra"
      label="URL o nombre de la tienda *"
      placeholder="https://amazon.com/... o Amazon, Shein, etc."
    />

    <div v-if="isUrl" class="url-preview">
      <span class="url-icon">🔗</span>
      <a :href="store.formData.paginaCompra" target="_blank" rel="noopener" class="url-link">
        {{ store.formData.paginaCompra }}
      </a>
    </div>

    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useGestionCompraFormStore } from '@/stores/gestion_compra_form.store'

const store = useGestionCompraFormStore()
const error = ref('')

const isUrl = computed(() => {
  try { new URL(store.formData.paginaCompra); return true } catch { return false }
})

defineExpose({
  isValid() {
    if (!store.formData.paginaCompra.trim()) {
      error.value = 'Ingresa la página o tienda de compra'
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
.step-pagina { display: flex; flex-direction: column; gap: $space-4; }
.step__title { color: $fg-dark; font-size: 1.1rem; margin: 0; }
.step__desc { color: $ink-300; font-size: 0.9rem; margin: 0; }
.url-preview {
  display: flex; align-items: center; gap: $space-2;
  padding: $space-2 $space-4; background: $ink-700; border-radius: 8px;
}
.url-link { color: $brand-orange; font-size: 0.85rem; word-break: break-all; }
.field-error { color: $signal-red; font-size: 0.82rem; }
</style>
