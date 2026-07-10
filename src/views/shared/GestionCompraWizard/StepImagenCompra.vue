<template>
  <div class="step-imagen">
    <h3 class="step__title">Imagen de la compra</h3>
    <p class="step__desc">Sube una captura de pantalla o comprobante de la compra realizada.</p>

    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragging, 'has-file': !!preview }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />

      <template v-if="preview">
        <img :src="preview" alt="Preview" class="preview-img" />
        <button class="btn-remove" @click.stop="removeFile">Quitar imagen</button>
      </template>
      <template v-else>
        <span class="drop-icon">🖼️</span>
        <p class="drop-text">Arrastra una imagen o <strong>haz clic para seleccionar</strong></p>
        <p class="drop-hint">JPG, PNG, WEBP — máx. 10 MB</p>
      </template>
    </div>

    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar" :style="{ width: uploadPct + '%' }"></div>
      <span>Subiendo... {{ uploadPct }}%</span>
    </div>

    <p v-if="uploadError" class="field-error">{{ uploadError }}</p>

    <p class="skip-hint">Esta imagen se enviará al cliente con su notificación.</p>

    <div v-if="store.formData.notas !== undefined" class="notas-group">
      <label class="field-label">Notas adicionales (opcional)</label>
      <textarea
        v-model="store.formData.notas"
        class="notas-input"
        placeholder="Observaciones, detalles especiales..."
        rows="3"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGestionCompraFormStore } from '@/stores/gestion_compra_form.store'
import { gestionesCompraAPI } from '@/services/gestiones_compra.api'

const store = useGestionCompraFormStore()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const preview = ref<string>(store.formData.imagenCompraUrl || '')
const uploading = ref(false)
const uploadPct = ref(0)
const uploadError = ref('')

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) processFile(file)
}

async function processFile(file: File) {
  store.formData.imagenCompraFile = file
  preview.value = URL.createObjectURL(file)
  uploadError.value = ''
  uploading.value = true
  uploadPct.value = 30

  try {
    const url = await gestionesCompraAPI.uploadImagen(file)
    store.formData.imagenCompraUrl = url
    uploadPct.value = 100
  } catch (e: any) {
    uploadError.value = e?.message ?? 'Error al subir la imagen'
    preview.value = ''
    store.formData.imagenCompraUrl = ''
  } finally {
    uploading.value = false
  }
}

function removeFile() {
  preview.value = ''
  store.formData.imagenCompraUrl = ''
  store.formData.imagenCompraFile = null
  if (fileInput.value) fileInput.value.value = ''
}

// Image is optional — always valid
defineExpose({ isValid: () => true })
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;
.step-imagen { display: flex; flex-direction: column; gap: $space-4; }
.step__title { color: $fg-dark; font-size: 1.1rem; margin: 0; }
.step__desc { color: $ink-300; font-size: 0.9rem; margin: 0; }
.drop-zone {
  border: 2px dashed $ink-500; border-radius: 12px;
  padding: $space-6 $space-4; display: flex; flex-direction: column;
  align-items: center; gap: $space-2; cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  &:hover, &.drag-over { border-color: $brand-orange; background: rgba(240,138,31,0.04); }
  &.has-file { border-style: solid; border-color: $brand-orange; padding: $space-4; }
}
.hidden { display: none; }
.drop-icon { font-size: 2.5rem; }
.drop-text { color: $ink-300; text-align: center; margin: 0; }
.drop-hint { color: $ink-400; font-size: 0.8rem; margin: 0; }
.preview-img { max-width: 100%; max-height: 280px; border-radius: 8px; object-fit: contain; }
.btn-remove {
  background: rgba(229,72,77,0.15); border: 1px solid $signal-red;
  color: $signal-red; padding: $space-1 $space-3; border-radius: 6px;
  cursor: pointer; font-size: 0.82rem;
  &:hover { background: rgba(229,72,77,0.25); }
}
.upload-progress {
  position: relative; background: $ink-700; border-radius: 4px; height: 6px;
  span { display: none; }
}
.progress-bar { height: 100%; background: $brand-orange; border-radius: 4px; transition: width 0.3s; }
.skip-hint { font-size: 0.8rem; color: $ink-400; }
.notas-group { display: flex; flex-direction: column; gap: $space-2; }
.field-label { color: $ink-300; font-size: 0.85rem; font-weight: 600; }
.notas-input {
  background: $ink-700; border: 1px solid $ink-500; border-radius: 8px;
  color: $fg-dark; padding: $space-3; outline: none; resize: vertical;
  font-size: 0.9rem; line-height: 1.5;
  &:focus { border-color: $brand-orange; }
}
.field-error { color: $signal-red; font-size: 0.82rem; }
</style>
