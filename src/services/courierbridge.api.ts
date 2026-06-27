import APIBase from "./httpBase";

class CourierBridgeAPI extends APIBase {
  async getFacturasPendientes(casillero: string) {
    const res = await this.get<any>(`v1/facturacion/pendientes/${encodeURIComponent(casillero.toUpperCase())}`);
    return res.data;
  }

  async registrarPago(formData: FormData) {
    const res = await this.post<any>("v1/facturacion/pagar", formData);
    return res.data;
  }
}

export const courierBridgeApi = new CourierBridgeAPI();
