import cron from 'node-cron';
import moment from 'moment';
import Diagnostic from '../Models/diagnosticModel.js';

// Function to generate slots for tomorrow
const generateTomorrowSlots = () => {
  const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
  const dayName = moment().add(1, 'day').format('dddd');
  
  const slots = [];
  const startTime = moment(`${tomorrow} 06:30`, 'YYYY-MM-DD HH:mm');
  const endTime = moment(`${tomorrow} 19:30`, 'YYYY-MM-DD HH:mm');
  
  let currentTime = startTime.clone();
  
  while (currentTime.isSameOrBefore(endTime)) { // ✅ Changed to isSameOrBefore
    slots.push({
      day: dayName,
      date: tomorrow,
      timeSlot: currentTime.format('HH:mm'),
      type: "Home Collection",
      isBooked: false
    });
    
    currentTime.add(30, 'minutes');
  }
  
  console.log(`🕒 Generated ${slots.length} slots from ${startTime.format('HH:mm')} to ${endTime.format('HH:mm')}`);
  console.log(`📅 Last slot: ${slots[slots.length - 1]?.timeSlot}`);
  
  return slots;
};

// Cron job to generate slots daily at 7:05 PM for next day
export const setupDiagnosticSlotsCronJob = () => {
  cron.schedule('19 19 * * *', async () => {
    try {
      console.log('🕒 [7:16 PM CRON JOB] Starting to generate tomorrow slots for all diagnostic centers...');
      
      const allDiagnostics = await Diagnostic.find();
      const tomorrowHomeSlots = generateTomorrowSlots();
      const tomorrowCenterSlots = generateTomorrowSlots().map(slot => ({
        ...slot,
        type: "Center Visit"
      }));
      
      let updatedCount = 0;
      
      for (const diagnostic of allDiagnostics) {
        try {
          if (diagnostic.visitType === "Home Collection" || diagnostic.visitType === "Both") {
            await Diagnostic.findByIdAndUpdate(
              diagnostic._id,
              { 
                $push: { 
                  homeCollectionSlots: { 
                    $each: tomorrowHomeSlots 
                  } 
                } 
              }
            );
          }
          
          if (diagnostic.visitType === "Center Visit" || diagnostic.visitType === "Both") {
            await Diagnostic.findByIdAndUpdate(
              diagnostic._id,
              { 
                $push: { 
                  centerVisitSlots: { 
                    $each: tomorrowCenterSlots 
                  } 
                } 
              }
            );
          }
          
          updatedCount++;
          console.log(`✅ Slots generated for diagnostic: ${diagnostic.name}`);
          
        } catch (error) {
          console.error(`❌ Error generating slots for ${diagnostic.name}:`, error);
        }
      }
      
      console.log(`🎉 [7:19 PM CRON JOB] Completed! Updated ${updatedCount} diagnostic centers.`);
      console.log(`📅 Slots generated for: ${moment().add(1, 'day').format('YYYY-MM-DD')} (6:30 AM to 7:30 PM)`);
      console.log(`🕒 Total slots per diagnostic: ${tomorrowHomeSlots.length}`);
      
    } catch (error) {
      console.error('❌ Error in diagnostic slots cron job:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log('✅ Diagnostic slots cron job scheduled: Daily at 7:05 PM');
};

// Manual trigger function
export const manuallyGenerateTomorrowSlots = async () => {
  try {
    console.log('🕒 Manually generating tomorrow slots for all diagnostic centers...');
    
    const allDiagnostics = await Diagnostic.find();
    const tomorrowHomeSlots = generateTomorrowSlots();
    const tomorrowCenterSlots = generateTomorrowSlots().map(slot => ({
      ...slot,
      type: "Center Visit"
    }));
    
    let updatedCount = 0;
    
    for (const diagnostic of allDiagnostics) {
      try {
        if (diagnostic.visitType === "Home Collection" || diagnostic.visitType === "Both") {
          await Diagnostic.findByIdAndUpdate(
            diagnostic._id,
            { 
              $push: { 
                homeCollectionSlots: { 
                  $each: tomorrowHomeSlots 
                } 
              } 
            }
          );
        }
        
        if (diagnostic.visitType === "Center Visit" || diagnostic.visitType === "Both") {
          await Diagnostic.findByIdAndUpdate(
            diagnostic._id,
            { 
              $push: { 
                centerVisitSlots: { 
                  $each: tomorrowCenterSlots 
                } 
              } 
            }
          );
        }
        
        updatedCount++;
        console.log(`✅ Slots generated for diagnostic: ${diagnostic.name}`);
        
      } catch (error) {
        console.error(`❌ Error generating slots for ${diagnostic.name}:`, error);
      }
    }
    
    console.log(`🎉 Manual slot generation completed! Updated ${updatedCount} diagnostic centers.`);
    console.log(`📅 Slots generated for: ${moment().add(1, 'day').format('YYYY-MM-DD')} (6:30 AM to 7:30 PM)`);
    console.log(`🕒 Total slots per diagnostic: ${tomorrowHomeSlots.length}`);
    
    return { success: true, updatedCount, totalSlots: tomorrowHomeSlots.length };
    
  } catch (error) {
    console.error('❌ Error in manual slot generation:', error);
    return { success: false, error: error.message };
  }
};

// Function to check current cron job status
export const getCronJobStatus = () => {
  const now = moment();
  const nextRun = moment().set('hour', 19).set('minute', 19).set('second', 0);
  
  if (now.isAfter(nextRun)) {
    nextRun.add(1, 'day');
  }
  
  return {
    scheduled: true,
    nextRun: nextRun.format('YYYY-MM-DD HH:mm:ss'),
    description: 'Daily at 7:19 PM - Generates tomorrow slots (6:30 AM to 7:30 PM) for all diagnostic centers'
  };
};

// Function to clean up old slots
export const cleanupOldSlots = async () => {
  try {
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    
    const result = await Diagnostic.updateMany(
      {},
      {
        $pull: {
          homeCollectionSlots: { date: { $lt: yesterday } },
          centerVisitSlots: { date: { $lt: yesterday } }
        }
      }
    );
    
    console.log(`🧹 Cleaned up old slots for ${result.modifiedCount} diagnostics`);
    return result;
  } catch (error) {
    console.error('❌ Error cleaning up old slots:', error);
  }
};