import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  price: {
    type: Number,
  },
  doctorInfo: {
    type: String
  },
  totalTestsIncluded: {
    type: Number,
  },
  description: {
    type: String
  },
  precautions: {
    type: String // ✅ newly added field
  },
  gender: { // NEW FIELD
    type: String,
    enum: ['Male', 'Female', 'Both'],
    default: 'Both'
  },
  includedTests: [
    {
      name: {
        type: String,
      },
      subTestCount: {
        type: Number,
      },
      subTests: {
        type: [String],
      }
    }
  ],
    diagnostics: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic', // Assuming your diagnostic model name is 'Diagnostic'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Package = mongoose.model('Package', packageSchema);
export default Package;
