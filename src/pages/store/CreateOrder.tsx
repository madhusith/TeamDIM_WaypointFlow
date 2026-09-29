import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Info, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { Product } from '../../types/logistics';

export const CreateOrder: React.FC = () => {
  const { products, createOrder } = useAppStore();
  const navigate = useNavigate();
  
  // Hardcoded for demo
  const outletId = 'OUT-021';
  const brand = 'Fresh';
  
  const [date, setDate] = useState('2026-09-30');
  const [windowStart, setWindowStart] = useState('05:30');
  const [windowEnd, setWindowEnd] = useState('07:30');
  
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const availableProducts = products.filter(p => p.brand === brand);
  
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };
  
  let totalWeight = 0;
  let totalVolume = 0;
  let requiresReefer = false;
  
  Object.entries(cart).forEach(([id, qty]) => {
    const p = products.find(prod => prod.id === id);
    if (p) {
      totalWeight += p.weight * qty;
      totalVolume += p.volume * qty;
      if (p.temperatureRequirement !== 'ambient') {
        requiresReefer = true;
      }
    }
  });

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const orderItems = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
      
      createOrder({
        outletId,
        brand,
        deliveryDate: date,
        deliveryWindow: { start: windowStart, end: windowEnd },
        items: orderItems,
        totalWeight,
        totalVolume,
        temperatureRequirement: requiresReefer ? 'chilled' : 'ambient'
      });
      
      setIsSubmitting(false);
      setShowSuccess(true);
    }, 800);
  };
  
  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-success" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Order Submitted</h1>
        <p className="text-slate-500 mb-8">Your order has been confirmed and sent to dispatch.</p>
        
        <div className="bg-slate-50 rounded-2xl p-6 w-full max-w-md mb-8 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-medium">Delivery</span>
            <span className="font-bold text-slate-900">{date}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-medium">Window</span>
            <span className="font-bold text-slate-900">{windowStart} – {windowEnd}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Status</span>
            <span className="font-bold text-info bg-info/10 px-3 py-1 rounded-full text-sm">Confirmed</span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/store')}
          className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/store" className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Order</h1>
          <p className="text-slate-500">Select delivery details and products.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Delivery Schedule</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Date</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Time Window</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                  <span className="text-slate-400">to</span>
                  <input 
                    type="time" 
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" 
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
              <Info size={18} className="text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning-800">Next-day orders must be submitted before the daily cutoff at 18:00.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Products</h2>
            <div className="space-y-4">
              {availableProducts.map(product => {
                const qty = cart[product.id] || 0;
                return (
                  <div key={product.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                    <div>
                      <div className="font-bold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">
                        {product.weight}kg • {product.temperatureRequirement === 'ambient' ? 'Ambient' : 'Chilled'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => updateQuantity(product.id, -1)}
                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-900 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold text-lg">{qty}</span>
                      <button 
                        onClick={() => updateQuantity(product.id, 1)}
                        className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        <div>
          <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 text-white sticky top-24">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold">Order Summary</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Items</span>
                <span className="font-bold text-lg">{Object.values(cart).reduce((a, b) => a + b, 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Weight</span>
                <span className="font-bold">{totalWeight.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Volume</span>
                <span className="font-bold">{totalVolume.toFixed(2)} m³</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Temperature</span>
                <span className={clsx("font-bold px-2 py-0.5 rounded text-xs", requiresReefer ? "bg-info/20 text-info-300" : "bg-slate-800 text-slate-300")}>
                  {requiresReefer ? 'Chilled Required' : 'Ambient'}
                </span>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-800">
              <button 
                onClick={handleSubmit}
                disabled={Object.keys(cart).length === 0 || isSubmitting}
                className={clsx(
                  "w-full py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center",
                  Object.keys(cart).length > 0 && !isSubmitting
                    ? "bg-primary-500 hover:bg-primary-400 text-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
