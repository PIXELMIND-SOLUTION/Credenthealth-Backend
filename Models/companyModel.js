import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, },
    companyType: { type: String, },
    assignedBy: { type: String },
    registrationDate: { type: Date },
    contractPeriod: { type: String },
    renewalDate: { type: Date },
    insuranceBroker: { type: String },
    email: { type: String },
    password: { type: String },
    phone: { type: String },
    gstNumber: { type: String },
    companyStrength: { type: Number },
    image: { type: String }, // Store image file path or URL

    noOfBranches: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Address
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pincode: { type: String },

    // Multiple Contact Persons
    contactPerson: [{
      name: { type: String },
      designation: { type: String },
      gender: { type: String },
      email: { type: String },
      phone: { type: String },
      address: {
        country: { type: String },
        state: { type: String },
        city: { type: String },
        pincode: { type: String },
        street: { type: String },
      },
    }],

    // ✅ NEW BRANCHES ARRAY ADDED
    branches: [{
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId() // Auto-generate unique ID for each branch
      },
      branchName: { type: String, },
      branchCode: { type: String, },
      email: { type: String, },
      phone: { type: String, },
      branchHead: { type: String, },

      // Branch Address
      country: { type: String, },
      state: { type: String, },
      city: { type: String, },
      pincode: { type: String, },
      address: { type: String, },

      // Branch Contact Person
      contactPerson: {
        name: { type: String, },
        designation: { type: String, },
        email: { type: String, },
        phone: { type: String, },
        gender: {
          type: String,
          enum: ['Male', 'Female', 'Other'],
        }
      },

      // Branch Status
      status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
      },

      // Timestamps for branch
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],

    staff: [{
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
      userId: { type: String },
      name: { type: String },
      role: { type: String },
      contact_number: { type: String },
      email: { type: String },
      dob: { type: Date },
      gender: { type: String },
      age: { type: Number },
      address: { type: String },
      profileImage: { type: String },
      idImage: { type: String },
      wallet_balance: { type: Number, default: 0 },
      department: { type: String },
      designation: { type: String },
      branch: { type: mongoose.Schema.Types.ObjectId }, // 👈 NEW: Add branch field
      mailSent: { type: Boolean, default: false },
      employeeId: { type: String, }, // ✅ Employee ID field
      mailSentAt: { type: Date },
      termsAndConditionsAccepted: { type: Boolean, default: false },
      termsAcceptedAt: { type: Date },
    }],

    scans: [{
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic'
    },
    diagnosticName: String,
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Xray'
    },
    title: String,
    price: Number,
    preparation: String,
    reportTime: String,
    image: String,
    totalStaffAssigned: Number,
    assignedAt: Date
  }],

   packages: [{
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic'
    },
    diagnosticName: String,
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package'
    },
    packageName: String,
    price: Number,
    offerPrice: Number,
    tests: [{
      name: String,
      subTestCount: Number,
      subTests: [String]
    }],
    description: String,
    precautions: String,
    totalTestsIncluded: Number,
    totalStaffAssigned: Number,
    assignedAt: Date
  }],

    tests: [{
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic'
    },
    diagnosticName: String,
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test'
    },
    testName: String,
    price: Number,
    fastingRequired: Boolean,
    homeCollectionAvailable: Boolean,
    reportIn24Hrs: Boolean,
    reportHour: String,
    description: String,
    instruction: String,
    precaution: String,
    image: String,
    subTests: [String],
    totalStaffAssigned: Number,
    assignedAt: Date
  }],

   diagnostics: [{
    diagnosticId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Diagnostic'
    },
    diagnosticName: String,
    diagnosticImage: String,
    assignedAt: Date
  }],

    // Uploaded documents
    documents: [{ type: String }],
  },
  { timestamps: true }
);

// Export the model
const Company = mongoose.model("Company", companySchema);
export default Company;