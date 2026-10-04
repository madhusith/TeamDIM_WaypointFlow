import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  LogOut, 
  Layers, 
  Navigation, 
  Camera, 
  Wifi, 
  WifiOff, 
  Building2, 
  Calendar 
} from 'lucide-react';
import { api } from './api';
import type { Order, Snapshot, Stop, User } from './api';

type QueueItem = { stopId: number; payload: Record<string, unknown> };
type Action = (path: string, payload: unknown, message: string) => Promise<boolean>;

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition-all focus:border-blue-500 focus:outline-hidden focus:ring-3 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-400';
const button = 'inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
const quiet = 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer';
const when = (value?: string | null) => value ? value.slice(0, 5) : '—';
const tripStops = (data: Snapshot, id: string) => data.stops.filter(s => s.trip_id === id).sort((a, b) => a.sequence - b.sequence);
const tripOrders = (data: Snapshot, id: string) => {
  const ids = new Set(tripStops(data, id).flatMap(s => s.order_ids));
  return data.orders.filter(o => ids.has(o.id));
};
const snapshotKey = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return `waypoint-cached-snapshot:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
};

function Box({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 md:p-6 shadow-xs ${className}`}>
      {children}
    </section>
  );
}

function Badge({ value, className = '' }: { value: string; className?: string }) {
  const norm = value.toLowerCase().replaceAll(' ', '_');
  
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  
  if (norm.includes('completed') || norm.includes('delivered')) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (norm.includes('deferred') || norm.includes('exception') || norm.includes('problem')) {
    color = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (norm.includes('ready_loading') || norm.includes('loading')) {
    color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    dotColor = 'bg-indigo-500';
  } else if (norm.includes('en_route') || norm.includes('loaded')) {
    color = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (norm.includes('confirmed') || norm.includes('draft') || norm.includes('arrived')) {
    color = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  }

  const displayText = value.replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide leading-none ${color} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{displayText}</span>
    </span>
  );
}

export default function WorkflowApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem('waypoint-token') || '');
  const [data, setData] = useState<Snapshot | null>(null);
  const [username, setUsername] = useState('dispatcher');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(!navigator.onLine);
  const [demoOffline, setDemoOffline] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('waypoint-offline-events') || '[]') as QueueItem[]; }
    catch { return []; }
  });
  const syncing = useRef(false);
  const offline = networkOffline || demoOffline;

  useEffect(() => {
    const online = () => setNetworkOffline(false);
    const disconnected = () => setNetworkOffline(true);
    window.addEventListener('online', online); window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', disconnected); };
  }, []);
  useEffect(() => { localStorage.setItem('waypoint-offline-events', JSON.stringify(queue)); }, [queue]);

  const refresh = useCallback(async (activeToken = token) => {
    if (!activeToken) return;
    try {
      const snapshot = await api<Snapshot>('/bootstrap', activeToken);
      setData(snapshot);
      localStorage.setItem(await snapshotKey(activeToken), JSON.stringify(snapshot));
      setError('');
    } catch (cause) {
      const cached = localStorage.getItem(await snapshotKey(activeToken));
      if (cached && !navigator.onLine) { setData(JSON.parse(cached) as Snapshot); setNotice('Using a saved route while offline.'); }
      else setError(cause instanceof Error ? cause.message : 'Could not load data');
    }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (offline || !token || data?.user.role !== 'driver' || !queue.length || syncing.current) return;
    syncing.current = true;
    void (async () => {
      let remaining = [...queue];
      while (remaining.length) {
        const next = remaining[0];
        try {
          await api(`/stops/${next.stopId}/events`, token, next.payload);
          remaining = remaining.slice(1); setQueue(remaining);
        } catch (cause) {
          setError(`Sync stopped: ${cause instanceof Error ? cause.message : 'unknown error'}`);
          break;
        }
      }
      syncing.current = false;
      if (!remaining.length) { setNotice('Offline delivery records synchronized.'); await refresh(token); }
    })();
  }, [offline, token, data?.user.role, queue, refresh]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api<{ token: string; user: User }>('/login', undefined, { username, password });
      sessionStorage.setItem('waypoint-token', result.token); setToken(result.token);
      setPassword('');
      setNotice(`Signed in as ${result.user.display_name}.`); await refresh(result.token);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed'); }
    finally { setBusy(false); }
  }
  async function act(path: string, payload: unknown, message: string) {
    if (offline) { setError('Connect to perform this action. Driver stop events can be saved offline.'); return false; }
    setBusy(true); setError(''); setNotice('');
    try { await api(path, token, payload); setNotice(message); await refresh(token); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Action failed'); return false; }
    finally { setBusy(false); }
  }
  async function recordStop(stopId: number, eventType: 'arrived' | 'delivered' | 'problem', receiver = '', notes = '', photo = '') {
    const payload = { client_event_id: crypto.randomUUID(), event_type: eventType,
      happened_at: new Date().toISOString(), receiver_name: receiver || null,
      notes: notes || null, proof_photo_data: photo || null };
    if (offline) { setQueue(q => [...q, { stopId, payload }]); setNotice('Stop update saved on this device.'); return true; }
    try { await api(`/stops/${stopId}/events`, token, payload); setNotice(`${eventType} recorded.`); await refresh(token); return true; }
    catch (cause) {
      if (cause instanceof TypeError) { setQueue(q => [...q, { stopId, payload }]); setNotice('Connection dropped; update saved on this device.'); return true; }
      setError(cause instanceof Error ? cause.message : 'Could not record stop'); return false;
    }
  }
  function logout() { sessionStorage.removeItem('waypoint-token'); localStorage.removeItem('waypoint-cached-snapshot'); setToken(''); setData(null); setPassword(''); setError(''); }

  if (!token || !data) return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-100 to-slate-200/80 px-4 py-12">
      <div className="w-full max-w-md">
        <Box className="shadow-lg border-slate-200/90">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Waypoint<span className="text-blue-600">Flow</span></h1>
            <p className="mt-1 text-sm text-slate-500">Demo Access · Select Your Role</p>
          </div>
          <form onSubmit={login} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Username
              <select className={`${input} mt-1.5`} value={username} onChange={e => setUsername(e.target.value)}>
                <option value="dispatcher">dispatcher</option>
                <option value="loader">loader</option>
                <option value="driver">driver</option>
                <option value="store">store</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input className={`${input} mt-1.5`} type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />
            </label>
            <button disabled={busy} className={`${button} w-full mt-2`}>
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-sm text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
          {token && <button onClick={logout} className="mt-4 block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700">Use another account</button>}
        </Box>
      </div>
    </div>
  );

  const role = { dispatcher: 'Dispatcher', loader: 'Loader', driver: 'Driver', store_manager: 'Store Manager' }[data.user.role];
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Waypoint<span className="text-blue-600">Flow</span></h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{role}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {data.demo_date}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-semibold text-slate-900 text-xs sm:text-sm">{data.user.display_name}</span>
              <span className="text-[11px] text-slate-400 capitalize">{data.user.role.replaceAll('_', ' ')}</span>
            </div>
            <button className={`${quiet} py-2 px-3 text-xs sm:text-sm`} onClick={logout} title="Sign Out">
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Switch account</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 py-6">
        {error && (
          <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-xs">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800 shadow-xs">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
            <span>{notice}</span>
          </div>
        )}
        {data.user.role === 'dispatcher' && <Dispatcher data={data} busy={busy} act={act} />}
        {data.user.role === 'loader' && <Loader data={data} busy={busy} act={act} />}
        {data.user.role === 'driver' && <Driver data={data} busy={busy} offline={offline} demoOffline={demoOffline} setDemoOffline={setDemoOffline} queue={queue} recordStop={recordStop} act={act} />}
        {data.user.role === 'store_manager' && <Store data={data} busy={busy} act={act} />}
      </main>
    </div>
  );
}

