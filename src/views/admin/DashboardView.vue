<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { adminApi } from '@/services/admin.api'
import { useRouter } from 'vue-router'
import { fetchTracking, type TrackingResult } from '@/services/tracking'

const authStore = useAuthStore()
const toastStore = useToastStore()
const router = useRouter()

const sidebarExpanded = ref(true)
const sidebarMobileOpen = ref(false)
const currentView = ref<'dashboard' | 'payments' | 'users' | 'tracking'>('dashboard')
const showLogoutConfirm = ref(false)

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', badge: null as string | null },
  { id: 'payments', label: 'Links de Pago', icon: 'fa-solid fa-link', badge: null as string | null },
  { id: 'users', label: 'Usuarios', icon: 'fa-solid fa-users', badge: null as string | null },
  { id: 'tracking', label: 'Tracking Interno', icon: 'fa-solid fa-magnifying-glass-location', badge: null as string | null },
]

const userDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.name || u?.email || 'Admin'
})

const userInitial = computed(() => userDisplayName.value.charAt(0).toUpperCase())

// --- Dashboard resumen ---
interface ResumenData {
  totalPayments: number
  recentPayments: number
  pendingPayments: number
  totalUsers: number
  totalPaquetesPendientes: number
  totalFacturas: number
}
const resumen = ref<ResumenData>({
  totalPayments: 0,
  recentPayments: 0,
  pendingPayments: 0,
  totalUsers: 0,
  totalPaquetesPendientes: 0,
  totalFacturas: 0,
})
const loadingResumen = ref(false)

async function fetchResumen() {
  loadingResumen.value = true
  try {
    const [payData, usersData] = await Promise.all([
      adminApi.getPayments(),
      adminApi.getUsers(),
    ])
    const payments = payData.payments || []
    const users = usersData.users || []
    resumen.value = {
      totalPayments: payments.length,
      recentPayments: payments.filter((p: any) => {
        const d = new Date(p.createdAt)
        return d > new Date(Date.now() - 7 * 86400000)
      }).length,
      pendingPayments: payments.filter((p: any) => p.status === 'pending' || p.status === 'waiting').length,
      totalUsers: users.length,
      totalPaquetesPendientes: 0,
      totalFacturas: 0,
    }
    try {
      const etlData = await adminApi.getData('v1/etl/pendientes')
      resumen.value.totalPaquetesPendientes = etlData.paquetes?.length || 0
    } catch {}
    try {
      const concData = await adminApi.getData('v1/conciliacion/resumen')
      resumen.value.totalFacturas = concData.resumen?.total || 0
    } catch {}
  } catch {}
  loadingResumen.value = false
}

// --- Payments ---
const payments = ref<any[]>([])
const loadingPayments = ref(false)
const creatingPayment = ref(false)
const errorPayment = ref('')
const paymentForm = ref({ reference: '', customerName: '', customerEmail: '' })
const displayAmount = ref<number | null>(null)
const showDeletePaymentModal = ref(false)
const paymentToDelete = ref<any>(null)

async function fetchPayments() {
  loadingPayments.value = true
  try {
    const data = await adminApi.getPayments()
    payments.value = data.payments || []
  } catch (err: any) {
    errorPayment.value = err.message || 'Error al cargar pagos'
  } finally {
    loadingPayments.value = false
  }
}

function calculateTotals() {
  const total = displayAmount.value || 0
  const cents = Math.round(total * 100)
  return { amount: cents, amountWithoutTax: cents, amountWithTax: 0, tax: 0 }
}

async function handleGenerateLink() {
  creatingPayment.value = true
  errorPayment.value = ''
  try {
    await adminApi.generateLink({ ...calculateTotals(), ...paymentForm.value })
    paymentForm.value = { reference: '', customerName: '', customerEmail: '' }
    displayAmount.value = null
    await fetchPayments()
    toastStore.showNotification('Link de pago generado exitosamente', 'success')
  } catch (err: any) {
    errorPayment.value = err.message || 'Error al generar el link'
  } finally {
    creatingPayment.value = false
  }
}

function confirmDeletePayment(payment: any) {
  if (payment.status === 'paid' || payment.status === 'approved') {
    toastStore.showNotification('No se puede eliminar un link de pago que ya está pagado.', 'warning')
    return
  }
  paymentToDelete.value = payment
  showDeletePaymentModal.value = true
}

async function executeDeletePayment() {
  if (!paymentToDelete.value) return
  try {
    await adminApi.deletePayment(paymentToDelete.value._id)
    showDeletePaymentModal.value = false
    paymentToDelete.value = null
    await fetchPayments()
    toastStore.showNotification('Link de pago eliminado', 'success')
  } catch (err: any) {
    toastStore.showNotification(err.message || 'Error al eliminar', 'error')
  }
}

// --- Users ---
const users = ref<any[]>([])
const loadingUsers = ref(false)
const creatingUser = ref(false)
const errorUser = ref('')
const userForm = ref({ name: '', email: '', password: '', role: 'admin' })
const showEditUserModal = ref(false)
const editingUserId = ref<string | null>(null)
const editUserForm = ref({ name: '', email: '', password: '', role: 'admin' })
const updatingUser = ref(false)
const updateSuccess = ref(false)
const showDeleteUserModal = ref(false)
const userToDelete = ref<any>(null)

