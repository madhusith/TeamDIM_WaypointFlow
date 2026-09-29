import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Truck, Route as RouteIcon, MapPin, Package, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import { Order, Vehicle } from '../../types/logistics';

export const DeliveryPlanning: React.FC = () => {
  const { orders, trips, vehicles, assignVehicle, publishTrip } = useAppStore();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState<string | null>(null); // tripId
  
  const unassignedOrders = orders.filter(o => o.status === 'Confirmed' || o.status === 'Deferred');
  const todayTrips = trips; // Assuming all mock trips are today for demo

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="px-4 sm:px-6 lg:px-8 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Delivery Planning</h1>
        <p className="text-slate-500">Drag or assign unassigned orders to vehicles.</p>
      </div>
      
      <div className="flex-1 flex overflow-hidden border-t border-slate-200">
        
        {/* Left Column: Unassigned Orders */}
        <div className="w-1/3 min-w-[320px] max-w-sm flex flex-col bg-slate-50 border-r border-slate-200">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-semibold text-slate-800">Unassigned Orders</h2>
            <div className="text-sm text-slate-500">{unassignedOrders.length} orders waiting</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {unassignedOrders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-900">{order.id}</div>
                    <div className="text-xs text-slate-500">{order.brand} • {order.outletId}</div>
                  </div>
                  <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", order.status === 'Deferred' ? 'bg-danger/10 text-danger' : 'bg-slate-100 text-slate-600')}>
                    {order.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1"><Package size={14}/> {order.totalWeight}kg / {order.totalVolume}m³</div>
                  <div className="flex items-center gap-1"><AlertCircle size={14}/> {order.temperatureRequirement}</div>
                  <div className="col-span-2 flex items-center gap-1"><Clock size={14}/> {order.deliveryWindow.start} - {order.deliveryWindow.end}</div>
                </div>
                
                <button 
                  onClick={() => { setSelectedOrder(order); setShowAssignModal(true); }}
                  className="w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Assign Vehicle
                </button>
              </div>
            ))}
            {unassignedOrders.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                No unassigned orders right now.
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Today's Trips */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <div>
              <h2 className="font-semibold text-slate-800">Today's Trips</h2>
              <div className="text-sm text-slate-500">{todayTrips.length} active trips</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-start content-start bg-slate-50/50">
            {todayTrips.map(trip => {
              const vehicle = vehicles.find(v => v.id === trip.vehicleId);
              return (
                <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
                    <div>
                      <div className="font-bold text-lg text-slate-900">{trip.id}</div>
                      <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                        <Truck size={16}/> {vehicle?.id} • {vehicle?.temperature === 'reefer' ? 'Refrigerated' : 'Ambient'} {vehicle?.type}
                      </div>
                    </div>
                    <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-full", trip.published ? "bg-info/10 text-info" : "bg-warning/10 text-warning")}>
                      {trip.status}
                    </span>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex justify-between text-sm mb-4">
                      <div className="text-slate-500">Departure: <span className="text-slate-900 font-medium">{trip.departureTime}</span></div>
                      <div className="text-slate-500">Depot: <span className="text-slate-900 font-medium">{trip.depot}</span></div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                        <span>Weight Capacity</span>
                        <span>{trip.totalWeight} / {vehicle?.weightCapacity} kg</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={clsx("h-full rounded-full", (trip.totalWeight / (vehicle?.weightCapacity || 1)) > 0.9 ? 'bg-danger' : 'bg-primary-500')} 
                          style={{ width: `${Math.min(100, (trip.totalWeight / (vehicle?.weightCapacity || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="text-xs font-semibold text-slate-500 uppercase">Stop Sequence</div>
                      {trip.stops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                          <div className="flex-1 truncate">{stop.outletId}</div>
                          <div className="text-xs text-slate-400">{stop.orderIds.length} orders</div>
                        </div>
                      ))}
                    </div>
                    
                    {!trip.published && (
                      <button 
                        onClick={() => setShowPublishModal(trip.id)}
                        className="w-full py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Publish Trip
                      </button>
                    )}
                    {trip.published && (
                      <button disabled className="w-full py-2.5 bg-slate-100 text-slate-400 text-sm font-medium rounded-lg">
                        Trip Published
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assign Vehicle Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">Assign Vehicle</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X size={20}/></button>
            </div>
            
            <div className="flex flex-col md:flex-row overflow-hidden flex-1">
              {/* Requirements */}
              <div className="w-full md:w-1/3 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-200 shrink-0">
                <div className="text-sm font-bold text-slate-900 mb-1">Order {selectedOrder.id}</div>
                <div className="text-xs text-slate-500 mb-4">{selectedOrder.outletId}</div>
                
                <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2">Requirements</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-slate-400"/> {selectedOrder.temperatureRequirement === 'ambient' ? 'Ambient' : 'Refrigerated'}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-slate-400"/> ≥ {selectedOrder.totalWeight} kg</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-slate-400"/> ≥ {selectedOrder.totalVolume} m³</li>
                </ul>
              </div>
              
              {/* Vehicles */}
              <div className="flex-1 p-4 overflow-y-auto bg-white">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Recommended Vehicles</h3>
                <div className="space-y-3">
                  {vehicles.map(v => {
                    const isTempMatch = selectedOrder.temperatureRequirement === 'ambient' || v.temperature === 'reefer';
                    const isWeightMatch = v.weightCapacity >= selectedOrder.totalWeight;
                    const isSuitable = isTempMatch && isWeightMatch;
                    
                    return (
                      <div key={v.id} className={clsx(
                        "p-3 rounded-lg border flex justify-between items-center transition-colors",
                        isSuitable ? "border-slate-200 hover:border-primary-300 bg-white" : "border-slate-100 bg-slate-50 opacity-70"
                      )}>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{v.id}</div>
                          <div className="text-xs text-slate-500">{v.temperature === 'reefer' ? 'Refrigerated' : 'Ambient'} {v.type} • {v.depot}</div>
                          
                          <div className="mt-2 text-xs flex flex-col gap-1">
                            {isSuitable ? (
                              <span className="text-success flex items-center gap-1"><CheckCircle2 size={12}/> Suitable</span>
                            ) : (
                              <>
                                {!isTempMatch && <span className="text-danger flex items-center gap-1"><XCircle size={12}/> No refrigeration</span>}
                                {!isWeightMatch && <span className="text-danger flex items-center gap-1"><XCircle size={12}/> Capacity exceeded</span>}
                              </>
                            )}
                          </div>
                        </div>
                        
                        {isSuitable && (
                          <button 
                            onClick={() => {
                              assignVehicle(selectedOrder.id, v.id);
                              setShowAssignModal(false);
                            }}
                            className="px-3 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded hover:bg-primary-100"
                          >
                            Select
                          </button>
                        )}
                        {!isSuitable && (
                          <button disabled className="px-3 py-1.5 bg-slate-200 text-slate-400 text-sm font-medium rounded cursor-not-allowed">
                            Invalid
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Trip Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
             <div className="w-12 h-12 rounded-full bg-info/10 text-info flex items-center justify-center mx-auto mb-4">
               <RouteIcon size={24}/>
             </div>
             <h2 className="text-xl font-bold mb-2">Publish Trip {showPublishModal}?</h2>
             <p className="text-sm text-slate-500 mb-6 text-left bg-slate-50 p-4 rounded-lg">
               This will notify:
               <br/><br/>
               <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success"/> Loader</span>
               <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-success"/> Driver</span>
             </p>
             <div className="flex gap-3">
               <button onClick={() => setShowPublishModal(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200">Cancel</button>
               <button 
                  onClick={() => {
                    publishTrip(showPublishModal);
                    setShowPublishModal(null);
                  }} 
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  Publish Trip
                </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};
