import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAppStore } from './store/useAppStore';

// Dispatcher Pages
import { DispatcherDashboard } from './pages/dispatcher/Dashboard';
import { DeliveryPlanning } from './pages/dispatcher/DeliveryPlanning';
import { DispatcherOrders } from './pages/dispatcher/Orders';

// Loader Pages
import { LoaderDashboard } from './pages/loader/Dashboard';
import { LoadingScreen } from './pages/loader/LoadingScreen';

// Driver Pages
import { DriverHome } from './pages/driver/Home';

// Store Pages
import { StoreDashboard } from './pages/store/Dashboard';
import { CreateOrder } from './pages/store/CreateOrder';

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-slate-700">{title}</h2>
      <p className="text-slate-500 mt-2">Coming soon in next prototype iteration.</p>
    </div>
  </div>
);

const RoleRedirect = () => {
  const currentRole = useAppStore(state => state.currentRole);
  switch (currentRole) {
    case 'Dispatcher': return <Navigate to="/dispatcher" replace />;
    case 'Loader': return <Navigate to="/loader" replace />;
    case 'Driver': return <Navigate to="/driver" replace />;
    case 'Store Manager': return <Navigate to="/store" replace />;
    default: return <Navigate to="/dispatcher" replace />;
  }
};

function App() {
  const setOffline = useAppStore(state => state.setOffline);

  // Simulate network changes
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<RoleRedirect />} />
          
          {/* Dispatcher Routes */}
          <Route path="dispatcher" element={<DispatcherDashboard />} />
          <Route path="dispatcher/planning" element={<DeliveryPlanning />} />
          <Route path="dispatcher/orders" element={<DispatcherOrders />} />
          <Route path="dispatcher/live" element={<Placeholder title="Live Deliveries" />} />
          <Route path="dispatcher/exceptions" element={<Placeholder title="Exceptions" />} />
          <Route path="dispatcher/settings" element={<Placeholder title="Settings" />} />
          
          {/* Loader Routes */}
          <Route path="loader" element={<LoaderDashboard />} />
          <Route path="loader/trips" element={<LoaderDashboard />} />
          <Route path="loader/trip/:id" element={<LoadingScreen />} />
          
          {/* Driver Routes */}
          <Route path="driver" element={<DriverHome />} />
          <Route path="driver/profile" element={<Placeholder title="Driver Profile" />} />
          
          {/* Store Routes */}
          <Route path="store" element={<StoreDashboard />} />
          <Route path="store/orders" element={<Placeholder title="Order Tracking" />} />
          <Route path="store/orders/new" element={<CreateOrder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
