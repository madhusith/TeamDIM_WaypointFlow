import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PackageCheck, Truck, Route as RouteIcon, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export const DispatcherDashboard: React.FC = () => {
  const { orders, trips, vehicles, exceptions, resetDemo, setOffline, isOffline } = useAppStore();

  const confirmedOrders = orders.filter(o => o.status === 'Confirmed').length;
  const availableVehicles = vehicles.filter(v => v.status === 'available').length;
  const plannedTrips = trips.filter(t => t.status === 'In Planning' || t.status === 'Planned' || t.status === 'Ready for Loading').length;
  const deferredOrders = orders.filter(o => o.status === 'Deferred').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning, Dispatcher</h1>
          <p className="text-slate-500">Tuesday, 29 September</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Demo Controls hidden slightly for demoers */}
          <div className="flex items-center gap-2 mr-4 bg-slate-200 px-3 py-1.5 rounded text-xs font-medium text-slate-600">
            <span className="font-bold mr-2 text-slate-400">DEMO</span>
            <button onClick={resetDemo} className="hover:text-primary-600">Reset</button>
            <span>|</span>
            <button onClick={() => setOffline(!isOffline)} className={clsx(isOffline ? "text-danger" : "hover:text-primary-600")}>
              {isOffline ? 'Go Online' : 'Simulate Offline'}
            </button>
          </div>
          <Link to="/dispatcher/planning" className="bg-primary-600 text-white px-4 py-2 rounded-md font-medium hover:bg-primary-700 transition-colors shadow-sm text-sm">
            Plan Today's Deliveries
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Confirmed Orders" value={confirmedOrders} icon={PackageCheck} color="primary" />
        <KPICard title="Vehicles Available" value={availableVehicles} icon={Truck} color="success" />
        <KPICard title="Trips Planned" value={plannedTrips} icon={RouteIcon} color="info" />
        <KPICard title="Deferred" value={deferredOrders} icon={AlertTriangle} color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Delivery Status */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-semibold text-slate-800">Today's Delivery Status</h2>
            <Link to="/dispatcher/live" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View Map <ArrowRight size={14} />
            </Link>
          </div>
          <div className="p-5">
            <div className="flex justify-between items-center mb-6">
              <StatusBadge status="Planned" count={trips.filter(t=>t.status==='Planned').length} />
              <div className="flex-1 h-px bg-slate-200 mx-2"></div>
              <StatusBadge status="Loading" count={trips.filter(t=>t.status==='Loading').length} color="info" />
              <div className="flex-1 h-px bg-slate-200 mx-2"></div>
              <StatusBadge status="En Route" count={trips.filter(t=>t.status==='En Route').length} color="warning" />
              <div className="flex-1 h-px bg-slate-200 mx-2"></div>
              <StatusBadge status="Delivered" count={trips.filter(t=>t.status==='Completed').length} color="success" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Trips</h3>
              {trips.length > 0 ? trips.map(trip => (
                <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md shadow-sm text-slate-600">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900">{trip.id} • {trip.vehicleId}</div>
                      <div className="text-xs text-slate-500">{trip.stops.length} stops • {trip.depot}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={clsx(
                      "px-2.5 py-1 rounded-full text-xs font-medium mb-1",
                      trip.status === 'Ready for Loading' || trip.status === 'Loading' ? "bg-info/10 text-info" :
                      trip.status === 'En Route' ? "bg-warning/10 text-warning" :
                      trip.status === 'Completed' ? "bg-success/10 text-success" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {trip.status}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{trip.departureTime}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-sm text-slate-500">No active trips currently.</div>
              )}
            </div>
          </div>
        </div>

        {/* Exceptions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" />
              Active Exceptions
            </h2>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            {exceptions.filter(e => e.status === 'Open').length > 0 ? (
              <div className="divide-y divide-slate-100">
                {exceptions.filter(e => e.status === 'Open').map(exc => (
                  <div key={exc.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="font-medium text-sm text-slate-900 mb-1">{exc.type}</div>
                    <div className="text-sm text-slate-600 mb-2">{exc.referenceId}</div>
                    <div className="text-xs text-slate-500 mb-3">{exc.message}</div>
                    <button className="text-xs font-medium text-primary-600 hover:text-primary-700">Resolve Issue</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-3">
                  <PackageCheck size={24} />
                </div>
                <div className="font-medium text-slate-700 mb-1">No active exceptions</div>
                <div className="text-sm">Operations are running smoothly.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color = 'primary' }: any) => {
  const colorMap = {
    primary: "text-primary-600 bg-primary-100",
    success: "text-success bg-success/20",
    info: "text-info bg-info/20",
    danger: "text-danger bg-danger/20",
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-lg flex items-center justify-center", colorMap[color as keyof typeof colorMap])}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-slate-500 text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, count, color = 'neutral' }: any) => {
  const colorClasses = {
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    info: "bg-info/10 text-info border-info/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2",
        colorClasses[color as keyof typeof colorClasses]
      )}>
        {count}
      </div>
      <span className="text-xs font-medium text-slate-600">{status}</span>
    </div>
  );
};
