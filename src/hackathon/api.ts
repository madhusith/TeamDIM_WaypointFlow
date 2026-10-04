export type Role = 'dispatcher' | 'loader' | 'driver' | 'store_manager';

export type User = {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  depot: string | null;
  outlet_id: string | null;
};

export type Outlet = {
  id: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  district: string;
  depot: string;
  dock_type: string;
  parking_constraint: string | null;
  mall_window: string | null;
  window_open_time: string;
  window_close_time: string;
};

export type Vehicle = {
  id: string;
  type: 'truck' | 'van';
  temp: 'reefer' | 'ambient';
  weight_cap_kg: number | string;
  volume_cap_m3: number | string;
  weekly_fuel_quota_l: number | string;
  km_per_l: number | string;
  depot: string;
  status: string;
};

export type Order = {
  id: string;
  order_date: string;
  outlet_id: string;
  brand: string;
  temp_requirement: 'ambient' | 'chilled';
  order_units: number;
  order_weight_kg: number | string;
  order_volume_m3: number | string;
  window_open_time: string;
  window_close_time: string;
  status: string;
  deferred_reason: string | null;
  historical_outcome: string | null;
};

export type Trip = {
  id: string;
  trip_date: string;
  vehicle_id: string;
  trip_number: number;
  depot: string;
  departure_time: string;
  status: string;
};

export type Stop = {
  id: number;
  trip_id: string;
  sequence: number;
  outlet_id: string;
  planned_arrival_time: string | null;
  status: string;
  order_ids: string[];
};

export type LoadIssue = {
  id: number;
  trip_id: string;
  order_id: string | null;
  expected_units: number | null;
  actual_units: number | null;
  reason: string;
};

export type Receipt = {
  order_id: string;
  received_units: number;
  issue: string | null;
};

export type DeliveryEvent = {
  id: number;
  stop_id: number;
  event_type: string;
  payload: { receiver_name?: string; notes?: string; proof_photo_data?: string };
  happened_at: string;
};

export type Snapshot = {
  user: User;
  demo_date: string;
  outlets: Outlet[];
  vehicles: Vehicle[];
  orders: Order[];
  trips: Trip[];
  stops: Stop[];
  load_issues: LoadIssue[];
  receipts: Receipt[];
  delivery_events: DeliveryEvent[];
};

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

export async function api<T>(path: string, token?: string, payload?: unknown): Promise<T> {
  const url = API_BASE ? `${API_BASE}/api${path}` : `/api${path}`;
  const response = await fetch(url, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return data as T;
}
