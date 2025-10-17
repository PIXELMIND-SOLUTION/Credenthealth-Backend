import mongoose from "mongoose";

const diagnosticSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  address: String,
  image: { type: String, default: null },
  centerType: String,
  methodology: String,
  pathologyAccredited: String,
  gstNumber: String,
  centerStrength: Number,
  description: String,

  latitude: Number,
  longitude: Number,
  country: String,
  state: String,
  city: String,
  pincode: String,

  visitType: { type: String, enum: ["Home Collection", "Visit Center", 'Center Visit', "Both"] },

  network: { type: String, enum: ["Single", "Chain", 'Independent', 'Standalone'], default: "Single" },

  contactPersons: [
    {
      name: { type: String },
      designation: { type: String },
      gender: { type: String },
      contactEmail: { type: String },
      contactNumber: { type: String }
    }
  ],

  homeCollectionSlots: [
  {
    day: { type: String },
    date: { type: String },
    timeSlot: { type: String },
    type: { type: String, default: "Home Collection" },
    isBooked: { type: Boolean, default: false }  // ✅ Add this
  }
],
centerVisitSlots: [
  {
    day: { type: String },
    date: { type: String },
    timeSlot: { type: String },
    type: { type: String, default: "Center Visit" },
    isBooked: { type: Boolean, default: false }  // ✅ Add this
  }
],
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: "Test" }],
  packages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Package" }],
  scans: [{ type: mongoose.Schema.Types.ObjectId, ref: "Xray" }],
}, { timestamps: true });

const Diagnostic = mongoose.model("Diagnostic", diagnosticSchema);

export default Diagnostic;
