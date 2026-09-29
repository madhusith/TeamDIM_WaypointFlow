import { Outlet, Vehicle, Product, Order, Trip, Exception } from '../types/logistics';

export const mockOutlets: Outlet[] = [
  {
    id: 'OUT-021',
    name: 'Waypoint Fresh - Colombo',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'street',
    deliveryWindow: { start: '05:30', end: '07:30' }
  },
  {
    id: 'OUT-034',
    name: 'Waypoint Fresh - Nugegoda',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'mall_bay',
    deliveryWindow: { start: '06:00', end: '08:00' }
  },
  {
    id: 'OUT-041',
    name: 'Waypoint Style - Mount Lavinia',
    brand: 'Style',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'street',
    deliveryWindow: { start: '09:00', end: '12:00' }
  },
  {
    id: 'OUT-045',
    name: 'Waypoint Fresh - Dehiwala',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'street',
    deliveryWindow: { start: '06:30', end: '08:30' }
  },
  {
    id: 'OUT-052',
    name: 'Waypoint Fresh - Bambalapitiya',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'rear_dock',
    deliveryWindow: { start: '05:00', end: '07:00' }
  },
  {
    id: 'OUT-061',
    name: 'Waypoint Fresh - Kollupitiya',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'rear_dock',
    deliveryWindow: { start: '05:30', end: '08:00' }
  },
  {
    id: 'OUT-073',
    name: 'Waypoint Fresh - Fort',
    brand: 'Fresh',
    district: 'Colombo',
    depot: 'Peliyagoda',
    accessType: 'street',
    parkingConstraint: 'van_only',
    deliveryWindow: { start: '04:30', end: '06:30' }
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'VEH-014',
    type: 'van',
    temperature: 'reefer',
    weightCapacity: 1000,
    volumeCapacity: 6,
    depot: 'Peliyagoda',
    status: 'available',
    fuelRemaining: 85
  },
  {
    id: 'VEH-019',
    type: 'van',
    temperature: 'reefer',
    weightCapacity: 1000,
    volumeCapacity: 6,
    depot: 'Peliyagoda',
    status: 'available',
    fuelRemaining: 92
  },
  {
    id: 'VEH-024',
    type: 'van',
    temperature: 'ambient',
    weightCapacity: 1200,
    volumeCapacity: 7,
    depot: 'Peliyagoda',
    status: 'available',
    fuelRemaining: 60
  },
  {
    id: 'VEH-031',
    type: 'truck',
    temperature: 'reefer',
    weightCapacity: 5000,
    volumeCapacity: 22,
    depot: 'Kandy',
    status: 'available',
    fuelRemaining: 100
  },
  {
    id: 'VEH-042',
    type: 'truck',
    temperature: 'ambient',
    weightCapacity: 8000,
    volumeCapacity: 35,
    depot: 'Peliyagoda',
    status: 'on_trip',
    fuelRemaining: 40
  }
];

export const mockProducts: Product[] = [
  { id: 'PROD-001', name: 'Fresh Milk Crates', brand: 'Fresh', category: 'Dairy', weight: 15, volume: 0.1, temperatureRequirement: 'chilled' },
  { id: 'PROD-002', name: 'Frozen Food Boxes', brand: 'Fresh', category: 'Frozen', weight: 10, volume: 0.08, temperatureRequirement: 'frozen' },
  { id: 'PROD-003', name: 'Produce Crates', brand: 'Fresh', category: 'Produce', weight: 12, volume: 0.15, temperatureRequirement: 'ambient' },
  { id: 'PROD-004', name: 'Garment Boxes', brand: 'Style', category: 'Apparel', weight: 20, volume: 0.5, temperatureRequirement: 'ambient' },
  { id: 'PROD-005', name: 'Laptop Boxes', brand: 'Tech', category: 'Electronics', weight: 5, volume: 0.05, temperatureRequirement: 'ambient' }
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-10392',
    outletId: 'OUT-021',
    brand: 'Fresh',
    status: 'Confirmed',
    deliveryDate: '2026-09-30',
    deliveryWindow: { start: '05:30', end: '07:30' },
    items: [
      { productId: 'PROD-001', quantity: 20 },
      { productId: 'PROD-002', quantity: 10 }
    ],
    totalWeight: 820,
    totalVolume: 4.2,
    temperatureRequirement: 'chilled',
    createdAt: '2026-09-29T08:00:00Z'
  },
  {
    id: 'ORD-10394',
    outletId: 'OUT-034',
    brand: 'Fresh',
    status: 'Confirmed',
    deliveryDate: '2026-09-30',
    deliveryWindow: { start: '06:00', end: '07:30' },
    items: [
      { productId: 'PROD-003', quantity: 12 },
      { productId: 'PROD-001', quantity: 8 }
    ],
    totalWeight: 450,
    totalVolume: 2.1,
    temperatureRequirement: 'chilled',
    createdAt: '2026-09-29T08:15:00Z'
  },
  {
    id: 'ORD-10376',
    outletId: 'OUT-052',
    brand: 'Fresh',
    status: 'Deferred',
    deliveryDate: '2026-09-29',
    deliveryWindow: { start: '05:00', end: '07:00' },
    items: [
      { productId: 'PROD-001', quantity: 15 }
    ],
    totalWeight: 225,
    totalVolume: 1.5,
    temperatureRequirement: 'chilled',
    createdAt: '2026-09-28T16:00:00Z',
    exceptionReason: 'Vehicle unavailable'
  }
];

export const mockTrips: Trip[] = [
  {
    id: 'TRIP-018',
    vehicleId: 'VEH-014',
    driverName: 'Kasun Perera',
    depot: 'Peliyagoda',
    departureTime: '04:30',
    status: 'In Planning',
    published: false,
    stops: [
      { outletId: 'OUT-021', orderIds: ['ORD-10392'], status: 'Pending' },
      { outletId: 'OUT-034', orderIds: ['ORD-10394'], status: 'Pending' },
      { outletId: 'OUT-045', orderIds: [], status: 'Pending' },
      { outletId: 'OUT-052', orderIds: [], status: 'Pending' },
      { outletId: 'OUT-061', orderIds: [], status: 'Pending' },
      { outletId: 'OUT-073', orderIds: [], status: 'Pending' }
    ],
    totalWeight: 3900,
    totalVolume: 18
  }
];

export const mockExceptions: Exception[] = [
  {
    id: 'EXC-001',
    type: 'Capacity exceeded',
    referenceId: 'OUT-041',
    message: 'Order exceeds available vehicle capacity by 150kg.',
    createdAt: '2026-09-29T06:12:00Z',
    status: 'Open'
  },
  {
    id: 'EXC-002',
    type: 'Delivery window missed',
    referenceId: 'OUT-018',
    message: 'Vehicle delayed by traffic, missed 07:00 window.',
    createdAt: '2026-09-29T07:45:00Z',
    status: 'Resolved'
  },
  {
    id: 'EXC-003',
    type: 'Vehicle unavailable',
    referenceId: 'VEH-022',
    message: 'Vehicle broke down at depot.',
    createdAt: '2026-09-29T05:00:00Z',
    status: 'Open'
  },
  {
    id: 'EXC-004',
    type: 'Stock unavailable',
    referenceId: 'ORD-10376',
    message: 'Loading shortage detected.',
    createdAt: '2026-09-29T04:20:00Z',
    status: 'Open'
  }
];
