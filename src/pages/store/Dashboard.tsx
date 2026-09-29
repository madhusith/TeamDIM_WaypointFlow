import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Link } from 'react-router-dom';
import { Package, Truck, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export const StoreDashboard: React.FC = () => {
  const { orders } = useAppStore();
  
  // For demo, assume current store is OUT-021
  const myOutletId = 'OUT-021';
  
  const myOrders = orders.filter(o => o.outletId === myOutletId);
  const openOrders = myOrders.filter(o => o.status === 'Confirmed' || o.status === 'Planned' || o.status === 'Deferred');
  const inDelivery = myOrders.filter(o => o.status === 'En Route');
  const deliveredToday = myOrders.filter(o => o.status === 'Delivered');

  return (
    <div className="max-w-6xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning</h1>
          <p className="text-slate-500">Waypoint Fresh • {myOutletId}</p>
        </div>
        <Link to="/store/orders/new" className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2">
          <Package size={18} /> Create New Order
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard title="Open Orders" value={openOrders.length} icon={Package} color="primary" />
        <KPICard title="In Delivery" value={inDelivery.length} icon={Truck} color="info" />
        <KPICard title="Delivered Today" value={deliveredToday.length} icon={CheckCircle2} color="success" />
        <KPICard title="Issues" value={0} icon={AlertCircle} color="danger" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-semibold text-slate-800">Recent Orders</h2>
          <Link to="/store/orders" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</Link>
        </div>
        
        <div className="divide-y divide-slate-100">
          {myOrders.length > 0 ? myOrders.map(order => (
            <div key={order.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-lg text-slate-900">{order.id}</span>
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                    order.status === 'Confirmed' ? "bg-info/10 text-info" :
                    order.status === 'Planned' ? "bg-primary-100 text-primary-700" :
                    order.status === 'En Route' ? "bg-warning/10 text-warning" :
                    order.status === 'Delivered' ? "bg-success/10 text-success" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {order.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-4">
                  <span>Delivery: <strong className="text-slate-700">{order.deliveryDate}</strong></span>
                  <span>Items: <strong className="text-slate-700">{order.items.reduce((acc, item) => acc + item.quantity, 0)}</strong></span>
                </div>
              </div>
              
              <div className="flex flex-col sm:items-end">
                {order.status === 'En Route' && (
                  <div className="text-sm font-bold text-primary-600 mb-2">ETA: 06:25 AM</div>
                )}
                {order.status === 'Delivered' ? (
                  <button className="px-4 py-2 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors">
                    Confirm Receipt
                  </button>
                ) : (
                  <button className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1">
                    Track Order <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-500">
              No recent orders.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color = 'primary' }: any) => {
  const colorMap = {
    primary: "text-primary-600 bg-primary-50 border-primary-100",
    success: "text-success bg-success/10 border-success/20",
    info: "text-info bg-info/10 border-info/20",
    danger: "text-danger bg-danger/10 border-danger/20",
  };

  return (
    <div className={clsx("rounded-xl p-5 border flex flex-col justify-between h-full", colorMap[color as keyof typeof colorMap])}>
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-semibold opacity-80 uppercase tracking-wide">{title}</div>
        <Icon size={20} className="opacity-70" />
      </div>
      <div className="text-4xl font-black">{value}</div>
    </div>
  );
};
