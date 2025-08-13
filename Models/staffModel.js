import mongoose from 'mongoose';

// Define the schema for Staff
const staffSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  profileImage: {
    type: String,
    default: null,
  },
   idImage: {
    type: String,
    default: null,
  },
  password: {
    type: String,
  },
  gender: {
    type: String,
  },
  department: {
    type: String,
  },
  age: {
    type: Number,
  },
  role: {
    type: String,
    default: 'Staff',
  },
  contact_number: {
    type: String,
  },
  // address: {
  //   type: String,
  // },
  myBookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
  ],
  notifications: [
  {
    title: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }
  }
],
   wallet_balance: {
    type: Number,
    default: 0
  },
  forTests: {
    type: Number,
    default: 0
  },
  forDoctors: {
    type: Number,
    default: 0
  },
  forPackages: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },

  // 👇 Logs (History)
  wallet_logs: [
    {
      type: {
        type: String,
        enum: ['credit', 'debit'],
      },
      forTests: {
        type: Number,
        default: 0
      },
      forDoctors: {
        type: Number,
        default: 0
      },
      forPackages: {
        type: Number,
        default: 0
      },
      totalAmount: {
        type: Number,
      },
      from: {
        type: String,
        default: 'Admin'
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  totalCoins: {
    type: Number,
    default: 0
  },

  // myTest array stores diagnostic and test data
  myTest: [
    {
      diagnosticId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Diagnostic',  // Reference to the Diagnostic model
      },
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',  // Reference to the Test model
      },
      test_name: {
        type: String,
      },
      price: {
        type: Number,
      },
    },
  ],


  myPackages: [
  {
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic',  // Reference Diagnostic model
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package', // You can create a separate Package model or keep as ObjectId
    },
    packageName: {
      type: String,
    },
    price: {
      type: Number,
    },
    offerPrice: {
      type: Number,
    },
    tests: [
      {
        test_name: String,
        description: String,
        image: String,
        _id: mongoose.Schema.Types.ObjectId,
      }
    ],
  },
],


 doctorAppointments: [
    {
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
      doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
      },
      appointment_date: {
        type: String, // e.g., "2025-04-28"
      },
      appointment_time: {
        type: String, // e.g., "10:30 AM"
      },
      status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending',
      },
      patient_name: {
        type: String,
      },
      patient_relation: {
        type: String,
      },
      subtotal: {
        type: Number,
      },
      total: {
        type: Number,
      },
    },
  ],
 myPackage: [
  {
    diagnosticId: { type: mongoose.Schema.Types.ObjectId, ref: "Diagnostic" },
    packageId: { type: mongoose.Schema.Types.ObjectId },
    packageName: String,
    price: Number,
    offerPrice: Number,
    tests: [
      {
        testName: String,
        description: String,
        image: String,
        testId: { type: mongoose.Schema.Types.ObjectId } // Test ka _id bhi store kr rahe hain
      }
    ]
  }
],

   // 👇 Add Prescription field
   prescription: [
    {
      medicineName: { type: String },
      dosage: { type: String },
      instructions: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  myBlogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }],
  family_members: [
    {
      fullName: { type: String },
      mobileNumber: { type: String },
      age: { type: Number },
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      DOB: { type: Date },
      height: { type: Number },
      weight: { type: Number },
      eyeSight: { type: String },
      BMI: { type: Number },
      BP: { type: String },
      sugar: { type: String },
      relation: { type: String },
    },
  ],

  addresses: [
    {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
      addressType: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
    },
  ],

 steps: [
  {
    date: { type: Date, required: true },
    day: { type: String },
    stepsCount: { type: Number, required: true },
  }
],

  issues: [
    {
      reason: { type: String },
      description: { type: String },
      file: { type: String },
      status: { type: String, default: 'Processing' },
      response: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  deleteToken: { type: String, default: null },
  deleteTokenExpiration: { type: Date, default: null },
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
