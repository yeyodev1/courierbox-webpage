import APIBase from "./httpBase";

export type EstadoCanonico =
  | "creado"
  | "en_bodega_miami"
  | "en_transito"
  | "en_aduana"
  | "en_distribucion"
  | "entregado"
  | "incidencia"
  | "desconocido";

export interface TrackingEvento {
  fecha: string | null;
  fechaTexto: string;
  descripcion: string;
  ubicacion?: string;
  accion?: string;
}

export interface TrackingCosto {
  pesoLb: number;
  flete: number;
  arancel: number;
  total: number;
}

export interface TrackingResult {
  codigo: string;
  wr: string | null;
  estado: EstadoCanonico;
  estadoLabel: string;
  descripcion: string | null;
  notes: string | null;
  consignee: string | null;
  trackingOriginal?: string | null;
  shipper?: string | null;
  carrier?: string | null;
  pesoLb: number | null;
  costo: TrackingCosto | null;
  fechaRecepcion: string | null;
  fechaEstado: string | null;
  eventos: TrackingEvento[];
  imagenes: string[];
  actualizadoEn: string;
}

class TrackingService extends APIBase {
  async fetch(codigo: string): Promise<TrackingResult> {
    const res = await this["get"]<TrackingResult>(`tracking/${encodeURIComponent(codigo)}`);
    return res.data;
  }
}

export const trackingService = new TrackingService();

export async function fetchTracking(codigo: string): Promise<TrackingResult> {
  return trackingService.fetch(codigo);
}
