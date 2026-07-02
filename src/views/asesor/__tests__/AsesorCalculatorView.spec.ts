import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getFeeConfigs: vi.fn(),
  calculateFee: vi.fn(),
  showNotification: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/services/asesoria.api', () => ({
  asesoriaApi: {
    getFeeConfigs: mocks.getFeeConfigs,
    calculateFee: mocks.calculateFee,
  },
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ showNotification: mocks.showNotification }),
}))

import AsesorCalculatorView from '../AsesorCalculatorView.vue'

describe('AsesorCalculatorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra toast cuando no hay tarifas configuradas', async () => {
    mocks.getFeeConfigs.mockResolvedValue({ configs: [] })
    mocks.calculateFee.mockResolvedValue({ result: null })

    mount(AsesorCalculatorView, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    await flushPromises()

    expect(mocks.showNotification).toHaveBeenCalledWith(
      'Aún no hay una tarifa configurada. Contacta al administrador para activar la calculadora.',
      'warning',
    )
  })
})
