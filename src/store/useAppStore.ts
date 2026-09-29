import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, Trip, Vehicle, Outlet, Exception, Role, Product } from '../types/logistics';
import { mockOrders, mockTrips, mockVehicles, mockOutlets, mockExceptions, mockProducts } from '../data/mockData';

type AppState = {
  // Global State
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  
  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  
  // Data
  orders: Order[];
  trips: Trip[];
  vehicles: Vehicle[];
  outlets: Outlet[];
  exceptions: Exception[];
  products: Product[];
  
  // Actions - Dispatcher
  assignVehicle: (orderId: string, vehicleId: string, tripId?: string) => void;
  publishTrip: (tripId: string) => void;
  
  // Actions - Loader
  startLoading: (tripId: string) => void;
  completeLoading: (tripId: string) => void;
  reportShortage: (outletId: string, expected: number, actual: number, reason: string) => void;
  
  // Actions - Driver
  arriveAtStop: (tripId: string, stopIndex: number) => void;
  completeDelivery: (tripId: string, stopIndex: number, receiverName: string, notes?: string) => void;
  
  // Actions - Store
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => void;
  confirmReceipt: (orderId: string) => void;
  
  // Offline Queue
  offlineQueue: any[];
  syncOfflineQueue: () => void;
  
  // Demo
  resetDemo: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentRole: 'Dispatcher',
      setCurrentRole: (role) => set({ currentRole: role }),
      
      isOffline: false,
      setOffline: (offline) => {
        set({ isOffline: offline });
        if (!offline) {
          get().syncOfflineQueue();
        }
      },
      
      orders: [...mockOrders],
      trips: [...mockTrips],
      vehicles: [...mockVehicles],
      outlets: [...mockOutlets],
      exceptions: [...mockExceptions],
      products: [...mockProducts],
      
      offlineQueue: [],
      
      // Implement Actions
      assignVehicle: (orderId, vehicleId, tripId) => set((state) => {
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return state;
        
        let newTrips = [...state.trips];
        let targetTripId = tripId;
        
        if (!targetTripId) {
          // create a new trip
          const newTrip: Trip = {
            id: `TRIP-0${Math.floor(Math.random() * 100) + 20}`,
            vehicleId,
            driverName: 'Assigned Driver',
            depot: 'Peliyagoda',
            departureTime: order.deliveryWindow.start,
            status: 'In Planning',
            published: false,
            stops: [
              { outletId: order.outletId, orderIds: [orderId], status: 'Pending' }
            ],
            totalWeight: order.totalWeight,
            totalVolume: order.totalVolume
          };
          newTrips.push(newTrip);
          targetTripId = newTrip.id;
        } else {
          // add to existing trip (simplified for demo)
          newTrips = newTrips.map(t => {
            if (t.id === targetTripId) {
              const stop = t.stops.find(s => s.outletId === order.outletId);
              let newStops = [...t.stops];
              if (stop) {
                newStops = newStops.map(s => s.outletId === order.outletId ? { ...s, orderIds: [...s.orderIds, orderId] } : s);
              } else {
                newStops.push({ outletId: order.outletId, orderIds: [orderId], status: 'Pending' });
              }
              return { ...t, stops: newStops, totalWeight: t.totalWeight + order.totalWeight, totalVolume: t.totalVolume + order.totalVolume };
            }
            return t;
          });
        }
        
        return {
          orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'Planned', tripId: targetTripId } : o),
          trips: newTrips
        };
      }),
      
      publishTrip: (tripId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'Ready for Loading', published: true } : t)
      })),
      
      startLoading: (tripId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'Loading' } : t),
        vehicles: state.vehicles.map(v => v.id === state.trips.find(tr => tr.id === tripId)?.vehicleId ? { ...v, status: 'loading' } : v)
      })),
      
      completeLoading: (tripId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, status: 'Loaded' } : t)
      })),
      
      reportShortage: (outletId, expected, actual, reason) => set((state) => ({
        exceptions: [
          {
            id: `EXC-00${state.exceptions.length + 1}`,
            type: 'Stock unavailable',
            referenceId: outletId,
            message: `Shortage: Expected ${expected}, got ${actual}. Reason: ${reason}`,
            createdAt: new Date().toISOString(),
            status: 'Open'
          },
          ...state.exceptions
        ]
      })),
      
      arriveAtStop: (tripId, stopIndex) => set((state) => {
        if (state.isOffline) {
          return {
            offlineQueue: [...state.offlineQueue, { type: 'ARRIVE', payload: { tripId, stopIndex } }]
          };
        }
        
        return {
          trips: state.trips.map(t => {
            if (t.id === tripId) {
              const newStops = [...t.stops];
              newStops[stopIndex] = { ...newStops[stopIndex], status: 'Arrived' };
              return { ...t, stops: newStops, status: 'En Route' };
            }
            return t;
          })
        };
      }),
      
      completeDelivery: (tripId, stopIndex, receiverName, notes) => set((state) => {
        const action = () => {
          let updatedOrderIds: string[] = [];
          const updatedTrips = state.trips.map(t => {
            if (t.id === tripId) {
              const newStops = [...t.stops];
              newStops[stopIndex] = { ...newStops[stopIndex], status: 'Delivered', completedAt: new Date().toISOString() };
              updatedOrderIds = newStops[stopIndex].orderIds;
              return { ...t, stops: newStops };
            }
            return t;
          });
          
          return {
            trips: updatedTrips,
            orders: state.orders.map(o => updatedOrderIds.includes(o.id) ? { ...o, status: 'Delivered' as const } : o)
          };
        };

        if (state.isOffline) {
          return {
            offlineQueue: [...state.offlineQueue, { type: 'DELIVER', payload: { tripId, stopIndex, receiverName, notes } }]
          };
        }
        
        return action();
      }),
      
      createOrder: (order) => set((state) => ({
        orders: [
          {
            ...order,
            id: `ORD-200${Math.floor(Math.random() * 99) + 10}`,
            createdAt: new Date().toISOString(),
            status: 'Confirmed'
          },
          ...state.orders
        ]
      })),
      
      confirmReceipt: (orderId) => set((state) => ({
        // Just for demo, you could add another field to order like 'receiptConfirmed'
      })),
      
      syncOfflineQueue: () => set((state) => {
        let newState = { ...state };
        for (const action of state.offlineQueue) {
          if (action.type === 'ARRIVE') {
             newState.trips = newState.trips.map(t => {
              if (t.id === action.payload.tripId) {
                const newStops = [...t.stops];
                newStops[action.payload.stopIndex] = { ...newStops[action.payload.stopIndex], status: 'Arrived' };
                return { ...t, stops: newStops, status: 'En Route' };
              }
              return t;
            });
          } else if (action.type === 'DELIVER') {
            let updatedOrderIds: string[] = [];
            newState.trips = newState.trips.map(t => {
              if (t.id === action.payload.tripId) {
                const newStops = [...t.stops];
                newStops[action.payload.stopIndex] = { ...newStops[action.payload.stopIndex], status: 'Delivered', completedAt: new Date().toISOString() };
                updatedOrderIds = newStops[action.payload.stopIndex].orderIds;
                return { ...t, stops: newStops };
              }
              return t;
            });
            newState.orders = newState.orders.map(o => updatedOrderIds.includes(o.id) ? { ...o, status: 'Delivered' as const } : o);
          }
        }
        
        return {
          ...newState,
          offlineQueue: []
        };
      }),
      
      resetDemo: () => set({
        orders: [...mockOrders],
        trips: [...mockTrips],
        vehicles: [...mockVehicles],
        outlets: [...mockOutlets],
        exceptions: [...mockExceptions],
        products: [...mockProducts],
        offlineQueue: [],
        isOffline: false
      })
    }),
    {
      name: 'waypoint-flow-storage',
    }
  )
);
