import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from './api';
import type { Order, Snapshot, Stop, User } from './api';

type QueueItem = { stopId: number; payload: Record<string, unknown> };
type Action = (path: string, payload: unknown, message: string) => Promise<boolean>;
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300';
const quiet = 'rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700';
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

function Box({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>;
}
function Badge({ value }: { value: string }) {
  const color = value.includes('deferred') || value.includes('exception') ? 'bg-red-100 text-red-800' :
    value.includes('delivered') || value.includes('completed') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
  return <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${color}`}>{value.replaceAll('_', ' ')}</span>;
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

  if (!token || !data) return <div className="min-h-screen bg-slate-100 px-4 py-12"><div className="mx-auto max-w-md"><Box>
    <h1 className="mb-2 text-3xl font-black">Waypoint<span className="text-blue-600">Flow</span></h1>
    <p className="mb-6 text-sm text-slate-500">Hackathon demo · one account per role</p>
    <form onSubmit={login} className="space-y-4"><label className="block text-sm font-semibold">Username<select className={`${input} mt-1`} value={username} onChange={e => setUsername(e.target.value)}><option>dispatcher</option><option>loader</option><option>driver</option><option value="store">store</option></select></label><label className="block text-sm font-semibold">Password<input className={`${input} mt-1`} type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy} className={`${button} w-full`}>Sign in</button></form>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {token && <button onClick={logout} className="mt-4 text-sm text-blue-700 underline">Use another account</button>}
  </Box></div></div>;

  const role = { dispatcher: 'Dispatcher', loader: 'Loader', driver: 'Driver', store_manager: 'Store Manager' }[data.user.role];
  return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4"><div><h1 className="text-2xl font-black">Waypoint<span className="text-blue-600">Flow</span></h1><p className="text-xs text-slate-500">{role} · Demo day {data.demo_date}</p></div><div className="flex items-center gap-3 text-sm"><span>{data.user.display_name}</span><button className={quiet} onClick={logout}>Switch account</button></div></div></header>
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">{error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}{notice && <div role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{notice}</div>}
      {data.user.role === 'dispatcher' && <Dispatcher data={data} busy={busy} act={act} />}
      {data.user.role === 'loader' && <Loader data={data} busy={busy} act={act} />}
      {data.user.role === 'driver' && <Driver data={data} busy={busy} offline={offline} demoOffline={demoOffline} setDemoOffline={setDemoOffline} queue={queue} recordStop={recordStop} act={act} />}
      {data.user.role === 'store_manager' && <Store data={data} busy={busy} act={act} />}
    </main></div>;
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
  return <><div><h2 className="text-2xl font-bold">Delivery planning</h2><p className="text-slate-500">Assign valid trips or explain deferrals.</p></div>
    <div className="grid gap-3 sm:grid-cols-4"><Box><p className="text-sm text-slate-500">Waiting</p><strong className="text-3xl">{open.length}</strong></Box><Box><p className="text-sm text-slate-500">Trips</p><strong className="text-3xl">{data.trips.length}</strong></Box><Box><p className="text-sm text-slate-500">Deferred now</p><strong className="text-3xl">{data.orders.filter(o => o.status === 'deferred').length}</strong></Box><Box><p className="text-sm text-slate-500">Historically unserved</p><strong className="text-3xl">{data.orders.filter(o => ['deferred', 'not_run'].includes(o.historical_outcome || '')).length}</strong></Box></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><Box><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">Order queue</h3><input className={`${input} max-w-xs`} placeholder="Search order or outlet" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="max-h-[540px] space-y-2 overflow-y-auto">{filtered.slice(0, 60).map(o => <button key={o.id} onClick={() => setSelected(o.id)} className={`w-full rounded-lg border p-3 text-left ${selected === o.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><div className="flex justify-between gap-2"><strong>{o.id}</strong><Badge value={o.status} /></div><p className="mt-1 text-sm text-slate-600">{o.brand} · {o.outlet_id} · {o.temp_requirement} · {o.order_weight_kg} kg / {o.order_volume_m3} m³ · {when(o.window_open_time)}–{when(o.window_close_time)}</p>{o.deferred_reason && <p className="text-xs text-red-700">{o.deferred_reason}</p>}</button>)}{filtered.length > 60 && <p className="text-sm text-slate-500">Showing 60; search for more.</p>}</div></Box>
      <Box><h3 className="mb-3 text-lg font-bold">{chosen ? `Decide ${chosen.id}` : 'Select an order'}</h3>{chosen ? <div className="space-y-4"><p className="rounded-lg bg-slate-50 p-3 text-sm">{chosen.brand} · {chosen.outlet_id} · {chosen.order_units} units · {chosen.temp_requirement}</p><form onSubmit={e => void submit(e, '/trips', { order_id: chosen.id, vehicle_id: vehicle, departure_time: departure }, 'New draft trip created.')} className="space-y-2"><h4 className="font-semibold">New trip</h4><select className={input} value={vehicle} onChange={e => setVehicle(e.target.value)} required><option value="">Select vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.id} · {v.type} · {v.temp} · {v.weight_cap_kg} kg</option>)}</select><input type="time" className={input} value={departure} onChange={e => setDeparture(e.target.value)} /><button disabled={busy} className={`${button} w-full`}>Validate and create</button></form>
      {draftTrips.length > 0 && <form onSubmit={e => void submit(e, `/trips/${trip}/orders`, { order_id: chosen.id }, 'Order added to trip.')} className="space-y-2 border-t pt-3"><h4 className="font-semibold">Add to draft trip</h4><select className={input} value={trip} onChange={e => setTrip(e.target.value)} required><option value="">Select trip</option>{draftTrips.map(t => <option key={t.id} value={t.id}>{t.id} · {t.vehicle_id}</option>)}</select><button disabled={busy} className={`${quiet} w-full`}>Validate and add</button></form>}
      <form onSubmit={e => void submit(e, `/orders/${chosen.id}/defer`, { reason }, 'Deferral recorded.')} className="space-y-2 border-t pt-3"><h4 className="font-semibold">Defer with reason</h4><textarea className={input} rows={2} required value={reason} onChange={e => setReason(e.target.value)} /><button disabled={busy} className={`${button} w-full !bg-red-600`}>Record deferral</button></form></div> : <p className="text-sm text-slate-500">Choose an order from the queue.</p>}</Box></div>
    <Box><h3 className="mb-3 text-lg font-bold">Trips and progress</h3><div className="grid gap-3 md:grid-cols-2">{data.trips.map(t => <div key={t.id} className="rounded-lg border p-4"><div className="flex justify-between gap-2"><div><strong>{t.id}</strong><p className="text-sm text-slate-500">{t.vehicle_id} · {t.depot} · depart {when(t.departure_time)}</p></div><Badge value={t.status} /></div><ol className="mt-3 space-y-1 text-sm">{tripStops(data, t.id).map(s => <li key={s.id}>{s.sequence + 1}. {s.outlet_id} · ETA {when(s.planned_arrival_time)} · {s.order_ids.join(', ')} · {s.status}</li>)}</ol>{t.status === 'draft' && <button disabled={busy} className={`${button} mt-3 w-full`} onClick={() => void act(`/trips/${t.id}/publish`, {}, 'Trip published to loader and driver.')}>Publish trip</button>}</div>)}{!data.trips.length && <p className="text-sm text-slate-500">No trips planned yet.</p>}</div></Box>
    <Box><h3 className="mb-2 text-lg font-bold">Exceptions</h3>{data.load_issues.map(i => <p key={i.id} className="border-b py-2 text-sm">Loading · {i.trip_id} · {i.order_id}: {i.reason} ({i.actual_units ?? '—'} / {i.expected_units ?? '—'} units)</p>)}{data.receipts.filter(r => r.issue).map(r => <p key={r.order_id} className="border-b py-2 text-sm">Receipt · {r.order_id}: {r.issue}</p>)}{!data.load_issues.length && !data.receipts.some(r => r.issue) && <p className="text-sm text-slate-500">No reported issues.</p>}</Box>
  </>;
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
    if (await act(`/trips/${trip.id}/load-issues`, { order_id: order.id, expected_units: order.order_units,
      actual_units: Number(actual), reason }, 'Loading shortfall recorded.')) setIssueOrder('');
  }
  return <><div><h2 className="text-2xl font-bold">Loading dock</h2><p className="text-slate-500">Check the stop sequence and report shortfalls before departure.</p></div>
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"><Box><h3 className="mb-3 font-bold">Published trips</h3><div className="space-y-2">{trips.map(t => <button key={t.id} onClick={() => { setSelected(t.id); setChecked({}); }} className={`w-full rounded-lg border p-3 text-left ${trip?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><strong>{t.id}</strong><p className="text-sm text-slate-500">{t.vehicle_id} · {t.depot}</p><Badge value={t.status} /></button>)}{!trips.length && <p className="text-sm text-slate-500">Waiting for dispatcher publication.</p>}</div></Box>
      <Box>{trip ? <><div className="mb-4 flex justify-between gap-2"><div><h3 className="text-lg font-bold">{trip.id} loading list</h3><p className="text-sm text-slate-500">Load in reverse stop order for easier unloading.</p></div><Badge value={trip.status} /></div>{tripStops(data, trip.id).slice().reverse().map(s => <div key={s.id} className="mb-3 rounded-lg border p-3"><strong>Stop {s.sequence + 1} · {s.outlet_id}</strong><p className="text-xs text-slate-500">ETA {when(s.planned_arrival_time)}</p>{s.order_ids.map(id => { const order = data.orders.find(o => o.id === id); return order && <label key={id} className="flex items-center gap-3 border-t py-3 text-sm"><input type="checkbox" checked={!!checked[id] || reported.has(id)} disabled={trip.status === 'loaded' || reported.has(id)} onChange={e => setChecked(c => ({ ...c, [id]: e.target.checked }))} /><span className="flex-1">{id} · {order.order_units} units · {order.temp_requirement}</span>{reported.has(id) && <span className="text-red-700">Issue</span>}</label>; })}</div>)}
      {trip.status !== 'loaded' && <><form onSubmit={report} className="mb-4 space-y-2 rounded-lg bg-red-50 p-4"><h4 className="font-bold">Flag missing or damaged goods</h4><select className={input} required value={issueOrder} onChange={e => setIssueOrder(e.target.value)}><option value="">Select order</option>{orders.map(o => <option key={o.id} value={o.id}>{o.id} · expected {o.order_units}</option>)}</select><label className="block text-sm">Units loaded<input type="number" min="0" className={input} value={actual} onChange={e => setActual(e.target.value)} /></label><input className={input} required value={reason} onChange={e => setReason(e.target.value)} /><button disabled={busy} className={`${button} !bg-red-600`}>Report shortfall</button></form><button disabled={busy || !allChecked} className={`${button} w-full`} onClick={() => void act(`/trips/${trip.id}/loaded`, {}, 'Loading completed. Driver can depart.')}>Complete loading</button><p className="mt-2 text-xs text-slate-500">Check each order or report its shortfall.</p></>}</> : <p className="text-slate-500">No trip ready for loading.</p>}</Box></div>
  </>;
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
  return <><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">Driver route</h2><p className="text-slate-500">Record stops when safely parked.</p></div><label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><input type="checkbox" checked={demoOffline} onChange={e => setDemoOffline(e.target.checked)} /> Simulate offline</label></div>
    {(offline || queue.length > 0) && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{offline ? 'Offline: stop updates save on this device.' : 'Synchronizing saved updates.'} {queue.length} pending event(s).</div>}
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"><Box><h3 className="mb-3 font-bold">Assigned routes</h3><div className="space-y-2">{trips.map(t => <button key={t.id} onClick={() => { setSelected(t.id); setActiveStop(null); }} className={`w-full rounded-lg border p-3 text-left ${trip?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><strong>{t.id}</strong><p className="text-sm text-slate-500">{t.vehicle_id} · {tripStops(data, t.id).length} stops</p><Badge value={t.status} /></button>)}{!trips.length && <p className="text-sm text-slate-500">Waiting for a loaded trip.</p>}</div></Box>
      <Box>{trip ? <><div className="mb-3 flex justify-between gap-2"><div><h3 className="text-lg font-bold">{trip.id}</h3><p className="text-sm text-slate-500">{trip.vehicle_id} · departure {when(trip.departure_time)}</p></div><Badge value={trip.status} /></div>{trip.status === 'loaded' && <button disabled={busy || offline} className={`${button} mb-4 w-full`} onClick={() => void act(`/trips/${trip.id}/depart`, {}, 'Trip departed.')}>Depart depot</button>}
      <div className="space-y-3">{tripStops(data, trip.id).map(stop => <div key={stop.id} className="rounded-lg border p-4"><div className="flex justify-between gap-2"><div><strong>Stop {stop.sequence + 1} · {stop.outlet_id}</strong><p className="text-sm text-slate-500">ETA {when(stop.planned_arrival_time)} · {stop.order_ids.join(', ')}</p></div><Badge value={effective(stop)} /></div>{trip.status === 'en_route' && !effective(stop).startsWith('delivered') && <div className="mt-3 flex flex-wrap gap-2"><button className={quiet} onClick={() => void recordStop(stop.id, 'arrived')}>Arrived</button><button className={button} onClick={() => { setActiveStop(stop.id); setReceiver(''); setNotes(''); setPhoto(''); }}>Record delivery</button><button className={quiet} onClick={() => { const reason = window.prompt('Describe the problem:'); if (reason) void recordStop(stop.id, 'problem', '', reason); }}>Report problem</button></div>}
      {activeStop === stop.id && <form onSubmit={async e => { e.preventDefault(); if (await recordStop(stop.id, 'delivered', receiver, notes, photo)) setActiveStop(null); }} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3"><label className="block text-sm font-semibold">Receiver name / typed signature<input className={`${input} mt-1`} required value={receiver} onChange={e => setReceiver(e.target.value)} /></label><label className="block text-sm font-semibold">Notes<input className={`${input} mt-1`} value={notes} onChange={e => setNotes(e.target.value)} /></label><label className="block text-sm font-semibold">Proof photo (optional)<input className="mt-1 block w-full text-sm" type="file" accept="image/*" capture="environment" onChange={e => choosePhoto(e.target.files?.[0])} /></label>{photo && <p className="text-xs text-emerald-700">Photo ready to save.</p>}<button className={button}>Save proof of delivery</button></form>}</div>)}</div></> : <p className="text-slate-500">No loaded route yet.</p>}</Box></div>
  </>;
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
    await act('/orders', { order_date: data.demo_date, order_units: Number(units),
      order_weight_kg: Number(weight), order_volume_m3: Number(volume), temp_requirement: temp },
    'Order confirmed and sent to dispatch.');
  }
  async function confirm(event: FormEvent) {
    event.preventDefault(); if (!receiptOrder) return;
    if (await act(`/orders/${receiptOrder.id}/receipt`, { received_units: Number(received), issue: issue || null }, 'Receipt confirmed.')) setReceiptOrder(null);
  }
  return <><div><h2 className="text-2xl font-bold">Store manager</h2><p className="text-slate-500">{outlet?.brand} · {outlet?.id} · {outlet?.district}. Place orders and confirm receipt.</p></div><div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]"><Box><h3 className="mb-2 text-lg font-bold">Place order</h3><p className="mb-4 text-sm text-slate-500">Demo date: {data.demo_date}. Normal next-day cutoff: 16:00 Sri Lanka time.</p><form onSubmit={place} className="space-y-3"><label className="block text-sm font-semibold">Units<input className={`${input} mt-1`} type="number" min="1" required value={units} onChange={e => setUnits(e.target.value)} /></label><label className="block text-sm font-semibold">Weight (kg)<input className={`${input} mt-1`} type="number" min="0.01" step="0.01" required value={weight} onChange={e => setWeight(e.target.value)} /></label><label className="block text-sm font-semibold">Volume (m³)<input className={`${input} mt-1`} type="number" min="0.001" step="0.001" required value={volume} onChange={e => setVolume(e.target.value)} /></label><label className="block text-sm font-semibold">Temperature<select className={`${input} mt-1`} value={temp} onChange={e => setTemp(e.target.value)}><option value="ambient">Ambient</option><option value="chilled">Chilled</option></select></label><button disabled={busy} className={`${button} w-full`}>Confirm order</button></form></Box>
      <Box><h3 className="mb-3 text-lg font-bold">My orders</h3><div className="max-h-[650px] space-y-3 overflow-y-auto">{data.orders.slice().reverse().map(o => <div key={o.id} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><div><strong>{o.id}</strong><p className="text-sm text-slate-500">{o.order_units} units · {o.temp_requirement} · window {when(o.window_open_time)}–{when(o.window_close_time)}</p></div><Badge value={o.status} /></div>{eta(o) && <p className="mt-2 text-sm text-blue-700">Expected arrival: {when(eta(o))}</p>}{o.deferred_reason && <p className="mt-2 text-sm text-red-700">Deferred: {o.deferred_reason}</p>}{o.status === 'delivered' && <button className={`${button} mt-3`} onClick={() => { setReceiptOrder(o); setReceived(String(o.order_units)); setIssue(''); }}>Confirm receipt / report issue</button>}{data.receipts.find(r => r.order_id === o.id)?.issue && <p className="mt-2 text-sm text-red-700">Reported issue: {data.receipts.find(r => r.order_id === o.id)?.issue}</p>}</div>)}</div></Box></div>
    {receiptOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"><div className="w-full max-w-md"><Box><h3 className="mb-4 text-lg font-bold">Confirm {receiptOrder.id}</h3><form onSubmit={confirm} className="space-y-3"><label className="block text-sm font-semibold">Units received<input className={`${input} mt-1`} type="number" min="0" max={receiptOrder.order_units} required value={received} onChange={e => setReceived(e.target.value)} /></label><label className="block text-sm font-semibold">Issue (optional)<textarea className={`${input} mt-1`} rows={3} value={issue} onChange={e => setIssue(e.target.value)} placeholder="Missing or damaged goods" /></label><div className="flex gap-2"><button disabled={busy} className={button}>Confirm receipt</button><button type="button" className={quiet} onClick={() => setReceiptOrder(null)}>Cancel</button></div></form></Box></div></div>}
  </>;
}