async function fetchUsers() {
  loadingUsers.value = true
  try {
    const data = await adminApi.getUsers()
    users.value = data.users || []
  } catch (err: any) {
    errorUser.value = err.message || 'Error al cargar usuarios'
  } finally {
    loadingUsers.value = false
  }
}

async function handleSaveUser() {
  creatingUser.value = true
  errorUser.value = ''
  try {
    await adminApi.createUser({ ...userForm.value })
    toastStore.showNotification('Usuario creado exitosamente', 'success')
    userForm.value = { name: '', email: '', password: '', role: 'admin' }
    await fetchUsers()
  } catch (err: any) {
    errorUser.value = err.message || 'Error al crear usuario'
  } finally {
    creatingUser.value = false
  }
}

function startEditUser(user: any) {
  editingUserId.value = user._id
  editUserForm.value = { name: user.name, email: user.email, password: '', role: user.role }
  showEditUserModal.value = true
}

function cancelEditUser() {
  showEditUserModal.value = false
  editingUserId.value = null
  editUserForm.value = { name: '', email: '', password: '', role: 'admin' }
}

async function handleUpdateUser() {
  if (!editingUserId.value) return
  updatingUser.value = true
  try {
    const payload: any = { ...editUserForm.value }
    if (!payload.password) delete payload.password
    await adminApi.updateUser(editingUserId.value, payload)
    toastStore.showNotification(`Datos de ${editUserForm.value.name} guardados`, 'success')
    updateSuccess.value = true
    await fetchUsers()
    setTimeout(() => { updateSuccess.value = false; cancelEditUser() }, 1500)
  } catch (err: any) {
    toastStore.showNotification(err.message || 'Error al actualizar', 'error')
  } finally {
    updatingUser.value = false
  }
}

function confirmDeleteUser(user: any) {
  userToDelete.value = user
  showDeleteUserModal.value = true
}

async function executeDeleteUser() {
  if (!userToDelete.value) return
  try {
    await adminApi.deleteUser(userToDelete.value._id)
    showDeleteUserModal.value = false
    userToDelete.value = null
    await fetchUsers()
    toastStore.showNotification('Usuario eliminado', 'success')
  } catch (err: any) {
    toastStore.showNotification(err.message || 'Error al eliminar', 'error')
  }
}

// --- Tracking ---
const trackingCode = ref('')
const loadingTracking = ref(false)
const trackingData = ref<TrackingResult | null>(null)
const trackingError = ref('')

async function handleSearchTracking() {
  if (!trackingCode.value.trim()) return
  loadingTracking.value = true
  trackingError.value = ''
  trackingData.value = null
  try {
    trackingData.value = await fetchTracking(trackingCode.value.trim())
  } catch (err: any) {
    trackingError.value = err.response?.data?.message || err.message || 'Error al buscar tracking'
  } finally {
    loadingTracking.value = false
  }
}

// --- Copy ---
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toastStore.showNotification('Link copiado al portapapeles', 'success')
}

// --- Lifecycle ---
onMounted(() => {
  fetchResumen()
  fetchPayments()
  fetchUsers()
})

function navigateTo(path: string) {
  router.push(path)
  sidebarMobileOpen.value = false
}
</script>