function Dispatcher({ data, busy, act }: { data: Snapshot; busy: boolean; act: Action }) {
  const [selected, setSelected] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [trip, setTrip] = useState('');
  const [departure, setDeparture] = useState('04:00');
  const [reason, setReason] = useState('Insufficient compatible vehicle capacity.');
  const [search, setSearch] = useState('');
  const open = data.orders.filter(o => ['confirmed', 'deferred'].includes(o.status));
  const chosen = data.orders.find(o => o.id === selected);
  const vehicles = data.vehicles.filter(v => v.depot === data.outlets.find(o => o.id === chosen?.outlet_id)?.depot);
  const draftTrips = data.trips.filter(t => t.status === 'draft' && t.trip_date === chosen?.order_date);
  const filtered = open.filter(o => `${o.id} ${o.outlet_id} ${o.brand}`.toLowerCase().includes(search.toLowerCase()));

  async function submit(event: FormEvent, path: string, payload: unknown, message: string) {
    event.preventDefault(); if (await act(path, payload, message)) setSelected('');
  }

  return (
    <>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Delivery Planning</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Assign valid trips or explain deferrals to outlet managers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Box className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs sm:text-sm font-medium">Waiting</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <strong className="mt-2 block text-2xl sm:text-3xl font-black text-slate-900">{open.length}</strong>
        </Box>
        <Box className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs sm:text-sm font-medium">Trips</span>
            <Truck className="h-4 w-4 text-indigo-500" />
          </div>
          <strong className="mt-2 block text-2xl sm:text-3xl font-black text-slate-900">{data.trips.length}</strong>
        </Box>
        <Box className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs sm:text-sm font-medium">Deferred now</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <strong className="mt-2 block text-2xl sm:text-3xl font-black text-slate-900">{data.orders.filter(o => o.status === 'deferred').length}</strong>
        </Box>
        <Box className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs sm:text-sm font-medium">Unserved</span>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <strong className="mt-2 block text-2xl sm:text-3xl font-black text-slate-900">{data.orders.filter(o => ['deferred', 'not_run'].includes(o.historical_outcome || '')).length}</strong>
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Box>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Order Queue</h3>
              <p className="text-xs text-slate-500">{filtered.length} pending orders</p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input className={`${input} pl-9 sm:w-64`} placeholder="Search order or outlet..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          
          <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
            {filtered.slice(0, 60).map(o => (
              <button 
                key={o.id} 
                onClick={() => setSelected(o.id)} 
                className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  selected === o.id 
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20' 
                    : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm sm:text-base font-semibold text-slate-900 truncate">{o.id}</strong>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      <span className="font-medium text-slate-800">{o.brand}</span> · {o.outlet_id} · <span className="capitalize">{o.temp_requirement}</span> · {o.order_weight_kg} kg / {o.order_volume_m3} m³ · {when(o.window_open_time)}–{when(o.window_close_time)}
                    </p>
                    {o.deferred_reason && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{o.deferred_reason}</span>
                      </p>
                    )}
                  </div>
                  <Badge value={o.status} />
                </div>
              </button>
            ))}
            {filtered.length > 60 && <p className="text-center py-2 text-xs text-slate-500">Showing first 60 orders; search for more.</p>}
            {!filtered.length && <p className="text-center py-8 text-sm text-slate-500">No matching orders in queue.</p>}
          </div>
        </Box>

        <Box>
          <h3 className="mb-3 text-base sm:text-lg font-bold text-slate-900">{chosen ? `Decide ${chosen.id}` : 'Select an order'}</h3>
          {chosen ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:text-sm">
                <span className="font-semibold text-slate-900">{chosen.brand}</span> · {chosen.outlet_id} · <span className="font-semibold text-blue-700">{chosen.order_units} units</span> · {chosen.temp_requirement}
              </div>
              <form onSubmit={e => void submit(e, '/trips', { order_id: chosen.id, vehicle_id: vehicle, departure_time: departure }, 'New draft trip created.')} className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Create New Trip</h4>
                <select className={input} value={vehicle} onChange={e => setVehicle(e.target.value)} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.id} · {v.type} · {v.temp} · {v.weight_cap_kg} kg</option>
                  ))}
                </select>
                <input type="time" className={input} value={departure} onChange={e => setDeparture(e.target.value)} />
                <button disabled={busy} className={`${button} w-full`}>Validate & Create Trip</button>
              </form>

              {draftTrips.length > 0 && (
                <form onSubmit={e => void submit(e, `/trips/${trip}/orders`, { order_id: chosen.id }, 'Order added to trip.')} className="space-y-2.5 border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Add to Draft Trip</h4>
                  <select className={input} value={trip} onChange={e => setTrip(e.target.value)} required>
                    <option value="">Select trip</option>
                    {draftTrips.map(t => <option key={t.id} value={t.id}>{t.id} · {t.vehicle_id}</option>)}
                  </select>
                  <button disabled={busy} className={`${quiet} w-full`}>Add to Trip</button>
                </form>
              )}

              <form onSubmit={e => void submit(e, `/orders/${chosen.id}/defer`, { reason }, 'Deferral recorded.')} className="space-y-2.5 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Defer Order</h4>
                <textarea className={input} rows={2} required value={reason} onChange={e => setReason(e.target.value)} />
                <button disabled={busy} className={`${button} w-full !bg-rose-600 hover:!bg-rose-700`}>Record Deferral</button>
              </form>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Package className="mx-auto h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm">Choose an order from the queue to start planning.</p>
            </div>
          )}
        </Box>
      </div>

      <Box>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Trips & Progress</h3>
            <p className="text-xs text-slate-500">{data.trips.length} active or scheduled trips</p>
          </div>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2">
          {data.trips.map(t => (
            <div key={t.id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm sm:text-base font-semibold text-slate-900 truncate">{t.id}</strong>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    <span className="font-medium text-slate-700">{t.vehicle_id}</span> · {t.depot} · depart <span className="font-semibold text-slate-800">{when(t.departure_time)}</span>
                  </p>
                </div>
                <Badge value={t.status} />
              </div>

              <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3">
                {tripStops(data, t.id).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs sm:text-sm text-slate-600 py-0.5">
                    <span className="truncate pr-2">
                      <strong className="text-slate-800">{s.sequence + 1}.</strong> {s.outlet_id} · ETA {when(s.planned_arrival_time)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase shrink-0">{s.status}</span>
                  </div>
                ))}
              </div>

              {t.status === 'draft' && (
                <button disabled={busy} className={`${button} mt-3.5 w-full`} onClick={() => void act(`/trips/${t.id}/publish`, {}, 'Trip published to loader and driver.')}>
                  Publish Trip
                </button>
              )}
            </div>
          ))}
          {!data.trips.length && <p className="col-span-2 py-8 text-center text-sm text-slate-500">No trips planned yet.</p>}
        </div>
      </Box>

      <Box>
        <h3 className="mb-3 text-base sm:text-lg font-bold text-slate-900">Exceptions & Issues</h3>
        <div className="space-y-2.5">
          {data.load_issues.map(i => (
            <div key={i.id} className="flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs sm:text-sm text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Loading Shortfall</span> · Trip {i.trip_id} · Order {i.order_id}: {i.reason} ({i.actual_units ?? '—'} / {i.expected_units ?? '—'} units)
              </div>
            </div>
          ))}
          {data.receipts.filter(r => r.issue).map(r => (
            <div key={r.order_id} className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs sm:text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold">Receipt Issue</span> · Order {r.order_id}: {r.issue}
              </div>
            </div>
          ))}
          {!data.load_issues.length && !data.receipts.some(r => r.issue) && (
            <p className="py-4 text-center text-sm text-slate-500">No reported exceptions. All workflows operating normally.</p>
          )}
        </div>
      </Box>
    </>
  );
}

