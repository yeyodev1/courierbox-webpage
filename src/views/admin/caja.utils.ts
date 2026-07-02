export type CajaMovimiento = {
  _id: string
  tipo: 'ingreso' | 'egreso'
  categoria: string
  monto: number
  clienteNombre?: string
  clienteId?: string
  descripcion?: string
  referencia?: string
  comprobanteUrl?: string
  fecha: string
  createdAt: string
}

export type CajaResumen = {
  ingresos: { total: number; count: number }
  egresos: { total: number; count: number }
  saldo: number
  porTipo: Array<{ _id: string; total: number; count: number }>
  porCategoria: Array<{ _id: string; total: number; count: number }>
}

export const CATEGORIAS_INGRESO = ['VENTA', 'GDC', 'COURIER']
export const CATEGORIAS_EGRESO = ['TRANSPORTE', 'COMBUSTIBLE', 'GASTOS FIJOS', 'GASTOS VARIABLES', 'GASTOS EVENTUALES', 'ADELANTOS', 'ALIMENTOS', 'INSUMOS BASICOS', 'DEVOLUCIONES']

export function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value))
  })
  return searchParams.toString()
}

export function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(2)}`
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function canDeleteCajaMovimiento(movement: Pick<CajaMovimiento, 'fecha' | 'createdAt'>) {
  const referenceDate = new Date(movement.fecha || movement.createdAt)
  const diffDays = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}