<template>
  <div class="admin-shell" :class="{ 'sidebar-collapsed': !sidebarExpanded }">
    <!-- Mobile overlay -->
    <transition name="fade">
      <div v-if="sidebarMobileOpen" class="mobile-overlay" @click="sidebarMobileOpen = false" />
    </transition>

    <!-- ===================== SIDEBAR ===================== -->
    <aside class="sidebar" :class="{ 'mobile-open': sidebarMobileOpen }">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <span class="logo-mark">C</span>
        </div>
        <div class="brand-text" v-show="sidebarExpanded">
          <span class="brand-name">Courier Box</span>
          <span class="brand-role">Admin Panel</span>
        </div>
        <button class="collapse-btn" @click="sidebarExpanded = !sidebarExpanded" :title="sidebarExpanded ? 'Colapsar' : 'Expandir'">
          <i class="fa-solid fa-chevron-left" :class="{ rotated: !sidebarExpanded }" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <span class="nav-section-label" v-show="sidebarExpanded">Navegación</span>
        <button
          v-for="item in menuItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: currentView === item.id }"
          @click="currentView = item.id as typeof currentView"
          :title="!sidebarExpanded ? item.label : ''"
        >
          <div class="nav-icon-wrapper">
            <i :class="item.icon" />
          </div>
          <span class="nav-label" v-show="sidebarExpanded">{{ item.label }}</span>
          <span v-if="item.badge && sidebarExpanded" class="nav-badge">{{ item.badge }}</span>
        </button>

        <div class="nav-divider" v-show="sidebarExpanded" />

        <span class="nav-section-label" v-show="sidebarExpanded">Módulos</span>

        <button class="nav-item" @click="navigateTo('/admin/conciliacion')" :title="!sidebarExpanded ? 'Conciliación' : ''">
          <div class="nav-icon-wrapper">
            <i class="fa-solid fa-file-invoice" />
          </div>
          <span class="nav-label" v-show="sidebarExpanded">Conciliación</span>
        </button>

        <button class="nav-item" @click="navigateTo('/admin/metrics')" :title="!sidebarExpanded ? 'Métricas GHL' : ''">
          <div class="nav-icon-wrapper">
            <i class="fa-solid fa-chart-line" />
          </div>
          <span class="nav-label" v-show="sidebarExpanded">Métricas GHL</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar-mini">{{ userInitial }}</div>
          <div class="user-info-text" v-show="sidebarExpanded">
            <span class="user-name">{{ userDisplayName }}</span>
            <span class="user-email">{{ authStore.currentUser?.email || '' }}</span>
          </div>
        </div>
        <button class="logout-icon-btn" @click="showLogoutConfirm = true" :title="'Cerrar sesión'">
          <i class="fa-solid fa-right-from-bracket" />
        </button>
      </div>
    </aside>

    <!-- ===================== MAIN ===================== -->
    <div class="main-area">
      <!-- Top bar -->
      <header class="top-bar">
        <div class="top-bar-left">
          <button class="hamburger" @click="sidebarMobileOpen = true">
            <i class="fa-solid fa-bars" />
          </button>
          <div class="page-title-group">
            <h2 class="page-title">{{ currentView === 'dashboard' ? 'Dashboard' : currentView === 'payments' ? 'Links de Pago' : currentView === 'users' ? 'Usuarios' : 'Tracking Interno' }}</h2>
            <p class="page-subtitle">{{ currentView === 'dashboard' ? 'Resumen general del sistema' : currentView === 'payments' ? 'Genera y administra links de pago' : currentView === 'users' ? 'Administra los miembros del equipo' : 'Consulta el estado de los envíos' }}</p>
          </div>
        </div>
        <div class="top-bar-right">
          <div class="user-avatar" @click="showLogoutConfirm = true">
            {{ userInitial }}
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="main-content">
        <transition name="fade-slide" mode="out-in">
          <!-- ===== DASHBOARD ===== -->
          <div v-if="currentView === 'dashboard'" key="dashboard" class="page-content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon purple">
                  <i class="fa-solid fa-link" />
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ resumen.totalPayments }}</span>
                  <span class="stat-label">Links de Pago</span>
                </div>
                <div class="stat-trend up">
                  <i class="fa-solid fa-arrow-up" /> {{ resumen.recentPayments }} esta semana
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon orange">
                  <i class="fa-solid fa-clock" />
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ resumen.pendingPayments }}</span>
                  <span class="stat-label">Pendientes</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon green">
                  <i class="fa-solid fa-users" />
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ resumen.totalUsers }}</span>
                  <span class="stat-label">Usuarios Registrados</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon blue">
                  <i class="fa-solid fa-box" />
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ resumen.totalPaquetesPendientes }}</span>
                  <span class="stat-label">Paquetes Pendientes</span>
                </div>
              </div>
            </div>

            <div class="dashboard-grid">
              <section class="content-card full">
                <div class="card-head">
                  <h3>Acceso Rápido</h3>
                </div>
                <div class="quick-actions">
                  <button class="qa-btn" @click="currentView = 'payments'">
                    <div class="qa-icon"><i class="fa-solid fa-plus" /></div>
                    <span>Nuevo Link de Pago</span>
                  </button>
                  <button class="qa-btn" @click="currentView = 'users'">
                    <div class="qa-icon"><i class="fa-solid fa-user-plus" /></div>
                    <span>Registrar Usuario</span>
                  </button>
                  <button class="qa-btn" @click="navigateTo('/admin/conciliacion')">
                    <div class="qa-icon"><i class="fa-solid fa-file-invoice" /></div>
                    <span>Conciliación Bancaria</span>
                  </button>
                  <button class="qa-btn" @click="navigateTo('/admin/metrics')">
                    <div class="qa-icon"><i class="fa-solid fa-chart-line" /></div>
                    <span>Métricas GHL</span>
                  </button>
                </div>
              </section>
            </div>
          </div>

          <!-- ===== PAYMENTS ===== -->
          <div v-else-if="currentView === 'payments'" key="payments" class="page-content">
            <div class="content-grid">
              <section class="content-card">
                <div class="card-head">
                  <h3><i class="fa-solid fa-plus" /> Generar Nuevo Link</h3>
                </div>
                <form @submit.prevent="handleGenerateLink" class="premium-form">
                  <div class="form-group">
                    <label>Referencia de Pago</label>
                    <input type="text" v-model="paymentForm.reference" required placeholder="Ej. WR12345" />
                  </div>
                  <div class="form-group">
                    <label>Monto Total ($)</label>
                    <div class="input-amount">
                      <span class="input-prefix">$</span>
                      <input type="number" v-model.number="displayAmount" min="0.01" step="0.01" required placeholder="0.00" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Nombre del Cliente</label>
                      <input type="text" v-model="paymentForm.customerName" placeholder="Opcional" />
                    </div>
                    <div class="form-group">
                      <label>Correo del Cliente</label>
                      <input type="email" v-model="paymentForm.customerEmail" placeholder="Opcional" />
                    </div>
                  </div>
                  <p v-if="errorPayment" class="form-error"><i class="fa-solid fa-circle-exclamation" /> {{ errorPayment }}</p>
                  <button type="submit" :disabled="creatingPayment || !displayAmount || displayAmount <= 0" class="btn-primary">
                    <span v-if="!creatingPayment">Crear Link · ${{ (displayAmount || 0).toFixed(2) }}</span>
                    <span v-else class="loader" />
                  </button>
                </form>
              </section>

              <section class="content-card">
                <div class="card-head">
                  <h3><i class="fa-solid fa-clock-rotate-left" /> Historial Reciente</h3>
                </div>
                <div v-if="loadingPayments" class="state-box">
                  <span class="loader" /><p>Cargando...</p>
                </div>
                <div v-else-if="payments.length === 0" class="state-box">
                  <i class="fa-solid fa-inbox fa-2x" /><p>No hay links generados aún.</p>
                </div>
                <div v-else class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th class="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in payments" :key="p._id">
                        <td>
                          <div class="cell-main">{{ p.reference }}</div>
                          <div class="cell-sub">{{ new Date(p.createdAt).toLocaleDateString() }}</div>
                        </td>
                        <td>
                          <div class="cell-main">{{ p.customerName || 'N/A' }}</div>
                          <div class="cell-sub">Por: {{ p.createdBy?.name || 'Sistema' }}</div>
                        </td>
                        <td class="cell-amount">${{ (p.amount / 100).toFixed(2) }}</td>
                        <td>
                          <span :class="['badge', p.status === 'paid' || p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : p.status === 'canceled' ? 'badge-danger' : 'badge-info']">
                            {{ p.status === 'paid' || p.status === 'approved' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : p.status === 'canceled' ? 'Cancelado' : p.status }}
                          </span>
                        </td>
                        <td class="text-right">
                          <div class="action-group">
                            <button class="btn-icon" title="Copiar" @click="copyToClipboard(p.paymentLink)"><i class="fa-regular fa-copy" /></button>
                            <a :href="p.paymentLink" target="_blank" class="btn-icon" title="Abrir"><i class="fa-solid fa-up-right-from-square" /></a>
                            <button v-if="p.status !== 'paid' && p.status !== 'approved'" class="btn-icon danger" title="Eliminar" @click="confirmDeletePayment(p)"><i class="fa-regular fa-trash-can" /></button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          <!-- ===== USERS ===== -->
          <div v-else-if="currentView === 'users'" key="users" class="page-content">
            <div class="content-grid">
              <section class="content-card">
                <div class="card-head">
                  <h3><i class="fa-solid fa-user-plus" /> Registrar Miembro</h3>
                </div>
                <form @submit.prevent="handleSaveUser" class="premium-form">
                  <div class="form-group">
                    <label>Nombre Completo</label>
                    <input type="text" v-model="userForm.name" required placeholder="Ej. Ana Lucía" />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Correo Electrónico</label>
                      <input type="email" v-model="userForm.email" required placeholder="ejemplo@courierbox.com" />
                    </div>
                    <div class="form-group">
                      <label>Contraseña</label>
                      <input type="password" v-model="userForm.password" required placeholder="********" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Rol</label>
                    <select v-model="userForm.role" class="select-el">
                      <option value="admin">Administrador Total</option>
                      <option value="user">Usuario Regular</option>
                    </select>
                  </div>
                  <p v-if="errorUser" class="form-error"><i class="fa-solid fa-circle-exclamation" /> {{ errorUser }}</p>
                  <button type="submit" :disabled="creatingUser" class="btn-primary">
                    <span v-if="!creatingUser">Crear Usuario</span>
                    <span v-else class="loader" />
                  </button>
                </form>
              </section>

              <section class="content-card">
                <div class="card-head">
                  <h3><i class="fa-solid fa-users-viewfinder" /> Equipo Registrado</h3>
                </div>
                <div v-if="loadingUsers" class="state-box">
                  <span class="loader" /><p>Cargando...</p>
                </div>
                <div v-else-if="users.length === 0" class="state-box">
                  <i class="fa-solid fa-inbox fa-2x" /><p>No hay usuarios registrados aún.</p>
                </div>
                <div v-else class="table-scroll">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Registro</th>
                        <th class="text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="u in users" :key="u._id">
                        <td>
                          <div class="user-cell">
                            <div class="user-avatar-sm">{{ u.name.charAt(0).toUpperCase() }}</div>
                            <div>
                              <div class="cell-main">{{ u.name }}</div>
                              <div class="cell-sub">{{ u.email }}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span :class="['badge', u.role === 'admin' ? 'badge-info' : 'badge-neutral']">
                            {{ u.role === 'admin' ? 'Admin' : 'Usuario' }}
                          </span>
                        </td>
                        <td class="cell-sub">{{ new Date(u.createdAt).toLocaleDateString() }}</td>
                        <td class="text-right">
                          <div class="action-group">
                            <button class="btn-icon" title="Editar" @click="startEditUser(u)"><i class="fa-solid fa-pen" /></button>
                            <button v-if="u._id !== authStore.currentUser?.userId" class="btn-icon danger" title="Eliminar" @click="confirmDeleteUser(u)"><i class="fa-regular fa-trash-can" /></button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          <!-- ===== TRACKING ===== -->
          <div v-else-if="currentView === 'tracking'" key="tracking" class="page-content">
            <section class="content-card">
              <div class="card-head">
                <h3><i class="fa-solid fa-magnifying-glass-location" /> Consulta de Tracking Interno</h3>
              </div>
              <form @submit.prevent="handleSearchTracking" class="tracking-form">
                <div class="tracking-search-row">
                  <div class="form-group" style="flex:1">
                    <label>Código de Tracking o WR</label>
                    <input type="text" v-model="trackingCode" required placeholder="Ingrese el código..." />
                  </div>
                  <button type="submit" :disabled="loadingTracking || !trackingCode.trim()" class="btn-primary" style="margin-top:1.5rem">
                    <span v-if="!loadingTracking"><i class="fa-solid fa-search" /> Buscar</span>
                    <span v-else class="loader" />
                  </button>
                </div>
              </form>
              <p v-if="trackingError" class="form-error" style="margin-top:1rem"><i class="fa-solid fa-circle-exclamation" /> {{ trackingError }}</p>

              <div v-if="trackingData" class="tracking-result">
                <div class="tracking-stats">
                  <div class="ts-item">
                    <span class="ts-label">Estado</span>
                    <span class="ts-value">{{ trackingData.estadoLabel }}</span>
                  </div>
                  <div class="ts-item">
                    <span class="ts-label">WR</span>
                    <span class="ts-value">{{ trackingData.wr || 'N/A' }}</span>
                  </div>
                  <div class="ts-item">
                    <span class="ts-label">Peso (Lb)</span>
                    <span class="ts-value">{{ trackingData.pesoLb ?? 'N/A' }}</span>
                  </div>
                  <div class="ts-item">
                    <span class="ts-label">Consignatario</span>
                    <span class="ts-value">{{ trackingData.consignee || 'N/A' }}</span>
                  </div>
                </div>
                <div v-if="trackingData.costo" class="tracking-costs">
                  <h4>Costos</h4>
                  <div class="cost-grid">
                    <div><span>Flete</span><strong>${{ trackingData.costo.flete }}</strong></div>
                    <div><span>Arancel</span><strong>${{ trackingData.costo.arancel }}</strong></div>
                    <div class="cost-total"><span>Total</span><strong>${{ trackingData.costo.total }}</strong></div>
                  </div>
                </div>
                <div v-if="trackingData.eventos?.length" class="tracking-events">
                  <h4>Historial</h4>
                  <div v-for="(ev, i) in trackingData.eventos" :key="i" class="event-row">
                    <div class="event-dot" />
                    <div>
                      <div class="event-date">{{ ev.fechaTexto }} <span v-if="ev.ubicacion">— {{ ev.ubicacion }}</span></div>
                      <div class="event-desc">{{ ev.descripcion }}</div>
                      <div v-if="ev.accion" class="event-action">{{ ev.accion }}</div>
                    </div>
                  </div>
                </div>
                <div v-if="trackingData.imagenes?.length" class="tracking-images">
                  <h4>Imágenes ({{ trackingData.imagenes.length }})</h4>
                  <div class="img-scroll">
                    <a v-for="(img, i) in trackingData.imagenes" :key="i" :href="img" target="_blank">
                      <img :src="img" alt="img" />
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </transition>
      </main>
    </div>

    <!-- ===================== MODALS ===================== -->
    <transition name="fade">
      <div v-if="showDeletePaymentModal" class="modal-overlay" @click.self="showDeletePaymentModal = false">
        <div class="modal-card">
          <div class="modal-icon-box danger"><i class="fa-solid fa-triangle-exclamation" /></div>
          <h3>Eliminar Link de Pago</h3>
          <p>¿Eliminar el link <strong>{{ paymentToDelete?.reference }}</strong>? Esta acción no se puede deshacer.</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="showDeletePaymentModal = false">Cancelar</button>
            <button class="btn-danger" @click="executeDeletePayment">Sí, eliminar</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showDeleteUserModal" class="modal-overlay" @click.self="showDeleteUserModal = false">
        <div class="modal-card">
          <div class="modal-icon-box danger"><i class="fa-solid fa-triangle-exclamation" /></div>
          <h3>Eliminar Usuario</h3>
          <p>¿Eliminar a <strong>{{ userToDelete?.name }}</strong>? No se puede deshacer.</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="showDeleteUserModal = false">Cancelar</button>
            <button class="btn-danger" @click="executeDeleteUser">Sí, eliminar</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showEditUserModal" class="modal-overlay" @click.self="showEditUserModal = false">
        <div class="modal-card wide">
          <div class="modal-header-bar">
            <h3><i class="fa-solid fa-pen" /> Actualizar Perfil</h3>
            <button class="btn-icon" @click="cancelEditUser"><i class="fa-solid fa-xmark" /></button>
          </div>
          <form @submit.prevent="handleUpdateUser" class="premium-form">
            <div class="form-group">
              <label>Nombre Completo</label>
              <div class="input-icon-wrap">
                <i class="fa-solid fa-user" />
                <input type="text" v-model="editUserForm.name" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Correo</label>
                <div class="input-icon-wrap">
                  <i class="fa-solid fa-envelope" />
                  <input type="email" v-model="editUserForm.email" required />
                </div>
              </div>
              <div class="form-group">
                <label>Contraseña <span class="opt-tag">Opcional</span></label>
                <div class="input-icon-wrap">
                  <i class="fa-solid fa-lock" />
                  <input type="password" v-model="editUserForm.password" placeholder="Solo si cambia" />
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select v-model="editUserForm.role" class="select-el">
                <option value="admin">Administrador Total</option>
                <option value="user">Usuario Regular</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" @click="cancelEditUser">Cancelar</button>
              <button type="submit" :disabled="updatingUser || updateSuccess" :class="['btn-primary', { 'btn-success': updateSuccess }]">
                <span v-if="updateSuccess"><i class="fa-solid fa-check" /> Guardado</span>
                <span v-else-if="!updatingUser">Guardar Cambios</span>
                <span v-else class="loader" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showLogoutConfirm" class="modal-overlay" @click.self="showLogoutConfirm = false">
        <div class="modal-card">
          <div class="modal-icon-box warn"><i class="fa-solid fa-right-from-bracket" /></div>
          <h3>Cerrar Sesión</h3>
          <p>¿Estás seguro de que deseas cerrar sesión?</p>
          <div class="modal-actions">
            <button class="btn-ghost" @click="showLogoutConfirm = false">Cancelar</button>
            <button class="btn-danger" @click="authStore.logout()">Sí, cerrar</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens/colors' as *;
