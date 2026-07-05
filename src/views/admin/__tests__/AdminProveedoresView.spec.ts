import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminProveedoresView from '../AdminProveedoresView.vue'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  listTypes: vi.fn(),
  resumen: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ showNotification: vi.fn() }),
}))

vi.mock('@/services/proveedores.api', () => ({
  proveedoresApi: {
    list: mocks.list,
    listTypes: mocks.listTypes,
    addType: vi.fn(),
    removeType: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}))

vi.mock('@/services/costos.api', () => ({
  costosApi: {
    resumen: mocks.resumen,
  },
}))

describe('AdminProveedoresView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTypes.mockResolvedValue({ defaultTypes: ['General'], customTypes: [], providerTypes: ['General'] })
    mocks.list.mockResolvedValue({
      proveedores: [
        {
          _id: 'p1',
          nombre: 'Proveedor A',
          tipo: 'General',
          pais: 'EC',
          ciudad: 'Quito',
          contacto: 'Juan',
          telefono: '099',
          email: 'a@test.com',
          notas: 'Notas',
          activo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    })
    mocks.resumen
      .mockResolvedValueOnce({ resumen: { total: { total: 500 }, porProveedor: [{ _id: 'Proveedor A', total: 300 }] } })
      .mockResolvedValueOnce({ resumen: { total: { total: 50 }, porProveedor: [{ _id: 'Proveedor A', total: 50 }] } })
  })

  it('muestra el resumen de gastos y los costos por proveedor', async () => {
    const wrapper = mount(AdminProveedoresView, {
      global: {
        stubs: {
          AppSelect: {
            props: ['modelValue', 'options', 'label'],
            emits: ['update:modelValue'],
            template: `
              <label>
                <span>{{ label }}</span>
                <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
                  <option v-for="option in options" :key="typeof option === 'string' ? option : option.value" :value="typeof option === 'string' ? option : option.value">
                    {{ typeof option === 'string' ? option : option.label }}
                  </option>
                </select>
              </label>
            `,
          },
          ProveedorCard: {
            props: ['proveedor', 'gastoMesActual', 'gastoHistorico'],
            template: '<article><strong>{{ proveedor.nombre }}</strong><span>{{ gastoMesActual }}</span><span>{{ gastoHistorico }}</span></article>',
          },
          ProveedorFormModal: { template: '<div />' },
          AppConfirmModal: { template: '<div />' },
        },
      },
    })

    await flushPromises()

    expect(mocks.resumen).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Gasto mes corriente')
    expect(wrapper.text()).toContain('$50.00')
    expect(wrapper.text()).toContain('Gasto histórico')
    expect(wrapper.text()).toContain('$500.00')
    expect(wrapper.text()).toContain('Proveedor A')
    expect(wrapper.text()).toContain('50')
    expect(wrapper.text()).toContain('300')
  })

  it('muestra skeleton mientras carga', async () => {
    mocks.listTypes.mockReturnValue(new Promise(() => {}))
    mocks.list.mockReturnValue(new Promise(() => {}))
    mocks.resumen.mockReturnValue(new Promise(() => {}))

    const wrapper = mount(AdminProveedoresView, {
      global: {
        stubs: {
          ProveedorCard: { template: '<article />' },
          ProveedorFormModal: { template: '<div />' },
          AppConfirmModal: { template: '<div />' },
        },
      },
    })

    await nextTick()

    expect(wrapper.findAll('.provider-skeleton')).toHaveLength(4)
    expect(wrapper.find('.skeleton-grid').exists()).toBe(true)
  })

  it('filtra proveedores por busqueda, tipo y estado', async () => {
    mocks.listTypes.mockResolvedValue({
      defaultTypes: ['General', 'Express'],
      customTypes: [],
      providerTypes: ['General', 'Express'],
    })
    mocks.list.mockResolvedValue({
      proveedores: [
        {
          _id: 'p1',
          nombre: 'Proveedor A',
          tipo: 'General',
          pais: 'EC',
          ciudad: 'Quito',
          contacto: 'Juan',
          telefono: '099',
          email: 'a@test.com',
          notas: 'Notas',
          activo: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 'p2',
          nombre: 'Proveedor B',
          tipo: 'Express',
          pais: 'US',
          ciudad: 'Miami',
          contacto: 'Ana',
          telefono: '088',
          email: 'b@test.com',
          notas: 'Urgente',
          activo: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 2,
    })

    const wrapper = mount(AdminProveedoresView, {
      global: {
        stubs: {
          AppSelect: {
            props: ['modelValue', 'options', 'label'],
            emits: ['update:modelValue'],
            template: `
              <label>
                <span>{{ label }}</span>
                <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
                  <option v-for="option in options" :key="typeof option === 'string' ? option : option.value" :value="typeof option === 'string' ? option : option.value">
                    {{ typeof option === 'string' ? option : option.label }}
                  </option>
                </select>
              </label>
            `,
          },
          ProveedorCard: {
            props: ['proveedor', 'gastoMesActual', 'gastoHistorico'],
            template: '<article class="provider-card-stub"><strong>{{ proveedor.nombre }}</strong><span>{{ proveedor.tipo }}</span><span>{{ proveedor.activo ? "activo" : "inactivo" }}</span></article>',
          },
          ProveedorFormModal: { template: '<div />' },
          AppConfirmModal: { template: '<div />' },
        },
      },
    })

    await flushPromises()

    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('Express')
    await flushPromises()

    expect(wrapper.text()).toContain('Proveedor B')
    expect(wrapper.text()).not.toContain('Proveedor A')

    await selects[1]!.setValue('inactive')
    await flushPromises()

    expect(wrapper.text()).toContain('Proveedor B')
    expect(wrapper.text()).not.toContain('Proveedor A')

    await wrapper.find('input').setValue('Miami')
    await flushPromises()

    expect(wrapper.text()).toContain('Proveedor B')
    expect(wrapper.text()).not.toContain('Proveedor A')
  })
})
