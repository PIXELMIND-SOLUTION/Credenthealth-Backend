import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import moment from 'moment';
import cron from 'node-cron';

// Database connection
import connectDatabase from './db/connectDatabase.js';

// Routes
import bookingRoutes from './Routes/bookingRotes.js';
import adminRoutes from './Routes/AdminRoute.js';
import staffRoutes from './Routes/StaffRoute.js';
import DoctorRoute from './Routes/DoctorRoute.js';

// Models
import Doctor from './Models/doctorModel.js';
import Diagnostic from './Models/diagnosticModel.js';

// Utils
import { setupDiagnosticSlotsCronJob, getCronJobStatus } from './Utils/slotCronJob.js';
import { setupDoctorSlotsCronJob, getDoctorCronJobStatus } from './Utils/doctorSlotsCronJob.js';
import admin from 'firebase-admin';


import fs from 'fs';




dotenv.config();

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = express();
const server = http.createServer(app);

// ✅ Allowlisted CORS origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://credenthealthadmin.vercel.app',
  'https://credenthealthadmin-j1y3.vercel.app',
  'http://194.164.148.244:3032',
  'http://31.97.206.144:3004',
  'http://31.97.206.144:3041',
  'http://localhost:3001',
  'https://credenthealthdeleteurl.vercel.app',
  'http://31.97.206.144:3593',
  'https://credenthealth.com',
  'https://healthcare-sage-six.vercel.app',
  'http://31.97.228.17:3001',
  'http://panel.credenthealth.com',
  'https://panel.credenthealth.com'
];

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// ✅ Attach io to app so it's accessible in controllers
app.set('io', io);

// ✅ Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ✅ Preflight support
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ✅ Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// ✅ Body parsers
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// ✅ Connect to MongoDB
connectDatabase();

// ✅ Routes
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/doctor', DoctorRoute);

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ message: '🩺 Hello from CredenHealth backend.' });
});

// ✅ Socket.IO logic
io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  socket.on('joinRoom', ({ staffId, doctorId }) => {
    const roomId = `${staffId}_${doctorId}`;
    socket.join(roomId);
    console.log(`👥 User joined room: ${roomId}`);
  });

  // Real-time fallback emitter (if needed)
  socket.on('sendMessage', async ({ staffId, doctorId, message, sender }) => {
    const Chat = (await import('./Models/Chat.js')).default;

    const newMessage = new Chat({ staffId, doctorId, message, sender });
    const saved = await newMessage.save();

    const roomId = `${staffId}_${doctorId}`;
    io.to(roomId).emit('receiveMessage', saved);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// ==================== DOCTOR SLOTS CRON JOB ====================

// Immediate log on server start
console.log(
  `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ⏰ Daily doctor slots will be created at 11:00 AM every day.`
);

// Slot generator function for doctors
const generateDailySlots = () => {
  const slots = [];
  const startHour = 9; // 9 AM
  const endHour = 23;  // 11 PM
  const intervalMinutes = 30;
  const date = moment().format("YYYY-MM-DD");
  const day = moment().format("dddd");

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      const time = `${hour.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")}`;
      slots.push({ day, date, timeSlot: time, isBooked: false });
    }
  }
  return slots;
};