@use '@/styles/tokens/space' as *;

// ─── LAYOUT ───────────────────────────────────────────
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: $ink-1000;
  color: $fg-dark;
}

// ─── SIDEBAR ──────────────────────────────────────────
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: $ink-900;
  border-right: 1px solid rgba($ink-500, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 50;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;

  .sidebar-collapsed & {
    width: 72px;
  }

  @media (max-width: 768px) {
    left: -280px;
    transition: left 0.3s ease;
    width: 280px;

    &.mobile-open {
      left: 0;
    }

    .sidebar-collapsed & {
      left: -280px;
      width: 280px;
    }
  }
}

.mobile-overlay {
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba($ink-1000, 0.7);
    backdrop-filter: blur(4px);
    z-index: 40;
  }
}

// ─── SIDEBAR BRAND ────────────────────────────────────
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-6 $space-4;
  border-bottom: 1px solid rgba($ink-500, 0.1);
  position: relative;

  .brand-icon {
    flex-shrink: 0;

    .logo-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, $brand-orange, $brand-orange-deep);
      color: $ink-1000;
      border-radius: 12px;
      font-weight: 800;
      font-size: 1.2rem;
    }
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .brand-name {
      font-weight: 700;
      font-size: 1rem;
      white-space: nowrap;
    }

    .brand-role {
      font-size: 0.7rem;
      color: $ink-400;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
  }

  .collapse-btn {
    position: absolute;
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    background: $ink-700;
    border: 1px solid $ink-500;
    color: $ink-300;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.6rem;
    transition: all 0.2s;

    &:hover {
      background: $ink-600;
      color: $fg-dark;
    }

    i {
      transition: transform 0.3s ease;
      &.rotated {
        transform: rotate(180deg);
      }
    }

    @media (max-width: 768px) {
      display: none;
    }
  }
}

