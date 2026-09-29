export type Role = 'Dispatcher' | 'Loader' | 'Driver' | 'Store Manager';

export type Outlet = {
  id: string;
  name: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  district: string;
  depot: 'Peliyagoda' | 'Kandy';
  accessType: 'rear_dock' | 'street' | 'mall_bay';
  parkingConstraint?: 'van_only';
  deliveryWindow: {
    start: string;
    end: string;
  };
};

export type Vehicle = {
  id: string;
  type: 'truck' | 'van';
  temperature: 'reefer' | 'ambient';
  weightCapacity: number; // kg
  volumeCapacity: number; // m3
  depot: 'Peliyagoda' | 'Kandy';
  status: 'available' | 'loading' | 'on_trip' | 'maintenance' | 'offline';
  fuelRemaining: number;
};

export type Product = {
  id: string;
  name: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  category: string;
  weight: number; // kg
  volume: number; // m3
  temperatureRequirement: 'ambient' | 'chilled' | 'frozen';
};

export type OrderItem = {
  productId: string;
  quantity: number;
};

export type OrderStatus = 'Pending' | 'Confirmed' | 'In Planning' | 'Planned' | 'Deferred' | 'Delivered' | 'En Route';

export type Order = {
  id: string;
  outletId: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  status: OrderStatus;
  deliveryDate: string; // ISO date
  deliveryWindow: {
    start: string;
    end: string;
  };
  items: OrderItem[];
  totalWeight: number;
  totalVolume: number;
  temperatureRequirement: 'ambient' | 'chilled' | 'frozen';
  createdAt: string;
  exceptionReason?: string;
  tripId?: string;
};

export type TripStatus = 'In Planning' | 'Planned' | 'Loading' | 'Ready for Loading' | 'Loaded' | 'En Route' | 'Completed';

export type Stop = {
  outletId: string;
  orderIds: string[];
  status: 'Pending' | 'Next Stop' | 'Arrived' | 'Delivered' | 'Exception';
  eta?: string;
  completedAt?: string;
};

export type Trip = {
  id: string;
  vehicleId: string;
  driverName: string;
  depot: 'Peliyagoda' | 'Kandy';
  departureTime: string;
  status: TripStatus;
  stops: Stop[];
  totalWeight: number;
  totalVolume: number;
  published: boolean;
};

export type Exception = {
  id: string;
  type: 'Capacity exceeded' | 'Vehicle unavailable' | 'Outlet inaccessible' | 'Delivery window missed' | 'Stock unavailable' | 'Operational disruption';
  referenceId: string; // orderId or outletId
  message: string;
  createdAt: string;
  status: 'Open' | 'Resolved';
};