function Loader({ data, busy, act }: { data: Snapshot; busy: boolean; act: Action }) {
  const trips = data.trips.filter(t => ['ready_loading', 'loading', 'loaded'].includes(t.status));
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [issueOrder, setIssueOrder] = useState('');
  const [actual, setActual] = useState('0');
  const [reason, setReason] = useState('Stock unavailable');
  const trip = trips.find(t => t.id === selected) || trips[0];
  const orders = trip ? tripOrders(data, trip.id) : [];
  const reported = new Set(data.load_issues.filter(i => i.trip_id === trip?.id).map(i => i.order_id));
  const allChecked = orders.length > 0 && orders.every(o => checked[o.id] || reported.has(o.id));

  async function report(event: FormEvent) {
    event.preventDefault();
    const order = orders.find(o => o.id === issueOrder);
    if (!trip || !order) return;
    if (await act(`/trips/${trip.id}/load-issues`, { 
      order_id: order.id, 
      expected_units: order.order_units,
      actual_units: Number(actual), 
      reason 
    }, 'Loading shortfall recorded.')) setIssueOrder('');
  }

  return (
    <>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Loading Dock</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Check the stop sequence and report shortfalls before departure.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Box>
          <h3 className="mb-3 text-base font-bold text-slate-900">Published Trips</h3>
          <div className="space-y-2">
            {trips.map(t => (
              <button 
                key={t.id} 
                onClick={() => { setSelected(t.id); setChecked({}); }} 
                className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  trip?.id === t.id 
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20' 
                    : 'border-slate-200/90 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-semibold text-slate-900 truncate">{t.id}</strong>
                    <p className="mt-0.5 text-xs text-slate-500">{t.vehicle_id} · {t.depot}</p>
                  </div>
                  <Badge value={t.status} />
                </div>
              </button>
            ))}
            {!trips.length && <p className="py-6 text-center text-xs sm:text-sm text-slate-500">Waiting for dispatcher publication.</p>}
          </div>
        </Box>

        <Box>
          {trip ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{trip.id} Loading List</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Load in reverse stop order for easier unloading.</p>
                </div>
                <Badge value={trip.status} />
              </div>

              <div className="space-y-3">
                {tripStops(data, trip.id).slice().reverse().map(s => (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <strong className="text-xs sm:text-sm font-semibold text-slate-800">Stop {s.sequence + 1} · {s.outlet_id}</strong>
                      <span className="text-[11px] font-medium text-slate-500">ETA {when(s.planned_arrival_time)}</span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {s.order_ids.map(id => {
                        const order = data.orders.find(o => o.id === id);
                        if (!order) return null;
                        const isReported = reported.has(id);
                        return (
                          <label key={id} className="flex items-center gap-3 py-1.5 text-xs sm:text-sm cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={!!checked[id] || isReported} 
                              disabled={trip.status === 'loaded' || isReported} 
                              onChange={e => setChecked(c => ({ ...c, [id]: e.target.checked }))} 
                              className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="flex-1 text-slate-700">
                              <span className="font-semibold text-slate-900">{id}</span> · {order.order_units} units · <span className="capitalize">{order.temp_requirement}</span>
                            </span>
                            {isReported && <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">Issue Flagged</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {trip.status !== 'loaded' && (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                  <form onSubmit={report} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-rose-900">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      Flag Missing or Damaged Goods
                    </h4>
                    <select className={input} required value={issueOrder} onChange={e => setIssueOrder(e.target.value)}>
                      <option value="">Select order</option>
                      {orders.map(o => <option key={o.id} value={o.id}>{o.id} · expected {o.order_units} units</option>)}
                    </select>
                    <label className="block text-xs font-semibold text-slate-700">
                      Units loaded
                      <input type="number" min="0" className={`${input} mt-1`} value={actual} onChange={e => setActual(e.target.value)} />
                    </label>
                    <input className={input} placeholder="Reason (e.g. Stock unavailable)" required value={reason} onChange={e => setReason(e.target.value)} />
                    <button disabled={busy} className={`${button} !bg-rose-600 hover:!bg-rose-700`}>Report Shortfall</button>
                  </form>

                  <div>
                    <button disabled={busy || !allChecked} className={`${button} w-full`} onClick={() => void act(`/trips/${trip.id}/loaded`, {}, 'Loading completed. Driver can depart.')}>
                      Complete Loading
                    </button>
                    <p className="mt-2 text-center text-xs text-slate-500">Check each order or report its shortfall to proceed.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">No trip ready for loading.</p>
          )}
        </Box>
      </div>
    </>
  );
}

function Driver({ data, busy, offline, demoOffline, setDemoOffline, queue, recordStop, act }: {
  data: Snapshot; busy: boolean; offline: boolean; demoOffline: boolean;
  setDemoOffline: (value: boolean) => void; queue: QueueItem[];
  recordStop: (id: number, type: 'arrived' | 'delivered' | 'problem', receiver?: string, notes?: string, photo?: string) => Promise<boolean>;
  act: Action;
}) {
  const [selected, setSelected] = useState('');
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const [receiver, setReceiver] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState('');
  const trips = data.trips.filter(t => ['loaded', 'en_route', 'completed'].includes(t.status));
  const trip = trips.find(t => t.id === selected) || trips[0];
  const effective = (stop: Stop) => queue.filter(q => q.stopId === stop.id).reduce((status, q) => {
    const kind = q.payload.event_type;
    return kind === 'delivered' ? 'delivered (pending sync)' : kind === 'arrived' ? 'arrived (pending sync)' : kind === 'problem' ? 'exception (pending sync)' : status;
  }, stop.status);

  function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 900_000) { setNotes('Photo too large; use one under 900 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Driver Route</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Record stops and proof of delivery when safely parked.</p>
        </div>
        <label className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold cursor-pointer transition-all shadow-xs ${
          demoOffline ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          {demoOffline ? <WifiOff className="h-4 w-4 text-amber-600" /> : <Wifi className="h-4 w-4 text-emerald-600" />}
          <input type="checkbox" checked={demoOffline} onChange={e => setDemoOffline(e.target.checked)} className="sr-only" />
          <span>Simulate offline {demoOffline ? '(Active)' : ''}</span>
        </label>
      </div>

      {(offline || queue.length > 0) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs sm:text-sm text-amber-900 shadow-xs">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{offline ? 'Offline Mode: stop updates are saved locally on this device.' : 'Connected: synchronizing saved updates.'} ({queue.length} pending event(s))</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Box>
          <h3 className="mb-3 text-base font-bold text-slate-900">Assigned Routes</h3>
          <div className="space-y-2">
            {trips.map(t => (
              <button 
                key={t.id} 
                onClick={() => { setSelected(t.id); setActiveStop(null); }} 
                className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  trip?.id === t.id 
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20' 
                    : 'border-slate-200/90 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-semibold text-slate-900 truncate">{t.id}</strong>
                    <p className="mt-0.5 text-xs text-slate-500">{t.vehicle_id} · {tripStops(data, t.id).length} stops</p>
                  </div>
                  <Badge value={t.status} />
                </div>
              </button>
            ))}
            {!trips.length && <p className="py-6 text-center text-xs sm:text-sm text-slate-500">Waiting for a loaded trip.</p>}
          </div>
        </Box>

        <Box>
          {trip ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{trip.id}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{trip.vehicle_id} · departure <span className="font-semibold text-slate-800">{when(trip.departure_time)}</span></p>
                </div>
                <Badge value={trip.status} />
              </div>

              {trip.status === 'loaded' && (
                <button disabled={busy || offline} className={`${button} mb-4 w-full`} onClick={() => void act(`/trips/${trip.id}/depart`, {}, 'Trip departed.')}>
                  Depart Depot
                </button>
              )}

              <div className="space-y-3">
                {tripStops(data, trip.id).map(stop => (
                  <div key={stop.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm sm:text-base font-semibold text-slate-900">Stop {stop.sequence + 1} · {stop.outlet_id}</strong>
                        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                          ETA <span className="font-semibold text-slate-700">{when(stop.planned_arrival_time)}</span> · {stop.order_ids.join(', ')}
                        </p>
                      </div>
                      <Badge value={effective(stop)} />
                    </div>

                    {trip.status === 'en_route' && !effective(stop).startsWith('delivered') && (
                      <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <button className={`${quiet} py-2 px-3 text-xs sm:text-sm`} onClick={() => void recordStop(stop.id, 'arrived')}>
                          Mark Arrived
                        </button>
                        <button className={`${button} py-2 px-3 text-xs sm:text-sm`} onClick={() => { setActiveStop(stop.id); setReceiver(''); setNotes(''); setPhoto(''); }}>
                          Record Delivery
                        </button>
                        <button className={`${quiet} py-2 px-3 text-xs sm:text-sm !text-rose-700 hover:!bg-rose-50`} onClick={() => { const reason = window.prompt('Describe the problem:'); if (reason) void recordStop(stop.id, 'problem', '', reason); }}>
                          Report Problem
                        </button>
                      </div>
                    )}

                    {activeStop === stop.id && (
                      <form onSubmit={async e => { e.preventDefault(); if (await recordStop(stop.id, 'delivered', receiver, notes, photo)) setActiveStop(null); }} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Proof of Delivery</h4>
                        <label className="block text-xs font-semibold text-slate-700">
                          Receiver Name / Signature
                          <input className={`${input} mt-1`} required value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="e.g. John Doe (Store Manager)" />
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                          Notes (Optional)
                          <input className={`${input} mt-1`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Left at rear receiving bay" />
                        </label>
                        <label className="block text-xs font-semibold text-slate-700">
                          Proof photo (optional)
                          <input className="mt-1.5 block w-full text-xs text-slate-600" type="file" accept="image/*" capture="environment" onChange={e => choosePhoto(e.target.files?.[0])} />
                        </label>
                        {photo && <p className="text-xs font-medium text-emerald-700">✓ Photo attached and ready to save.</p>}
                        <div className="flex gap-2 pt-1">
                          <button className={`${button} flex-1`}>Save Proof of Delivery</button>
                          <button type="button" className={quiet} onClick={() => setActiveStop(null)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-slate-500">No loaded route assigned.</p>
          )}
        </Box>
      </div>
    </>
  );
}

function Store({ data, busy, act }: { data: Snapshot; busy: boolean; act: Action }) {
  const [units, setUnits] = useState('10');
  const [weight, setWeight] = useState('100');
  const [volume, setVolume] = useState('0.5');
  const [temp, setTemp] = useState('ambient');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [received, setReceived] = useState('');
  const [issue, setIssue] = useState('');
  const outlet = data.outlets.find(o => o.id === data.user.outlet_id);
  const eta = (order: Order) => data.stops.find(s => s.order_ids.includes(order.id))?.planned_arrival_time;

  async function place(event: FormEvent) {
    event.preventDefault();
    await act('/orders', { 
      order_date: data.demo_date, 
      order_units: Number(units),
      order_weight_kg: Number(weight), 
      order_volume_m3: Number(volume), 
      temp_requirement: temp 
    }, 'Order confirmed and sent to dispatch.');
  }

  async function confirm(event: FormEvent) {
    event.preventDefault(); if (!receiptOrder) return;
    if (await act(`/orders/${receiptOrder.id}/receipt`, { received_units: Number(received), issue: issue || null }, 'Receipt confirmed.')) setReceiptOrder(null);
  }

  return (
    <>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Store Manager</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{outlet?.brand}</span> · Outlet {outlet?.id} · {outlet?.district}. Place orders and confirm receipt.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Box>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">Place Order</h3>
          <p className="mb-4 text-xs text-slate-500">Demo Date: <span className="font-semibold">{data.demo_date}</span> · Next-day cutoff: 16:00</p>
          <form onSubmit={place} className="space-y-3.5">
            <label className="block text-xs font-semibold text-slate-700">
              Units
              <input className={`${input} mt-1`} type="number" min="1" required value={units} onChange={e => setUnits(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block text-xs font-semibold text-slate-700">
                Weight (kg)
                <input className={`${input} mt-1`} type="number" min="0.01" step="0.01" required value={weight} onChange={e => setWeight(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Volume (m³)
                <input className={`${input} mt-1`} type="number" min="0.001" step="0.001" required value={volume} onChange={e => setVolume(e.target.value)} />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Temperature
              <select className={`${input} mt-1`} value={temp} onChange={e => setTemp(e.target.value)}>
                <option value="ambient">Ambient</option>
                <option value="chilled">Chilled</option>
              </select>
            </label>
            <button disabled={busy} className={`${button} w-full mt-2`}>Confirm Order</button>
          </form>
        </Box>

        <Box>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">My Orders</h3>
              <p className="text-xs text-slate-500">{data.orders.length} total orders for this outlet</p>
            </div>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {data.orders.slice().reverse().map(o => (
              <div key={o.id} className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm sm:text-base font-semibold text-slate-900 truncate">{o.id}</strong>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                      <span className="font-medium text-slate-800">{o.order_units} units</span> · <span className="capitalize">{o.temp_requirement}</span> · window {when(o.window_open_time)}–{when(o.window_close_time)}
                    </p>
                  </div>
                  <Badge value={o.status} />
                </div>

                {eta(o) && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Expected arrival: <strong>{when(eta(o))}</strong></span>
                  </p>
                )}

                {o.deferred_reason && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Deferred: {o.deferred_reason}</span>
                  </p>
                )}

                {o.status === 'delivered' && (
                  <button className={`${button} mt-3.5 w-full sm:w-auto text-xs sm:text-sm py-2`} onClick={() => { setReceiptOrder(o); setReceived(String(o.order_units)); setIssue(''); }}>
                    Confirm Receipt / Report Issue
                  </button>
                )}

                {data.receipts.find(r => r.order_id === o.id)?.issue && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Reported issue: {data.receipts.find(r => r.order_id === o.id)?.issue}</span>
                  </p>
                )}
              </div>
            ))}
            {!data.orders.length && <p className="py-12 text-center text-sm text-slate-500">No orders created yet.</p>}
          </div>
        </Box>
      </div>

      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md">
            <Box className="shadow-2xl">
              <h3 className="mb-1 text-lg font-bold text-slate-900">Confirm Order Receipt</h3>
              <p className="mb-4 text-xs text-slate-500">Order ID: <span className="font-semibold text-slate-800">{receiptOrder.id}</span></p>
              
              <form onSubmit={confirm} className="space-y-3.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Units Received (Max: {receiptOrder.order_units})
                  <input className={`${input} mt-1`} type="number" min="0" max={receiptOrder.order_units} required value={received} onChange={e => setReceived(e.target.value)} />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Issue Description (Optional)
                  <textarea className={`${input} mt-1`} rows={3} value={issue} onChange={e => setIssue(e.target.value)} placeholder="Damaged items, missing quantity, or discrepancy..." />
                </label>
                <div className="flex gap-2.5 pt-2">
                  <button disabled={busy} className={`${button} flex-1`}>Confirm Receipt</button>
                  <button type="button" className={quiet} onClick={() => setReceiptOrder(null)}>Cancel</button>
                </div>
              </form>
            </Box>
          </div>
        </div>
      )}
    </>
  );
}