// ─── SIDEBAR NAV ──────────────────────────────────────
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: $space-4 $space-3;
  overflow-y: auto;

  .nav-section-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $ink-500;
    padding: $space-3 $space-3 $space-2;
    font-weight: 600;
  }

  .nav-divider {
    height: 1px;
    background: rgba($ink-500, 0.15);
    margin: $space-2 $space-3;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: $space-3;
    width: 100%;
    padding: $space-3 $space-3;
    background: transparent;
    border: none;
    border-radius: 10px;
    color: $ink-300;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    position: relative;

    .nav-icon-wrapper {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: transparent;
      flex-shrink: 0;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .nav-label {
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
    }

    .nav-badge {
      margin-left: auto;
      background: rgba($brand-orange, 0.15);
      color: $brand-orange;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
    }

    &:hover {
      background: rgba($ink-600, 0.3);
      color: $fg-dark;

      .nav-icon-wrapper {
        background: rgba($ink-500, 0.2);
      }
    }

    &.active {
      background: rgba($brand-orange, 0.08);
      color: $brand-orange;

      .nav-icon-wrapper {
        background: rgba($brand-orange, 0.15);
      }

      &::before {
        content: '';
        position: absolute;
        left: -$space-3;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 20px;
        background: $brand-orange;
        border-radius: 0 3px 3px 0;

        @media (max-width: 768px) {
          left: -$space-4;
        }
      }
    }
  }
}

