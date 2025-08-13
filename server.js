import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import connectDatabase from './db/connectDatabase.js';
import bookingRoutes from './Routes/bookingRotes.js';
import adminRoutes from './Routes/AdminRoute.js';
import staffRoutes from './Routes/StaffRoute.js';
import DoctorRoute from './Routes/DoctorRoute.js';

dotenv.config();

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  'https://credenthealthdeleteurl.vercel.app'
];

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*', // Let frontend handle CORS restriction if needed
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

// ✅ Start the server
const PORT = process.env.PORT || 6060;
server.listen(PORT, '0.0.0.0', () => {
 console.log(`Server is running at http://localhost:${PORT}`);
});
