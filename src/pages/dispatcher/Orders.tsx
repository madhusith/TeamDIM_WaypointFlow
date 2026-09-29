import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Search, Filter } from 'lucide-react';
import clsx from 'clsx';
import { Order } from '../../types/logistics';
import { Link } from 'react-router-dom';

export const DispatcherOrders: React.FC = () => {
  const { orders } = useAppStore();
  const [search, setSearch] = useState('');
  
  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.outletId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">Manage and track all outbound orders.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Outlet</th>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4 text-right">Weight</th>
                <th className="px-6 py-4 text-right">Volume</th>
                <th className="px-6 py-4">Temp</th>
                <th className="px-6 py-4">Window</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.outletId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.brand}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{order.totalWeight} kg</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">{order.totalVolume} m³</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.temperatureRequirement === 'ambient' ? 'Ambient' : 'Chilled'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{order.deliveryWindow.start} - {order.deliveryWindow.end}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      order.status === 'Confirmed' ? "bg-info/10 text-info" :
                      order.status === 'Planned' ? "bg-primary-100 text-primary-700" :
                      order.status === 'Delivered' ? "bg-success/10 text-success" :
                      order.status === 'Deferred' ? "bg-danger/10 text-danger" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {order.status === 'Confirmed' || order.status === 'Deferred' ? (
                      <Link to="/dispatcher/planning" className="text-primary-600 hover:text-primary-800">Plan</Link>
                    ) : (
                      <span className="text-slate-400">View</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No orders found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
