import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  diagnosticId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Diagnostic",
  },
  report_file: {
    type: String,
    default: null,
  },
    createdByAdmin: { type: Boolean, default: false },
  diagPrescription: {
    type: String,
    default: null,
  },
  doctorReports: {
    type: [String],
    default: [],
  },
  doctorPrescriptions: {
    type: [String],
    default: [],
  },
  serviceType: {
    type: String,
    enum: ["Home Collection", "Center Visit"],
  },
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    default: null,
  },
  isBooked: {
    type: Boolean,
    default: false,
  },
  bookedSlot: {
    day: { type: String },
    date: { type: String },
    timeSlot: { type: String },
  },
  totalPrice: Number,
  type: {
    type: String,
    enum: ["Online", "Offline"],
  },
  meetingLink: {
    type: String,
  },
  transactionId: {
    type: String,
    default: null,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', null],
    default: null,
  },
  paymentDetails: {
    type: Object,
    default: null,
  },
  isSuccessfull: {
    type: Boolean,
    default: true,
  },
   packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
  },
  couponCode: String,
  discount: Number,
  payableAmount: Number,
  status: {
    type: String,
    default: "Pending",
  },

  // ✅ Unique, Optional Booking IDs (Safe)
  doctorConsultationBookingId: {
    type: String,
    unique: true,
    sparse: true, // allow multiple nulls
    index: true,
  },
  diagnosticBookingId: {
    type: String,
    unique: true,
    sparse: true, // ✅ makes it optional without collisions
    index: true,
  },
    packageBookingId: {
    type: String,
    unique: true,
    sparse: true, // ✅ makes it optional without collisions
    index: true,
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff.addresses", // Reference to the address in Staff's addresses array
    default: null
  },

  // 🗓️ Dates and Time
  date: {
    type: String,
  },
  timeSlot: {
    type: String,
  },

}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
