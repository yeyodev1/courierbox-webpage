import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersView from '../AdminUsersView.vue'

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    currentUser: { userId: 'current-admin' },
    userRole: 'admin',
  }),
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ showNotification: vi.fn() }),
}))

vi.mock('@/services/admin.api', () => ({
  adminApi: {
    getUsers: mocks.getUsers,
    createUser: mocks.createUser,
    updateUser: mocks.updateUser,
    deleteUser: mocks.deleteUser,
  },
}))

describe('AdminUsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUsers.mockResolvedValue({
      users: [
        {
          _id: 'u1',
          name: 'Super Admin',
          email: 'super@courierbox.com',
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'u2',
          name: 'Admin Team',
          email: 'admin@courierbox.com',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'u3',
          name: 'Asesor One',
          email: 'asesor@courierbox.com',
          role: 'asesor',
          createdAt: new Date().toISOString(),
        },
      ],
    })
  })

  function mountView() {
    return mount(AdminUsersView, {
      global: {
        stubs: {
          AppButton: { template: '<button><slot /></button>' },
          AppSelect: { template: '<div />' },
        },
      },
    })
  }

  it('bloquea el borrado de admins y superadmin con mensaje divertido', async () => {
    const wrapper = mountView()

    await flushPromises()

    await wrapper.findAll('button[title="Eliminar"]')[0]!.trigger('click')

    expect(mocks.deleteUser).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('¿Quieres eliminar a un superadmin?')
    expect(wrapper.text()).toContain('Romper la empresa')
    expect(wrapper.text()).toContain('No puedes tocarlo')
  })

  it('permite borrar usuarios normales', async () => {
    const wrapper = mountView()

    await flushPromises()

    await wrapper.findAll('button[title="Eliminar"]')[2]!.trigger('click')
    const modalButtons = wrapper.findAll('.modal-card button')
    await modalButtons[modalButtons.length - 1]!.trigger('click')
    await flushPromises()

    expect(mocks.deleteUser).toHaveBeenCalledWith('u3')
  })
})
