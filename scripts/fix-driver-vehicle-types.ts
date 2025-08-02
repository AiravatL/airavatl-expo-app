import { supabase } from '../lib/supabase';

/**
 * Script to fix existing drivers who have vehicle type info in bio but NULL vehicle_type column
 * This should be run once to migrate existing data
 */

const VEHICLE_TYPE_MAPPING = {
  'Truck': 'large_truck',
  'Pickup': 'pickup_truck',
  '3 Wheeler': 'three_wheeler',
  'Mini Truck': 'mini_truck',
  'Large Truck': 'large_truck',
  'LCV': 'pickup_truck', // Map LCV to pickup_truck
  'Tempo': 'mini_truck', // Map Tempo to mini_truck
  'Medium Truck': 'medium_truck',
};

async function fixDriverVehicleTypes() {
  console.log('🔧 Starting driver vehicle type migration...');

  try {
    // Get all drivers with NULL vehicle_type
    const { data: drivers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username, bio, vehicle_type')
      .eq('role', 'driver')
      .is('vehicle_type', null);

    if (fetchError) {
      console.error('❌ Error fetching drivers:', fetchError);
      return;
    }

    if (!drivers || drivers.length === 0) {
      console.log('✅ No drivers with NULL vehicle_type found');
      return;
    }

    console.log(`📋 Found ${drivers.length} drivers with NULL vehicle_type`);

    let successCount = 0;
    let skipCount = 0;

    for (const driver of drivers) {
      let vehicleType: string | null = null;

      // Parse vehicle type from bio
      if (driver.bio) {
        for (const [bioText, dbValue] of Object.entries(VEHICLE_TYPE_MAPPING)) {
          if (driver.bio.includes(`Vehicle Type: ${bioText}`)) {
            vehicleType = dbValue;
            break;
          }
        }
      }

      if (!vehicleType) {
        console.log(`⚠️  Could not determine vehicle type for ${driver.username}, setting to pickup_truck`);
        vehicleType = 'pickup_truck'; // Default fallback
      }

      // Update the driver's vehicle_type
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ vehicle_type: vehicleType })
        .eq('id', driver.id);

      if (updateError) {
        console.error(`❌ Failed to update ${driver.username}:`, updateError);
        skipCount++;
      } else {
        console.log(`✅ Updated ${driver.username}: ${vehicleType}`);
        successCount++;
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`✅ Successfully updated: ${successCount} drivers`);
    console.log(`❌ Failed to update: ${skipCount} drivers`);
    console.log(`📋 Total processed: ${drivers.length} drivers`);

    // Verify the results
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('vehicle_type')
      .eq('role', 'driver');

    if (!verifyError && verifyData) {
      const withVehicleType = verifyData.filter(d => d.vehicle_type !== null).length;
      const withoutVehicleType = verifyData.filter(d => d.vehicle_type === null).length;
      
      console.log(`\n🔍 Verification:`);
      console.log(`✅ Drivers with vehicle_type: ${withVehicleType}`);
      console.log(`❌ Drivers without vehicle_type: ${withoutVehicleType}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  fixDriverVehicleTypes()
    .then(() => {
      console.log('🎉 Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { fixDriverVehicleTypes };
