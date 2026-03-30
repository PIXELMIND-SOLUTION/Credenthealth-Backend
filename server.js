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
import dns from 'dns';

// Database connection
import connectDatabase from './db/connectDatabase.js';

// Routes
import bookingRoutes from './Routes/bookingRotes.js';
import adminRoutes from './Routes/AdminRoute.js';
import staffRoutes from './Routes/StaffRoute.js';
import DoctorRoute from './Routes/DoctorRoute.js';

// Utils - Both cron jobs are now in separate files
import { setupDiagnosticSlotsCronJob, getCronJobStatus } from './Utils/slotCronJob.js';
import { setupDoctorSlotsCronJob, getDoctorCronJobStatus } from './Utils/doctorSlotsCronJob.js';
import admin from 'firebase-admin';

import fs from 'fs';

dotenv.config();

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(['8.8.8.8', '8.8.4.4']);   // ✅ ADD THIS

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

// ==================== START SERVER ====================

const PORT = process.env.PORT || 6060;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  
  // ✅ Start both cron jobs from their respective utility files
  setupDiagnosticSlotsCronJob();  // Diagnostic slots - 7:19 PM daily
  setupDoctorSlotsCronJob();      // Doctor slots - 7:30 PM daily
  
  // ✅ Check and log both cron job status
  const diagnosticStatus = getCronJobStatus();
  const doctorStatus = getDoctorCronJobStatus();
  
  console.log('🕒 Cron Jobs Status:');
  console.log(`   📍 Diagnostic Slots: ${diagnosticStatus.nextRun}`);
  console.log(`   🩺 Doctor Slots: ${doctorStatus.nextRun}`);
  console.log(`\n📅 Slot Timings:`);
  console.log(`   • Diagnostic: 6:30 AM to 7:30 PM (30 min intervals)`);
  console.log(`   • Doctor: 6:30 AM to 7:30 PM (30 min intervals)`);
});