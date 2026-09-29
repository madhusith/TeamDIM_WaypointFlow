import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Check, ArrowLeft, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import { OrderItem } from '../../types/logistics';

export const LoadingScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips, vehicles, orders, products, startLoading, completeLoading, reportShortage } = useAppStore();
  
  const trip = trips.find(t => t.id === id);
  const vehicle = vehicles.find(v => v.id === trip?.vehicleId);
  
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showShortageModal, setShowShortageModal] = useState<any>(null);
  const [shortageReason, setShortageReason] = useState('Stock unavailable');
  const [shortageActual, setShortageActual] = useState(0);
  const [shortageNotes, setShortageNotes] = useState('');

  useEffect(() => {
    if (trip && trip.status === 'Ready for Loading') {
      startLoading(trip.id);
    }
  }, [trip, startLoading]);

  if (!trip) return <div>Trip not found</div>;

  const getProduct = (productId: string) => products.find(p => p.id === productId);

  const toggleItem = (stopIndex: number, orderId: string, productId: string) => {
    const key = `${stopIndex}-${orderId}-${productId}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllChecked = () => {
    for (let i = 0; i < trip.stops.length; i++) {
      const stop = trip.stops[i];
      for (const orderId of stop.orderIds) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          for (const item of order.items) {
            if (!checkedItems[`${i}-${orderId}-${item.productId}`]) return false;
          }
        }
      }
    }
    return true;
  };

  const handleComplete = () => {
    completeLoading(trip.id);
    navigate('/loader');
  };

  const submitShortage = () => {
    if (showShortageModal) {
      reportShortage(
        showShortageModal.outletId, 
        showShortageModal.expected, 
        shortageActual, 
        `${shortageReason}: ${shortageNotes}`
      );
      // Mark it checked so they can proceed anyway
      setCheckedItems(prev => ({ ...prev, [showShortageModal.key]: true }));
      setShowShortageModal(null);
    }
  };

  let totalItems = 0;
  let totalChecked = Object.values(checkedItems).filter(Boolean).length;
  
  // Calculate total items
  trip.stops.forEach(stop => {
    stop.orderIds.forEach(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (order) totalItems += order.items.length;
    });
  });

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/loader" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{trip.id}</h1>
          <p className="text-sm text-slate-500">{vehicle?.id} • Loading Checklist</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="font-semibold text-sm">Progress</span>
          <span className="text-sm font-medium">{totalChecked} / {totalItems} Items loaded</span>
        </div>
        <div className="h-2 bg-slate-100">
          <div 
            className="h-full bg-primary-500 transition-all duration-300" 
            style={{ width: `${(totalChecked / Math.max(1, totalItems)) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {trip.stops.map((stop, stopIndex) => {
          const stopOrders = stop.orderIds.map(id => orders.find(o => o.id === id)).filter(Boolean) as any[];
          if (stopOrders.length === 0) return null;

          return (
            <div key={stopIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center">
                    {stopIndex + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{stop.outletId}</h3>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {stopOrders.map(order => (
                  <div key={order.id} className="p-0">
                    {order.items.map((item: OrderItem) => {
                      const product = getProduct(item.productId);
                      const key = `${stopIndex}-${order.id}-${item.productId}`;
                      const isChecked = checkedItems[key];
                      
                      return (
                        <div key={key} className={clsx("flex items-center justify-between p-4 transition-colors", isChecked ? "bg-primary-50/50" : "")}>
                          <div className="flex-1 flex items-center gap-4 cursor-pointer" onClick={() => toggleItem(stopIndex, order.id, item.productId)}>
                            <div className={clsx(
                              "w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isChecked ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300 bg-white text-transparent"
                            )}>
                              <Check size={16} />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{product?.name || item.productId}</div>
                              <div className="text-xs text-slate-500">Order {order.id}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{item.quantity}</div>
                              <div className="text-xs text-slate-500">expected</div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowShortageModal({ key, outletId: stop.outletId, expected: item.quantity, itemName: product?.name }); }}
                              className="p-2 text-slate-400 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                              title="Report Shortage"
                            >
                              <AlertTriangle size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 md:left-64 flex justify-center shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <button
          onClick={handleComplete}
          disabled={!isAllChecked()}
          className={clsx(
            "w-full max-w-md py-3.5 rounded-lg font-bold text-white shadow-sm transition-all",
            isAllChecked() ? "bg-primary-600 hover:bg-primary-700" : "bg-slate-300 cursor-not-allowed"
          )}
        >
          Complete Loading
        </button>
      </div>

      {/* Shortage Modal */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-danger/5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-danger"/> Item Shortage</h2>
              <button onClick={() => setShowShortageModal(null)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-900">{showShortageModal.itemName}</div>
                <div className="text-xs text-slate-500">{showShortageModal.outletId}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 mb-1">Expected</div>
                  <div className="font-bold text-lg">{showShortageModal.expected}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Available</label>
                  <input 
                    type="number" 
                    value={shortageActual}
                    onChange={(e) => setShortageActual(Number(e.target.value))}
                    min="0"
                    max={showShortageModal.expected}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-lg font-bold" 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Reason</label>
                <select 
                  value={shortageReason}
                  onChange={(e) => setShortageReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option>Stock unavailable</option>
                  <option>Damaged</option>
                  <option>Picking error</option>
                  <option>Other</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Notes</label>
                <textarea 
                  value={shortageNotes}
                  onChange={(e) => setShortageNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20"
                  placeholder="Optional details..."
                />
              </div>
              
              <button 
                onClick={submitShortage}
                className="w-full py-2.5 bg-danger text-white rounded-lg font-medium hover:bg-danger/90"
              >
                Report Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
