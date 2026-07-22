<template>
  <div class="bodega-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><i class="fa-solid fa-warehouse" aria-hidden="true" /></span>
        <div class="brand-copy">
          <strong>Courier Box</strong>
          <span>Bodega</span>
        </div>
      </div>
      <nav class="nav">
        <router-link to="/bodega" exact-active-class="active"><i class="fa-solid fa-box" aria-hidden="true" /> Compras</router-link>
        <router-link to="/bodega/envios" active-class="active"><i class="fa-solid fa-truck-fast" aria-hidden="true" /> Envíos</router-link>
      </nav>
      <div class="user">
        <span class="name">{{ userName }}</span>
        <button class="logout" @click="auth.logout()" aria-label="Salir"><i class="fa-solid fa-right-from-bracket" aria-hidden="true" /></button>
      </div>
    </header>
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const userName = computed(() => auth.currentUser?.name || auth.profile?.name || 'Bodega')
onMounted(() => { if (!auth.profile) auth.bootstrap() })
</script>

<style scoped lang="scss">
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

.bodega-shell { min-height: 100vh; background: $ink-1000; display: flex; flex-direction: column; }
.topbar {
  position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: $space-4;
  padding: $space-4; background: $ink-900; border-bottom: 1px solid $ink-700; flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: $space-3; }
.brand-mark { width: 40px; height: 40px; border-radius: 12px; background: $brand-orange; color: $ink-1000; display: flex; align-items: center; justify-content: center; }
.brand-copy { display: flex; flex-direction: column; line-height: 1.1; }
.brand-copy strong { color: $fg-dark; font-size: 0.95rem; }
.brand-copy span { color: $ink-400; font-size: 0.75rem; }
.nav { display: flex; gap: $space-2; margin-left: $space-4; }
.nav a {
  color: $ink-300; text-decoration: none; padding: $space-2 $space-3; border-radius: 10px;
  display: inline-flex; align-items: center; gap: $space-2; font-size: 0.88rem; font-weight: 600;
  &.active { background: rgba($brand-orange, 0.1); color: $brand-orange; }
}
.user { margin-left: auto; display: flex; align-items: center; gap: $space-3; }
.name { color: $ink-300; font-size: 0.85rem; }
.logout { background: transparent; border: 1px solid rgba($brand-orange, 0.25); color: $brand-orange; border-radius: 10px; padding: $space-2 $space-3; cursor: pointer; }
.main { flex: 1; padding: $space-5; max-width: 1100px; width: 100%; margin: 0 auto; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