// ─── SIDEBAR FOOTER ───────────────────────────────────
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4;
  border-top: 1px solid rgba($ink-500, 0.1);

  .sidebar-user {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex: 1;
    overflow: hidden;

    .user-avatar-mini {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, $brand-orange, $brand-orange-deep);
      color: $ink-1000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .user-info-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .user-name {
        font-size: 0.85rem;
        font-weight: 600;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .user-email {
        font-size: 0.7rem;
        color: $ink-400;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
    }
  }

  .logout-icon-btn {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba($ink-500, 0.2);
    border-radius: 10px;
    color: $ink-400;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;

    &:hover {
      background: rgba($signal-red, 0.1);
      color: #ff8a8f;
      border-color: rgba($signal-red, 0.2);
    }
  }
}

// ─── MAIN AREA ────────────────────────────────────────
.main-area {
  flex: 1;
  margin-left: 280px;
  transition: margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  .sidebar-collapsed & {
    margin-left: 72px;
  }

  @media (max-width: 768px) {
    margin-left: 0 !important;
  }
}

// ─── TOP BAR ──────────────────────────────────────────
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-5 $space-8;
  border-bottom: 1px solid rgba($ink-500, 0.08);
  background: rgba($ink-1000, 0.6);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 30;

  @media (max-width: 768px) {
    padding: $space-4;
  }

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: $space-4;

    .hamburger {
      display: none;

      @media (max-width: 768px) {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba($ink-600, 0.3);
        border: 1px solid rgba($ink-500, 0.2);
        border-radius: 10px;
        color: $fg-dark;
        cursor: pointer;
        font-size: 1rem;
      }
    }

    .page-title-group {
      .page-title {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.01em;
      }

      .page-subtitle {
        font-size: 0.8rem;
        color: $ink-400;
        margin: 2px 0 0;
      }
    }
  }

  .top-bar-right {
    .user-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, $brand-orange, $brand-orange-deep);
      color: $ink-1000;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
  }
}