// Function to process all doctors
const createDoctorSlots = async () => {
  console.log(
    `[${moment().format("YYYY-MM-DD HH:mm:ss")}] 🚀 Creating doctor slots now...`
  );
  try {
    const doctors = await Doctor.find({});
    if (!doctors.length) {
      console.log("⚠️ No doctors found for slots generation.");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const doctor of doctors) {
      const onlineBefore = doctor.onlineSlots.length;
      const offlineBefore = doctor.offlineSlots.length;

      if (
        doctor.consultation_type === "Online" ||
        doctor.consultation_type === "Both"
      ) {
        doctor.onlineSlots = generateDailySlots();
      }
      if (
        doctor.consultation_type === "Offline" ||
        doctor.consultation_type === "Both"
      ) {
        doctor.offlineSlots = generateDailySlots();
      }

      await doctor.save();
      createdCount++;

      if (
        onlineBefore === doctor.onlineSlots.length &&
        offlineBefore === doctor.offlineSlots.length
      ) {
        skippedCount++;
      }

      console.log(`✅ Slots processed for Dr. ${doctor.name}`);
    }

    // ✨ Success log with today's date and day
    const today = moment().format("YYYY-MM-DD");
    const todayDay = moment().format("dddd");
    console.log(
      `🎉 Doctor slots generation completed. Total doctors processed: ${createdCount}, Skipped: ${skippedCount}`
    );
    console.log(`✅ Slots created successfully for ${today} (${todayDay})`);
  } catch (err) {
    console.error("❌ Error generating doctor slots:", err);
  }
};

// 🔹 Schedule doctor slots at 11:00 AM daily
cron.schedule("0 11 * * *", createDoctorSlots);

// ==================== DIAGNOSTIC SLOTS CRON JOB ====================

// Immediate log for Diagnostics
console.log(
  `[${moment().format("YYYY-MM-DD HH:mm:ss")}] ⏰ Daily diagnostic slots will be created at 11:30 AM every day.`
);

// Diagnostic slots generator function
const generateDiagnosticSlots = (type) => {
  const slots = [];
  const startHour = 7; // 7 AM
  const endHour = 10; // 10 AM
  const intervalMinutes = 60; // 1 hour
  const daysToGenerate = 7; // slots for next 7 days

  for (let i = 0; i < daysToGenerate; i++) {
    const dateObj = moment().add(i, "days");
    const day = dateObj.format("dddd");
    const date = dateObj.format("YYYY-MM-DD");

    for (let hour = startHour; hour <= endHour; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      slots.push({ day, date, timeSlot: time, type, isBooked: false });
    }
  }
  return slots;
};

// Diagnostic slots cron function
const createDiagnosticSlots = async () => {
  console.log(
    `[${moment().format("YYYY-MM-DD HH:mm:ss")}] 🔔 Daily diagnostic slots generation started...`
  );

  try {
    const diagnostics = await Diagnostic.find({});
    if (!diagnostics.length) {
      console.log("⚠️ No diagnostic centers found for slots generation.");
      return;
    }

    let processedCount = 0;

    for (const diagnostic of diagnostics) {
      // Generate slots
      diagnostic.homeCollectionSlots = generateDiagnosticSlots("Home Collection");
      diagnostic.centerVisitSlots = generateDiagnosticSlots("Center Visit");

      await diagnostic.save();
      processedCount++;
      console.log(`✅ Slots generated for ${diagnostic.name}`);
    }

    // ✅ Final success log
    const today = moment().format("YYYY-MM-DD");
    const todayDay = moment().format("dddd");
    console.log(
      `🎉 Daily diagnostic slots generation completed for ${today} (${todayDay}). Total diagnostics processed: ${processedCount}`
    );
  } catch (err) {
    console.error("❌ Error generating diagnostic slots:", err);
  }
};

// 🔹 Schedule diagnostic slots at 11:30 AM daily
cron.schedule("30 11 * * *", createDiagnosticSlots);

// ==================== START SERVER ====================





const PORT = process.env.PORT || 6060;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  
  // Start the diagnostic slots cron job (6:50 PM for tomorrow's slots)
  setupDiagnosticSlotsCronJob();
  setupDoctorSlotsCronJob();     // Doctors - 7:30 PM
  
  // Check and log cron job status
  // Check and log both cron job status
  const diagnosticStatus = getCronJobStatus();
  const doctorStatus = getDoctorCronJobStatus();
  
  console.log('🕒 Cron Jobs Status:');
  console.log('   - Diagnostic Slots:', diagnosticStatus.nextRun);
  console.log('   - Doctor Slots:', doctorStatus.nextRun);
});