export const VEHICLE_TYPES = [
  {
    id: 'three_wheeler',
    title: '3 Wheeler',
    capacity: 'Up to 500kg',
    icon: '🛺',
    label: '3 Wheeler',
  },
  {
    id: 'pickup_truck',
    title: 'Pickup Truck',
    capacity: 'Up to 1 ton',
    icon: '🚚',
    label: 'Pickup Truck',
  },
  {
    id: 'mini_truck',
    title: 'Mini Truck',
    capacity: 'Up to 2 tons',
    icon: '🚛',
    label: 'Mini Truck',
  },
  {
    id: 'medium_truck',
    title: 'Medium Truck',
    capacity: 'Up to 5 tons',
    icon: '🚛',
    label: 'Medium Truck',
  },
  {
    id: 'large_truck',
    title: 'Large Truck',
    capacity: 'Over 5 tons',
    icon: '🚛',
    label: 'Large Truck',
  },
] as const;

export type VehicleTypeId = typeof VEHICLE_TYPES[number]['id'];