// ─── MAIN CONTENT ─────────────────────────────────────
.main-content {
  flex: 1;
  padding: $space-8;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: $space-4;
  }
}

// ─── STATS GRID ───────────────────────────────────────
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: $space-4;
  margin-bottom: $space-8;
}

.stat-card {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.12);
  border-radius: 16px;
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  transition: all 0.2s;

  &:hover {
    border-color: rgba($ink-400, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;

    &.purple { background: rgba($signal-blue, 0.12); color: #6db6ff; }
    &.orange { background: rgba($brand-orange, 0.12); color: $brand-orange; }
    &.green { background: rgba($signal-green, 0.12); color: $signal-green; }
    &.blue { background: rgba($signal-blue, 0.12); color: #60a5fa; }
  }

  .stat-info {
    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.8rem;
      color: $ink-400;
      margin-top: 4px;
    }
  }

  .stat-trend {
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 4px;

    &.up { color: $signal-green; }
    i { font-size: 0.6rem; }
  }
}

// ─── CONTENT CARDS ────────────────────────────────────
.content-card {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.12);
  border-radius: 16px;
  padding: $space-6;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba($ink-400, 0.2);
  }

  &.full {
    grid-column: 1 / -1;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-5;
    padding-bottom: $space-4;
    border-bottom: 1px solid rgba($ink-500, 0.08);

    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: $space-2;

      i {
        color: $brand-orange;
        font-size: 0.9rem;
      }
    }
  }
}

// ─── GRID LAYOUTS ─────────────────────────────────────
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $space-6;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: $space-6;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

// ─── QUICK ACTIONS ────────────────────────────────────
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: $space-4;

  .qa-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-3;
    padding: $space-6 $space-4;
    background: rgba($ink-800, 0.3);
    border: 1px solid rgba($ink-500, 0.1);
    border-radius: 14px;
    color: $fg-dark;
    cursor: pointer;
    transition: all 0.25s ease;
    font-size: 0.85rem;
    font-weight: 500;

    .qa-icon {
      width: 44px;
      height: 44px;
      background: rgba($brand-orange, 0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: $brand-orange;
      transition: all 0.25s;
    }

    &:hover {
      background: rgba($ink-700, 0.4);
      border-color: rgba($brand-orange, 0.2);
      transform: translateY(-2px);

      .qa-icon {
        background: rgba($brand-orange, 0.2);
      }
    }
  }
}

// ─── FORMS ────────────────────────────────────────────
.premium-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $space-4;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;

    label {
      font-size: 0.8rem;
      font-weight: 500;
      color: $ink-300;
      margin-bottom: $space-2;

      .opt-tag {
        font-size: 0.65rem;
        color: $ink-400;
        background: rgba($ink-500, 0.15);
        padding: 1px 6px;
        border-radius: 4px;
        margin-left: 4px;
        font-weight: 500;
      }
    }

    input, .select-el {
      background: rgba($ink-1000, 0.5);
      border: 1px solid rgba($ink-500, 0.3);
      color: $fg-dark;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.9rem;
      transition: all 0.25s;
      width: 100%;

      &::placeholder { color: $ink-500; }

      &:focus {
        outline: none;
        border-color: $brand-orange;
        box-shadow: 0 0 0 3px rgba($brand-orange, 0.1);
        background: rgba($ink-1000, 0.8);
      }
    }

    .select-el {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236F6F7A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      background-size: 1rem;
      cursor: pointer;
    }

    .input-amount {
      position: relative;

      .input-prefix {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: $ink-400;
        font-weight: 600;
      }

      input {
        padding-left: 2.5rem;
      }
    }

    .input-icon-wrap {
      position: relative;

      i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: $ink-400;
        transition: color 0.2s;
      }

      input {
        padding-left: 2.75rem;

        &:focus ~ i {
          color: $brand-orange;
        }
      }
    }
  }

  .form-error {
    display: flex;
    align-items: center;
    gap: $space-2;
    background: rgba($signal-red, 0.08);
    color: #ff8a8f;
    padding: $space-3 $space-4;
    border-radius: 10px;
    font-size: 0.85rem;
    border: 1px solid rgba($signal-red, 0.15);
    margin: 0;
  }
}

// ─── BUTTONS ──────────────────────────────────────────
.btn-primary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $space-2;
  background: $brand-orange;
  color: #fff;
  border: none;
  padding: 0.85rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 46px;

  &:hover:not(:disabled) {
    background: lighten($brand-orange, 5%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba($brand-orange, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-success {
    background: $signal-green;
    pointer-events: none;
  }
}

.btn-ghost {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid rgba($ink-500, 0.3);
  border-radius: 10px;
  color: $ink-300;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;

  &:hover {
    background: rgba($ink-500, 0.15);
    color: $fg-dark;
  }
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: $signal-red;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: darken($signal-red, 8%);
  }
}

.btn-icon {
  width: 34px;
  height: 34px;
  background: rgba($ink-500, 0.15);
  border: 1px solid rgba($ink-500, 0.2);
  border-radius: 8px;
  color: $ink-300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    background: rgba($ink-400, 0.25);
    color: $fg-dark;
  }

  &.danger:hover {
    background: rgba($signal-red, 0.15);
    color: #ff8a8f;
    border-color: rgba($signal-red, 0.2);
  }
}

