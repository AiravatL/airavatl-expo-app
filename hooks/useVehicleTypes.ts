import { VEHICLE_TYPES } from '@/constants/vehicleTypes';

/**
 * Hook for providing vehicle type data
 */
export function useVehicleTypes() {
  return {
    vehicleTypes: VEHICLE_TYPES,
    getVehicleTypeById: (id: string) => VEHICLE_TYPES.find(vt => vt.id === id),
    getVehicleTypeLabel: (id: string) => VEHICLE_TYPES.find(vt => vt.id === id)?.label || id,
  };
}
