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
   receivedDoctorReports: {
    type: [String],
    default: []
  },
  receivedDoctorPrescriptions: {
    type: [String],
    default: []
  },
   userUploadedFiles: [
    {
      type: String, // File path (e.g., /uploads/userMedicalFiles/abc123.pdf)
    }
  ],

   items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId },
    type: { type: String, enum: ['test', 'xray'] },
    title: String,
    quantity: { type: Number, default: 1, min: 1 },
    price: Number,
    offerPrice: Number,
    totalPayable: Number,  // price - offer
    totalPrice: Number     // totalPayable * quantity
  }],

   // Staff uploaded files
  receivedDiagReports: { type: [String], default: [] },        // Staff uploaded diagnostic reports
  receivedDiagPrescriptions: { type: [String], default: [] },  // Staff uploaded prescriptions
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
    enum: ['pending', 'authorized', 'captured', 'wallet', 'failed', null],
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
