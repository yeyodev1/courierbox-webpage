import APIBase from './httpBase'
import type { CuentaBancaria } from './gestiones_compra.api'

class CuentasBancariasAPI extends APIBase {
  private readonly base = 'v1/cuentas-bancarias'

  async list(soloActivas = true): Promise<CuentaBancaria[]> {
    const res = await this.get<{ cuentas: CuentaBancaria[] }>(
      `${this.base}?soloActivas=${soloActivas}`
    )
    return res.data.cuentas
  }

  async create(data: {
    banco: string
    numeroCuenta: string
    titular: string
    tipoCuenta?: 'corriente' | 'ahorros'
  }): Promise<CuentaBancaria> {
    const res = await this.post<{ cuenta: CuentaBancaria }>(this.base, data)
    return res.data.cuenta
  }

  async update(
    id: string,
    data: Partial<{
      banco: string
      numeroCuenta: string
      titular: string
      tipoCuenta: 'corriente' | 'ahorros'
      activa: boolean
    }>
  ): Promise<CuentaBancaria> {
    const res = await this.patch<{ cuenta: CuentaBancaria }>(`${this.base}/${id}`, data)
    return res.data.cuenta
  }

  async remove(id: string): Promise<void> {
    await this.delete(`${this.base}/${id}`)
  }
}

export const cuentasBancariasAPI = new CuentasBancariasAPI()
