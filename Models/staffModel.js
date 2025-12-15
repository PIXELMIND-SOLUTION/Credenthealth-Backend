import mongoose from 'mongoose';

// Define the schema for Staff
const staffSchema = new mongoose.Schema({
  name: {
    type: String,
  },
   employeeId: {
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
  userId: { 
    type: String, 
  },
  dob: { 
    type: Date, 
  },
  idImage: {
    type: String,
    default: null,
  },
  password: {
    type: String,
  },
  address: {
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
  myBookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
  ],
    termsAndConditionsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  },
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
        ref: 'Diagnostic',
      },
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
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
        ref: 'Diagnostic',
      },
      packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Package',
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


  myTests: [
  {
    diagnosticId: { type: mongoose.Schema.Types.ObjectId, ref: "Diagnostic" },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
    testName: String,
    price: Number,
    fastingRequired: Boolean,
    homeCollectionAvailable: Boolean,
    reportIn24Hrs: Boolean,
    reportHour: Number,
    description: String,
    instruction: String,
    precaution: String,
    image: String,
    subTests: [
      {
        name: String,
        value: String
      }
    ]
  }
],


myScans: [
  {
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diagnostic",
    },
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Xray",
    },
    title: String,
    price: Number,
    preparation: String,
    reportTime: String,
    image: String
  }
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
        type: String,
      },
      appointment_time: {
        type: String,
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
          testId: { type: mongoose.Schema.Types.ObjectId }
        }
      ]
    }
  ],

  // Staff uploaded reports/prescriptions
  receivedDoctorReports: {
    type: [String],
    default: []
  },
  receivedDoctorPrescriptions: {
    type: [String],
    default: []
  },

  // 👇 Add Prescription field
  prescription: [
    {
      medicineName: { type: String },
      dosage: { type: String },
      instructions: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  userUploadedFiles: {
    type: [String],
    default: []
  },
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
      description: { type: String },
    },
  ],

    // Add the fcmToken field to store the Firebase Cloud Messaging token
  fcmToken: {
    type: String,
    default: null,  // Default to null if no token is set
  },

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
 
  // ✅ FIXED BRANCH FIELD - Custom setter use karo
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    set: function(value) {
      // ✅ Empty string, "null", "undefined" ko null karo
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return null;
      }
      // ✅ Valid ObjectId hai to use karo
      if (mongoose.Types.ObjectId.isValid(value)) {
        return value;
      }
      // ✅ Invalid hai to null karo
      return null;
    }
  },

  height: {
    type: Number,
    default: null,
  },
  weight: {
    type: Number,
    default: null,
  },
  BP: {
    type: String,
    default: null,
  },
  BMI: {
    type: Number,
    default: null,
  },
  eyeCheckupResults: {
    type: String,
    default: null,
  },
  eyeSight: {
    type: String,
    default: null,
  },

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
  // ✅ NEW: Add these fields for email tracking
  mailSent: { 
    type: Boolean, 
    default: false 
  },
  mailSentAt: { 
    type: Date 
  },
  deleteToken: { type: String, default: null },
  deleteTokenExpiration: { type: Date, default: null },
}, { 
  timestamps: true 
});

// ✅ UNIVERSAL MIDDLEWARE: Har operation se pehle branch field ko clean karo
staffSchema.pre('save', function(next) {
  this.branch = this.branch;
  next();
});

staffSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany', 'update'], function(next) {
  const update = this.getUpdate();
  
  const cleanBranch = (obj) => {
    if (obj && typeof obj === 'object') {
      if ('branch' in obj) {
        if (!obj.branch || obj.branch === '' || obj.branch === 'null' || obj.branch === 'undefined') {
          obj.branch = null;
        } else if (!mongoose.Types.ObjectId.isValid(obj.branch)) {
          obj.branch = null;
        }
      }
      if ('$set' in obj && obj.$set && typeof obj.$set === 'object') {
        cleanBranch(obj.$set);
      }
    }
  };
  
  cleanBranch(update);
  next();
});

// ✅ Query middleware bhi add karo
staffSchema.pre(['find', 'findOne'], function(next) {
  const query = this.getQuery();
  
  if (query.branch === '' || query.branch === 'null' || query.branch === 'undefined') {
    this.setQuery({ ...query, branch: null });
  }
  
  next();
});

const Staff = mongoose.model('Staff', staffSchema);
export default Staff;