import cron from 'node-cron';
import moment from 'moment';
import Doctor from '../Models/doctorModel.js';

// Function to generate tomorrow slots for doctors
const generateTomorrowDoctorSlots = () => {
  const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
  const dayName = moment().add(1, 'day').format('dddd');
  
  const slots = [];
  const startTime = moment(`${tomorrow} 06:30`, 'YYYY-MM-DD HH:mm');
  const endTime = moment(`${tomorrow} 19:30`, 'YYYY-MM-DD HH:mm');
  
  let currentTime = startTime.clone();
  
  while (currentTime.isSameOrBefore(endTime)) {
    slots.push({
      day: dayName,
      date: tomorrow,
      timeSlot: currentTime.format('HH:mm'),
      isBooked: false
    });
    
    currentTime.add(30, 'minutes');
  }
  
  console.log(`🩺 Generated ${slots.length} doctor slots from ${startTime.format('HH:mm')} to ${endTime.format('HH:mm')}`);
  return slots;
};

// Cron job to generate slots daily at 7:30 PM for next day
export const setupDoctorSlotsCronJob = () => {
  // Run every day at 7:30 PM (19:30)
  cron.schedule('30 19 * * *', async () => {
    try {
      console.log('🕒 [7:30 PM DOCTOR CRON JOB] Starting to generate tomorrow slots for all doctors...');
      
      const allDoctors = await Doctor.find();
      const tomorrowSlots = generateTomorrowDoctorSlots();
      
      let updatedCount = 0;
      
      for (const doctor of allDoctors) {
        try {
          // Update based on consultation type
          if (doctor.consultation_type === "Online" || doctor.consultation_type === "Both") {
            await Doctor.findByIdAndUpdate(
              doctor._id,
              { 
                $push: { 
                  onlineSlots: { 
                    $each: tomorrowSlots 
                  } 
                } 
              }
            );
          }
          
          if (doctor.consultation_type === "Offline" || doctor.consultation_type === "Both") {
            await Doctor.findByIdAndUpdate(
              doctor._id,
              { 
                $push: { 
                  offlineSlots: { 
                    $each: tomorrowSlots 
                  } 
                } 
              }
            );
          }
          
          updatedCount++;
          console.log(`✅ Slots generated for Dr. ${doctor.name}`);
          
        } catch (error) {
          console.error(`❌ Error generating slots for Dr. ${doctor.name}:`, error);
        }
      }
      
      console.log(`🎉 [7:30 PM DOCTOR CRON JOB] Completed! Updated ${updatedCount} doctors with tomorrow's slots.`);
      console.log(`📅 Slots generated for: ${moment().add(1, 'day').format('YYYY-MM-DD')} (6:30 AM to 7:30 PM)`);
      console.log(`🩺 Total slots per doctor: ${tomorrowSlots.length}`);
      
    } catch (error) {
      console.error('❌ Error in doctor slots cron job:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log('✅ Doctor slots cron job scheduled: Daily at 7:30 PM');
};

// Manual trigger function for doctors
export const manuallyGenerateTomorrowDoctorSlots = async () => {
  try {
    console.log('🩺 Manually generating tomorrow slots for all doctors...');
    
    const allDoctors = await Doctor.find();
    const tomorrowSlots = generateTomorrowDoctorSlots();
    
    let updatedCount = 0;
    
    for (const doctor of allDoctors) {
      try {
        if (doctor.consultation_type === "Online" || doctor.consultation_type === "Both") {
          await Doctor.findByIdAndUpdate(
            doctor._id,
            { 
              $push: { 
                onlineSlots: { 
                  $each: tomorrowSlots 
                } 
              } 
            }
          );
        }
        
        if (doctor.consultation_type === "Offline" || doctor.consultation_type === "Both") {
          await Doctor.findByIdAndUpdate(
            doctor._id,
            { 
              $push: { 
                offlineSlots: { 
                  $each: tomorrowSlots 
                } 
              } 
            }
          );
        }
        
        updatedCount++;
        console.log(`✅ Slots generated for Dr. ${doctor.name}`);
        
      } catch (error) {
        console.error(`❌ Error generating slots for Dr. ${doctor.name}:`, error);
      }
    }
    
    console.log(`🎉 Manual doctor slot generation completed! Updated ${updatedCount} doctors.`);
    console.log(`📅 Slots generated for: ${moment().add(1, 'day').format('YYYY-MM-DD')} (6:30 AM to 7:30 PM)`);
    
    return { success: true, updatedCount, totalSlots: tomorrowSlots.length };
    
  } catch (error) {
    console.error('❌ Error in manual doctor slot generation:', error);
    return { success: false, error: error.message };
  }
};

// Function to check doctor cron job status
export const getDoctorCronJobStatus = () => {
  const now = moment();
  const nextRun = moment().set('hour', 19).set('minute', 30).set('second', 0);
  
  if (now.isAfter(nextRun)) {
    nextRun.add(1, 'day');
  }
  
  return {
    scheduled: true,
    nextRun: nextRun.format('YYYY-MM-DD HH:mm:ss'),
    description: 'Daily at 7:30 PM - Generates tomorrow slots (6:30 AM to 7:30 PM) for all doctors'
  };
};

// Function to clean up old doctor slots
export const cleanupOldDoctorSlots = async () => {
  try {
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    
    const result = await Doctor.updateMany(
      {},
      {
        $pull: {
          onlineSlots: { date: { $lt: yesterday } },
          offlineSlots: { date: { $lt: yesterday } }
        }
      }
    );
    
    console.log(`🧹 Cleaned up old doctor slots for ${result.modifiedCount} doctors`);
    return result;
  } catch (error) {
    console.error('❌ Error cleaning up old doctor slots:', error);
  }
};