.action-group {
  display: flex;
  gap: $space-2;
  justify-content: flex-end;
}

// ─── TABLE ────────────────────────────────────────────
.table-scroll {
  overflow-x: auto;
  margin: 0 (-$space-6);
  padding: 0 $space-6;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 500px;

  th, td {
    padding: $space-3 $space-4;
    text-align: left;
    border-bottom: 1px solid rgba($ink-500, 0.1);
  }

  th {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $ink-400;
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .cell-main {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .cell-sub {
    font-size: 0.75rem;
    color: $ink-400;
    margin-top: 2px;
  }

  .cell-amount {
    font-weight: 700;
  }

  .text-right {
    text-align: right;
  }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: $space-3;

  .user-avatar-sm {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, $ink-500, $ink-700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
    flex-shrink: 0;
  }
}

// ─── BADGES ───────────────────────────────────────────
.badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: inline-block;

  &-success { background: rgba($signal-green, 0.12); color: $signal-green; border: 1px solid rgba($signal-green, 0.2); }
  &-warning { background: rgba($signal-amber, 0.12); color: $signal-amber; border: 1px solid rgba($signal-amber, 0.2); }
  &-danger { background: rgba($signal-red, 0.12); color: #ff8a8f; border: 1px solid rgba($signal-red, 0.2); }
  &-info { background: rgba($signal-blue, 0.12); color: #6db6ff; border: 1px solid rgba($signal-blue, 0.2); }
  &-neutral { background: rgba($ink-400, 0.12); color: $ink-300; border: 1px solid rgba($ink-400, 0.2); }
}

// ─── STATE ────────────────────────────────────────────
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: $ink-400;
  text-align: center;
  gap: $space-3;

  p { margin: 0; font-size: 0.9rem; }
  i { opacity: 0.5; }
}

// ─── TRACKING ─────────────────────────────────────────
.tracking-search-row {
  display: flex;
  gap: $space-4;
  align-items: flex-end;

  @media (max-width: 640px) {
    flex-direction: column;
  }
}

.tracking-result {
  margin-top: $space-6;
  padding-top: $space-6;
  border-top: 1px solid rgba($ink-500, 0.12);

  h4 {
    font-size: 0.9rem;
    margin: 0 0 $space-3;
    color: $fg-dark;
  }

  .tracking-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-3;
    margin-bottom: $space-6;

    .ts-item {
      background: rgba($ink-800, 0.3);
      padding: $space-3 $space-4;
      border-radius: 10px;

      .ts-label {
        display: block;
        font-size: 0.7rem;
        color: $ink-400;
        margin-bottom: 4px;
      }

      .ts-value {
        font-weight: 600;
        font-size: 0.95rem;
      }
    }
  }

  .tracking-costs {
    margin-bottom: $space-6;

    .cost-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: $space-3;

      > div {
        background: rgba($ink-800, 0.3);
        padding: $space-3 $space-4;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        span { font-size: 0.75rem; color: $ink-400; }
        strong { font-weight: 600; }
      }

      .cost-total strong { color: $brand-orange; }
    }
  }

  .tracking-events {
    margin-bottom: $space-6;

    .event-row {
      display: flex;
      gap: $space-3;
      padding: $space-3 0;
      border-left: 2px solid rgba($brand-orange, 0.2);
      padding-left: $space-4;
      margin-left: 4px;

      .event-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: $brand-orange;
        margin-left: calc(-1 * (#{$space-4} + 5px));
        margin-top: 4px;
        flex-shrink: 0;
      }

      .event-date { font-size: 0.78rem; color: $ink-400; }
      .event-desc { font-size: 0.9rem; margin-top: 2px; }
      .event-action { font-size: 0.8rem; color: $brand-orange; margin-top: 2px; }
    }
  }

  .tracking-images {
    .img-scroll {
      display: flex;
      gap: $space-3;
      overflow-x: auto;
      padding-bottom: $space-3;

      a {
        flex-shrink: 0;
        img {
          max-width: 180px;
          height: auto;
          border-radius: 10px;
          border: 1px solid rgba($ink-500, 0.2);
        }
      }
    }
  }
}

// ─── MODALS ───────────────────────────────────────────
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
}

.modal-card {
  background: $ink-900;
  border: 1px solid rgba($ink-500, 0.15);
  border-radius: 20px;
  padding: $space-8;
  max-width: 420px;
  width: 100%;
  text-align: center;

  &.wide {
    max-width: 520px;
    text-align: left;
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

    &.danger { background: rgba($signal-red, 0.12); color: #ff8a8f; }
    &.warn { background: rgba($signal-amber, 0.12); color: $signal-amber; }
  }

  h3 {
    font-size: 1.15rem;
    margin: 0 0 $space-2;
    display: flex;
    align-items: center;
    gap: $space-2;
  }

  p {
    color: $ink-300;
    font-size: 0.9rem;
    margin: 0 0 $space-6;
  }

  .modal-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-5;
  }

  .modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $space-3;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }
}

// ─── TRANSITIONS ──────────────────────────────────────
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// ─── LOADER ───────────────────────────────────────────
.loader {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(#fff, 0.3);
  border-bottom-color: #fff;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
