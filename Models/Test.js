import mongoose from 'mongoose';

const testSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  price: {
    type: Number,
  },
    gender: { // NEW: Added gender field
    type: String,
    enum: ['Male', 'Female', 'Both'],
    default: 'Both'
  },
  fastingRequired: {
    type: Boolean,
    default: false,
  },
  homeCollectionAvailable: {
    type: Boolean,
    default: false,
  },
  reportIn24Hrs: {
    type: Boolean,
    default: false,
  },
  reportHour: {
    type: Number,
    min: 1,
  },
  description: {
    type: String,
  },
  instruction: {
    type: String,
  },
  precaution: {
    type: String,
  },
  diagnosticId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Diagnostic" 
  },
  diagnostics: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Diagnostic" 
  }],
  category: {
    type: String,
    default: 'General',
  },
  image: {
    type: String, // URL of the uploaded image
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Test = mongoose.model('Test', testSchema);
export default Test;