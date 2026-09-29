import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MapPin, Navigation, PackageCheck, AlertCircle, Camera, PenTool, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export const DriverHome: React.FC = () => {
  const { trips, arriveAtStop, completeDelivery, isOffline } = useAppStore();
  
  // Find driver's active trip (for demo, find the one En Route or Loaded)
  const activeTrip = trips.find(t => t.status === 'Loaded' || t.status === 'En Route' || (t.status === 'Completed' && false)) || trips[0];
  
  const [view, setView] = useState<'ROUTE' | 'ARRIVE' | 'POD' | 'SUCCESS'>('ROUTE');
  const [currentStopIdx, setCurrentStopIdx] = useState<number>(0);
  const [receiverName, setReceiverName] = useState('');
  
  if (!activeTrip) {
    return <div className="p-6 text-center text-slate-500">No active trips assigned today.</div>;
  }

  // Find next pending stop
  const pendingStopIndex = activeTrip.stops.findIndex(s => s.status === 'Pending' || s.status === 'Next Stop' || s.status === 'Arrived');
  const displayStopIdx = currentStopIdx !== null ? currentStopIdx : (pendingStopIndex >= 0 ? pendingStopIndex : activeTrip.stops.length - 1);
  const currentStop = activeTrip.stops[displayStopIdx];
  
  const handleArrive = () => {
    arriveAtStop(activeTrip.id, displayStopIdx);
    setView('ARRIVE');
  };
  
  const handleBeginDelivery = () => {
    setView('POD');
  };

  const handleComplete = () => {
    completeDelivery(activeTrip.id, displayStopIdx, receiverName || 'Store Manager');
    setView('SUCCESS');
  };

  const handleNextStop = () => {
    setView('ROUTE');
    setCurrentStopIdx(displayStopIdx + 1);
    setReceiverName('');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      
      {view === 'ROUTE' && (
        <div className="p-4 flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Good Morning, Kasun</h1>
            <div className="bg-slate-100 px-3 py-2 rounded-lg inline-flex items-center gap-2">
              <span className="font-bold text-primary-700">{activeTrip.id}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-medium">{activeTrip.stops.length} Stops</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Today's Route</h2>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-200">
              {activeTrip.stops.map((stop, idx) => {
                const isCompleted = stop.status === 'Delivered';
                const isNext = idx === pendingStopIndex;
                const isFuture = idx > pendingStopIndex;
                
                return (
                  <div key={idx} className={clsx("relative", isFuture ? "opacity-50" : "")}>
                    <div className={clsx(
                      "absolute -left-8 w-4 h-4 rounded-full border-2 bg-white",
                      isCompleted ? "border-success bg-success" : isNext ? "border-primary-600 border-4" : "border-slate-300"
                    )} />
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-slate-400 mb-0.5">{idx + 1}</div>
                        <div className={clsx("font-bold text-lg mb-0.5", isCompleted ? "text-slate-400 line-through" : "text-slate-900")}>
                          {stop.outletId}
                        </div>
                        {isNext && (
                          <div className="text-sm font-medium text-primary-600 flex items-center gap-1">
                            Next Stop • ETA 06:25
                          </div>
                        )}
                        {isCompleted && <div className="text-sm font-medium text-success">Delivered</div>}
                        {isFuture && <div className="text-sm text-slate-500">Pending</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pendingStopIndex >= 0 && (
            <div className="fixed bottom-16 md:bottom-6 left-0 right-0 p-4 md:static md:p-0 md:mt-auto">
              <div className="md:max-w-md mx-auto">
                <button 
                  onClick={() => { setCurrentStopIdx(pendingStopIndex); setView('ARRIVE'); }}
                  className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary-700 transition-transform active:scale-[0.98] flex justify-center items-center gap-2 text-lg"
                >
                  <Navigation size={24} /> Continue Route
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'ARRIVE' && (
        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stop {displayStopIdx + 1} of {activeTrip.stops.length}</span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Waypoint Fresh</h1>
            <h2 className="text-xl font-bold text-slate-500 mb-8">{currentStop?.outletId}</h2>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-slate-500 font-medium">Delivery Window</div>
                <div className="text-slate-900 font-bold">06:00–07:30</div>
              </div>
              <div className="flex justify-between items-center mb-6">
                <div className="text-slate-500 font-medium">Expected Arrival</div>
                <div className="text-slate-900 font-bold">06:25</div>
              </div>
              
              <div className="border-t border-slate-200 pt-4">
                <div className="text-slate-500 font-medium mb-2">Items Expected</div>
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <PackageCheck size={24} className="text-primary-600"/> 20 Crates, 10 Boxes
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-6 pb-20 md:pb-6">
            <button 
              onClick={() => { arriveAtStop(activeTrip.id, displayStopIdx); handleBeginDelivery(); }}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-transform active:scale-[0.98] text-lg flex justify-center items-center gap-2"
            >
              <MapPin size={24} /> I have arrived
            </button>
            <button className="w-full bg-white text-danger border-2 border-danger/20 font-bold py-4 rounded-xl flex justify-center items-center gap-2">
              <AlertCircle size={24} /> Report Problem
            </button>
          </div>
        </div>
      )}

      {view === 'POD' && (
        <div className="p-4 flex-1 flex flex-col bg-slate-50">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Complete Delivery</h1>
            <p className="text-slate-500">{currentStop?.outletId}</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <CheckCircle2 size={24} className="text-success" />
                <span className="font-bold text-lg text-slate-900">Items delivered</span>
              </div>
              <p className="text-sm text-slate-500 ml-9">All items unloaded successfully.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Receiver Name</label>
                <input 
                  type="text" 
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Nimal Perera"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-medium text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Notes (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Any damages or issues..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                <Camera size={32} />
                <span className="font-bold text-sm">Take Photo</span>
              </button>
              <button className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                <PenTool size={32} />
                <span className="font-bold text-sm">Signature</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pb-20 md:pb-6">
            <button 
              onClick={handleComplete}
              className={clsx(
                "w-full font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] text-lg",
                isOffline ? "bg-warning text-white" : "bg-primary-600 text-white"
              )}
            >
              {isOffline ? 'Save Offline' : 'Complete Delivery'}
            </button>
            {isOffline && (
              <p className="text-center text-xs text-warning-700 font-medium mt-3 px-4">
                This update will sync automatically when connection returns.
              </p>
            )}
          </div>
        </div>
      )}

      {view === 'SUCCESS' && (
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} className="text-success" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2">Delivery Completed</h1>
          <p className="text-xl font-bold text-slate-500 mb-8">{currentStop?.outletId}</p>
          
          <div className="bg-slate-50 rounded-2xl p-6 w-full max-w-sm mb-8 text-left">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Receiver</span>
              <span className="font-bold text-slate-900">{receiverName || 'Nimal Perera'}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">Time</span>
              <span className="font-bold text-slate-900">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Proof</span>
              <span className="font-bold text-success flex items-center gap-1"><CheckCircle2 size={16}/> Captured</span>
            </div>
          </div>

          {isOffline && (
             <div className="w-full max-w-sm bg-warning/10 border border-warning/20 rounded-xl p-4 mb-8 text-left flex items-start gap-3">
               <AlertCircle className="text-warning shrink-0" size={24}/>
               <div>
                 <div className="font-bold text-warning-800">Saved Offline</div>
                 <div className="text-sm text-warning-700">Delivery recorded on this device. Waiting for connection...</div>
               </div>
             </div>
          )}

          <div className="w-full max-w-sm mt-auto pb-20 md:pb-6">
            <button 
              onClick={handleNextStop}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-transform active:scale-[0.98] text-lg"
            >
              Next Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
