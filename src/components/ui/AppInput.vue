<script setup lang="ts">
import { computed } from "vue";

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  type?: string;
  inputmode?: "text" | "search" | "numeric" | "email" | "tel" | "url";
  autocomplete?: string;
  disabled?: boolean;
  error?: string;
  large?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  large: false,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  enter: [];
}>();

const onInput = (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value);
const onKeyup = (e: KeyboardEvent) => { if (e.key === "Enter") emit("enter"); };

const fieldId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2, 9)}`);
</script>

<template>
  <div :class="['field', { 'field--large': large, 'has-error': !!error }]">
    <label v-if="label" :for="fieldId" class="field__label">{{ label }}</label>
    <div class="field__control">
      <input
        :id="fieldId"
        :type="type"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="onInput"
        @keyup="onKeyup"
      />
      <slot name="action" />
    </div>
    <p v-if="error" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/tokens/colors" as *;
@use "@/styles/tokens/space" as *;
@use "@/styles/tokens/motion" as *;

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;

  &__label {
    font-size: 0.75rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  &__control {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: $radius-md;
    transition: border-color $dur-base $ease-out-expo, background $dur-base $ease-out-expo;
    padding: 0.25rem;

    &:focus-within {
      border-color: $brand-orange;
      background: var(--surface);
    }

    input {
      flex: 1 1 0;
      min-width: 0;
      background: transparent;
      border: 0;
      outline: 0;
      padding: 0.85rem 1rem;
      font-size: 1rem;
      color: var(--fg);
      letter-spacing: 0;

      &::placeholder { color: var(--fg-faint); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
  }

  &--large {
    .field__control {
      // On very small screens, stack input + button vertically
      @media (max-width: 479px) {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        padding: 0.5rem;
      }

      input {
        padding: 1.1rem 1.25rem;
        // Mobile-first: starts at 1.1rem and scales up
        font-size: clamp(1rem, 3.5vw, 1.5rem);
        font-family: "Fraunces", serif;
        letter-spacing: -0.01em;
      }

      // When stacked, make the slot (button) full-width
      @media (max-width: 479px) {
        :deep(button), :slotted(button) {
          width: 100%;
          border-radius: $radius-md;
        }
      }
    }
  }

  &.has-error .field__control { border-color: $signal-red; }

  &__error {
    font-size: 0.875rem;
    color: $signal-red;
  }
}
</style>
