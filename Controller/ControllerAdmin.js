import Admin from '../Models/Admin.js';
import generateToken from '../config/jwtToken.js';
import Staff from '../Models/staffModel.js';
import Doctor from '../Models/doctorModel.js';
import { uploadDocuments, uploadTestImages, uploadCompanyAssets, uploadStaffImages, uploadDoctorImage, uploadCategoryImage, uploadDiagnosticReport, uploadDiagPrescription, uploadStaffProfile } from '../config/multerConfig.js';
import Booking from '../Models/bookingModel.js';
import Appointment from '../Models/Appointment.js';
import Company from '../Models/companyModel.js';
import mongoose from 'mongoose';
import Category from '../Models/Category.js';
import HealthAssessment from '../Models/HealthAssessment.js';
import XLSX from 'xlsx';
import fs from 'fs';
import Test from '../Models/Test.js'
import Package from '../Models/Package.js'
import Xray from '../Models/Xray.js';
import Diagnostic from '../Models/diagnosticModel.js';
import Hra from '../Models/HRA.js';
import HraQuestion from '../Models/HraQuestion.js';
import Blog from '../Models/Blog.js';
import moment from "moment";
import TestName from '../Models/TestName.js';
import { Country, State, City } from 'country-state-city';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js"; // ✅ add `.js`
import path from 'path';
import csv from "csvtojson";
import { fileURLToPath } from "url";
import Razorpay from 'razorpay';

// ✅ Replace __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dayjs.extend(customParseFormat);






// Admin Signup
export const signupAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Create new admin
    const newAdmin = new Admin({
      name,
      email,
      password, // Store password directly (no hashing)
    });

    // Save admin to database
    await newAdmin.save();

    // Generate JWT token
    const token = generateToken(newAdmin._id);

    res.status(201).json({
      message: 'Admin created successfully',
      token,
      admin: {
        name: newAdmin.name,
        email: newAdmin.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Admin Login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Admin does not exist' });
    }

    // Check if password matches (no bcrypt, just direct comparison)
    if (admin.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(admin._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        adminId: admin._id,  // Added adminId
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Get Admin by ID (includes password)
export const getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Validate MongoDB ObjectId format
    if (!adminId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }

    const admin = await Admin.findById(adminId); // Includes password

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json({
      message: 'Admin fetched successfully',
      admin
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Update Admin by ID
export const updateAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, email, password } = req.body;

    // Validate ID format
    if (!adminId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update fields if provided
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password) admin.password = password; // NOTE: No bcrypt used (as per current system)

    await admin.save();

    res.status(200).json({
      message: 'Admin updated successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: admin.role,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// Admin Logout Controller
export const logoutAdmin = async (req, res) => {
  try {
    // Clear the JWT token cookie if it's stored in a cookie
    res.clearCookie('token', {
      httpOnly: true, // Prevents JavaScript access to the cookie
      secure: process.env.NODE_ENV === 'production', // Secure flag for production (HTTPS)
      sameSite: 'strict', // CSRF protection
    });

    // Send response indicating successful logout
    res.status(200).json({
      message: "Logout successful. Token cleared from cookies.",
    });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error });
  }
};


// Create Doctor Details
export const createDoctorDetails = async (req, res) => {
  try {
    const {
      name,
      category,  // category now instead of specialization
      contact_number,
      email,
      clinic_address,
      consultation_fee,
      available_days,
      working_hours,
      tests
    } = req.body;

    // Validate tests to ensure each test has price and offerPrice
    const validatedTests = tests.map(test => {
      if (!test.test_name || !test.description || !test.price) {
        throw new Error('Each test must have a name, description, and price');
      }
      // Ensure that offerPrice is always provided or defaults to the price
      test.offerPrice = test.offerPrice || test.price;
      return test;
    });

    // Create new doctor instance
    const newDoctor = new Doctor({
      name,
      category,  // Save category
      contact_number,
      email,
      clinic_address,
      consultation_fee,
      available_days,
      working_hours,
      tests: validatedTests  // Save tests with offerPrice
    });

    // Save doctor to MongoDB
    await newDoctor.save();

    res.status(201).json({
      message: 'Doctor details created successfully',
      doctor: newDoctor
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Get All Doctor Details with category "Diagnostic"
export const getDoctorDetails = async (req, res) => {
  try {
    // Fetch all doctors with category "Diagnostic"
    const doctors = await Doctor.find({ category: 'Diagnostic' });

    if (doctors.length === 0) {
      return res.status(404).json({ message: 'No doctor details available in the Diagnostic category.' });
    }

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



// Get the Most Recent Doctor Details
export const getRecentDoctorDetails = async (req, res) => {
  try {
    // Fetch the most recent doctor details (sorted by `createdAt` in descending order)
    const doctor = await Doctor.findOne().sort({ createdAt: -1 });

    if (!doctor) {
      return res.status(404).json({ message: 'No doctor details available.' });
    }

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



// Get only tests[] of a specific doctor
export const getDoctorTestsById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select('tests');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!doctor.tests || doctor.tests.length === 0) {
      return res.status(200).json({ message: 'No tests found for this doctor', tests: [] });
    }

    res.status(200).json({
      message: 'Tests fetched successfully',
      doctor_id: doctor._id,
      total_tests: doctor.tests.length,
      tests: doctor.tests
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


// Update Doctor Details
export const updateDoctorDetails = async (req, res) => {
  try {
    const {
      name,
      category,
      contact_number,
      email,
      clinic_address,
      consultation_fee,
      available_days,
      working_hours,
      tests
    } = req.body;

    // Find doctor by ID
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Update doctor details
    doctor.name = name || doctor.name;
    doctor.category = category || doctor.category;
    doctor.contact_number = contact_number || doctor.contact_number;
    doctor.email = email || doctor.email;
    doctor.clinic_address = clinic_address || doctor.clinic_address;
    doctor.consultation_fee = consultation_fee || doctor.consultation_fee;
    doctor.available_days = available_days || doctor.available_days;
    doctor.working_hours = working_hours || doctor.working_hours;
    doctor.tests = tests || doctor.tests;

    // Save updated doctor details
    await doctor.save();

    res.status(200).json({
      message: 'Doctor details updated successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};


export const createStaffProfile = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company ID format" });
    }

    uploadStaffImages(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message
        });
      }

      const {
        name,
        email,
        password,
        contact_number,
        address,
        dob,
        gender,
        age,
        department,
        designation,
        role,
      } = req.body;

      // 🔍 Check if staff exists
      const existingStaff = await Staff.findOne({ email });
      if (existingStaff) {
        return res.status(400).json({
          message: "Staff with this email already exists"
        });
      }

      // 📁 Uploaded Files
      const profileImage = req.files?.profileImage?.[0]
        ? `/uploads/staffimages/${req.files.profileImage[0].filename}`
        : null;

      const idImage = req.files?.idImage?.[0]
        ? `/uploads/staffimages/${req.files.idImage[0].filename}`
        : null;

      // 🧾 Create staff
      const staff = new Staff({
        name,
        email,
        password,
        contact_number,
        address,
        dob,
        gender,
        age,
        department,
        designation,
        role: role || "Staff",
        wallet_balance: 0,
        profileImage,
        idImage,
      });

      const savedStaff = await staff.save();

      // 📦 Full staff info to push in company
      const staffInfoForCompany = {
        _id: savedStaff._id,
        name: savedStaff.name,
        role: savedStaff.role,
        contact_number: savedStaff.contact_number, // ✅ ensure this field matches schema
        email: savedStaff.email,
        dob: savedStaff.dob,
        gender: savedStaff.gender,
        age: savedStaff.age,
        address: savedStaff.address,
        profileImage: savedStaff.profileImage,
        idImage: savedStaff.idImage,
        wallet_balance: savedStaff.wallet_balance,
        department: savedStaff.department,
        designation: savedStaff.designation,
      };

      // 🔗 Push to company
      const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        { $push: { staff: staffInfoForCompany } },
        { new: true }
      );

      if (!updatedCompany) {
        await Staff.findByIdAndDelete(savedStaff._id); // rollback
        return res.status(404).json({ message: "Company not found" });
      }

      res.status(201).json({
        message: "Staff created and linked to company successfully",
        staff: {
          id: savedStaff._id,
          name: savedStaff.name,
          email: savedStaff.email,
          role: savedStaff.role,
          department: savedStaff.department,
          designation: savedStaff.designation,
        },
        company: {
          id: updatedCompany._id,
          name: updatedCompany.name,
        },
      });
    });

  } catch (error) {
    console.error("❌ Staff creation error:", error);
    res.status(500).json({
      message: "Server error during staff creation",
      error: error.message,
    });
  }
};



export const editStaffProfile = async (req, res) => {
  const { staffId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ message: "Invalid staff ID format" });
  }

  try {
    const updatedFields = req.body; // Yeh saare fields dynamically handle karega

    // 1. Update the staff document directly
    await Staff.findByIdAndUpdate(staffId, updatedFields, {
      new: true,
      runValidators: true,
    });

    // 2. Re-fetch the updated staff
    const updatedStaff = await Staff.findById(staffId);

    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // 3. Dynamically build the $set object for Company.staff[]
    const companyUpdateFields = {};
    const allowedFields = ["name", "role", "contact_number", "email", "dob", "gender", "age", "address"];

    allowedFields.forEach((field) => {
      if (updatedFields[field] !== undefined) {
        const key = `staff.$.${field === "contact_number" ? "contact" : field}`;
        companyUpdateFields[key] = updatedFields[field];
      }
    });

    // 4. Update embedded staff inside company if any field matches
    if (Object.keys(companyUpdateFields).length > 0) {
      await Company.updateOne(
        { "staff._id": staffId },
        { $set: companyUpdateFields }
      );
    }

    res.status(200).json({
      message: "Staff profile updated successfully",
      updatedStaff,
    });

  } catch (error) {
    console.error("❌ Error updating staff:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




// 🗑️ Admin deleting a staff profile
export const deleteStaffProfile = async (req, res) => {
  const { staffId } = req.params;

  // 🔒 Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ message: "Invalid staff ID format" });
  }

  try {
    // 1. Delete staff from Staff collection
    const deletedStaff = await Staff.findByIdAndDelete(staffId);

    if (!deletedStaff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // 2. Remove staff from any company that has this staff linked
    await Company.updateMany(
      { "staff._id": staffId },
      { $pull: { staff: { _id: staffId } } }
    );

    res.status(200).json({
      message: "Staff deleted successfully",
      deletedStaff,
    });
  } catch (error) {
    console.error("❌ Error deleting staff:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//book a diagnostics


// export const createDiagnosticDetails = async (req, res) => {
//   try {
//     // 🧪 Step 1: Upload test images
//     uploadTestImages(req, res, async (testImageError) => {
//       if (testImageError) {
//         console.log("❌ Test image upload failed:", testImageError);
//         return res.status(400).json({ message: "Test image upload failed", error: testImageError.message });
//       }

//       try {
//         // ✅ Log incoming form data and files
//         console.log("📥 req.body:", req.body);  // Log the entire form data
//         console.log("📁 req.files:", req.files);  // Log uploaded files

//         // Parse individual fields from the flat req.body
//         const {
//           name,
//           image,
//           address,
//           centerType,
//           email,
//           phone,
//           gstNumber,
//           centerStrength,
//           country,
//           state,
//           city,
//           pincode,
//           password,
//         } = req.body;

//         // Parse contact persons and tests from flat fields in req.body
//         const contactPersons = [];
//         const tests = [];

//         // Loop through the flat fields to extract contactPersons and tests
//         Object.keys(req.body).forEach((key) => {
//           if (key.startsWith("contactPersons")) {
//             const index = key.match(/\d+/)[0]; // Extract index (e.g., '0' from 'contactPersons[0].name')
//             const field = key.split(".")[1]; // Extract field name (e.g., 'name', 'designation')

//             if (!contactPersons[index]) {
//               contactPersons[index] = {}; // Initialize contact person object if not already created
//             }
//             contactPersons[index][field] = req.body[key]; // Add the field to the respective contact person object
//           }

//           if (key.startsWith("tests")) {
//             const index = key.match(/\d+/)[0]; // Extract index (e.g., '0' from 'tests[0].test_name')
//             const field = key.split(".")[1]; // Extract field name (e.g., 'test_name', 'description')

//             if (!tests[index]) {
//               tests[index] = {}; // Initialize test object if not already created
//             }
//             tests[index][field] = req.body[key]; // Add the field to the respective test object
//           }
//         });

//         // 🧪 Attach uploaded test images to the tests
//         if (req.file) {
//           tests.forEach((test, index) => {
//             test.image = req.file.path || null; // Attach image path if file exists
//           });
//         }

//         console.log("Contact Persons:", contactPersons);
//         console.log("Tests:", tests);

//         // 🏥 Create Diagnostic center object
//         const newDiagnostic = new Diagnostic({
//           name,
//           image,  // Assuming this is the company image or other image field
//           address,
//           centerType,
//           email,
//           phone,
//           gstNumber,
//           centerStrength,
//           country,
//           state,
//           city,
//           pincode,
//           contactPersons: contactPersons || [], // Ensure it's an array
//           password,
//           tests: tests || [], // Ensure it's an array
//           testImages: req.files ? req.files.map((file) => file.path) : [], // Save test image path if present
//         });

//         await newDiagnostic.save();

//         console.log("✅ Diagnostic center saved:", newDiagnostic);

//         res.status(201).json({
//           message: "Diagnostic center created successfully",
//           diagnostic: newDiagnostic,
//         });
//       } catch (err) {
//         console.error("💥 Error while processing form data:", err);
//         res.status(500).json({ message: "Server error", error: err.message });
//       }
//     });
//   } catch (error) {
//     console.error("🔥 Unexpected error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };




// Create Diagnostic Center function
export const createDiagnosticDetails = async (req, res) => {
  try {
    // Incoming JSON data logging
    console.log("📥 Incoming JSON data:", req.body);

    // Extract data directly from req.body
    const {
      name,
      image,
      address,
      centerType,
      email,
      phone,
      gstNumber,
      centerStrength,
      country,
      state,
      city,
      pincode,
      password,
      contactPersons,
      tests,
      packages
    } = req.body;

    // 🧪 Create the Diagnostic center object
    const newDiagnostic = new Diagnostic({
      name,
      image,
      address,
      centerType,
      email,
      phone,
      gstNumber,
      centerStrength,
      country,
      state,
      city,
      pincode,
      password,
      contactPersons: contactPersons || [],
      tests: tests || [],
      packages: packages || [],
      documents: req.files ? req.files.map((file) => file.path) : [],
    });

    // Save the new diagnostic center to the database
    await newDiagnostic.save();

    console.log("✅ Diagnostic center created successfully:", newDiagnostic);

    res.status(201).json({
      message: "Diagnostic center created successfully",
      diagnostic: newDiagnostic,
    });

  } catch (error) {
    console.error("🔥 Error while creating diagnostic center:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Assign Diagnostic and Package to Staff function
export const assignDiagnosticAndPackageToStaff = async (req, res) => {
  const { staffId, diagnosticId, packageId } = req.body;  // Staff ID, Diagnostic Center ID, Package ID from request body

  try {
    // Find the staff by ID
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Check if the diagnostic center exists
    const diagnosticCenter = await Diagnostic.findById(diagnosticId);
    if (!diagnosticCenter) {
      return res.status(404).json({ message: "Diagnostic center not found" });
    }

    // Check if the package exists
    const packageExists = await Package.findById(packageId);
    if (!packageExists) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Assign the diagnostic center and package to the staff
    staff.diagnosticId = diagnosticId;
    staff.packageId = packageId;

    // Save the staff data with the updated assignment
    await staff.save();

    res.status(200).json({
      message: "Diagnostic center and package assigned successfully to staff",
      staff,
    });
  } catch (error) {
    console.error("Error assigning diagnostic center and package to staff:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const updateDiagnosticDetails = async (req, res) => {
    try {
   

    const { id } = req.params;
    const updateData = req.body;

    // Validate that we're not trying to update protected fields
    const protectedFields = ['_id', 'createdAt', 'updatedAt', '__v'];
    protectedFields.forEach(field => delete updateData[field]);

    // Handle slots separately if needed
    if (updateData.homeCollectionSlots) {
      updateData.homeCollectionSlots = updateData.homeCollectionSlots.map(slot => ({
        ...slot,
        type: 'Home Collection'
      }));
    }

    if (updateData.centerVisitSlots) {
      updateData.centerVisitSlots = updateData.centerVisitSlots.map(slot => ({
        ...slot,
        type: 'Center Visit'
      }));
    }

    // Update diagnostic center
    const updatedDiagnostic = await Diagnostic.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedDiagnostic) {
      return res.status(404).json({ message: 'Diagnostic center not found' });
    }

    res.json({
      message: 'Diagnostic center updated successfully',
      data: updatedDiagnostic
    });

  } catch (error) {
    console.error('Error updating diagnostic center:', error);
    res.status(500).json({ 
      message: 'Error updating diagnostic center',
      error: error.message 
    });
  }
};



export const deleteDiagnosticCenter = async (req, res) => {
  const { diagnosticId } = req.params;

  // ✅ Validate diagnosticId
  if (!mongoose.Types.ObjectId.isValid(diagnosticId)) {
    return res.status(400).json({ message: "Invalid Diagnostic Center ID" });
  }

  try {
    // 🔍 Step 1: Find diagnostic center
    const diagnostic = await Diagnostic.findById(diagnosticId);

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic Center not found" });
    }

    // 🧹 Step 2: Delete associated test images from disk (if any)
    if (diagnostic.testImages && diagnostic.testImages.length > 0) {
      diagnostic.testImages.forEach((imgPath) => {
        const fullPath = path.resolve(imgPath);
        fs.unlink(fullPath, (err) => {
          if (err) {
            console.warn("⚠️ Could not delete file:", fullPath);
          } else {
            console.log("🗑️ Deleted test image:", fullPath);
          }
        });
      });
    }

    // 🗑️ Step 3: Delete the diagnostic document
    await Diagnostic.findByIdAndDelete(diagnosticId);

    res.status(200).json({
      message: "Diagnostic Center deleted successfully",
      deletedId: diagnosticId,
    });
  } catch (error) {
    console.error("❌ Error deleting diagnostic center:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// // Get all Diagnostic Centers
// export const getAllDiagnostics = async (req, res) => {
//     try {
//         const diagnostics = await Diagnostic.find(); // Fetch all diagnostic centers

//         if (diagnostics.length === 0) {
//             return res.status(404).json({ message: 'No diagnostic centers found' });
//         }

//         res.status(200).json({
//             message: 'Diagnostic centers retrieved successfully',
//             diagnostics
//         });
//     } catch (error) {
//         console.error('Error fetching diagnostic centers:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


// // Get a Specific Diagnostic Center by diagnosticId (Including tests)
// export const getDiagnosticById = async (req, res) => {
//     try {
//         const diagnostic = await Diagnostic.findById(req.params.diagnosticId); // Fetch diagnostic by diagnosticId

//         if (!diagnostic) {
//             return res.status(404).json({ message: 'Diagnostic center not found' });
//         }

//         res.status(200).json({
//             message: 'Diagnostic center retrieved successfully',
//             diagnostic
//         });
//     } catch (error) {
//         console.error('Error fetching diagnostic center:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


// // Get all Tests and Packages from a Specific Diagnostic Center by diagnosticId
// export const getAllTests = async (req, res) => {
//   try {
//       const { diagnosticId } = req.params; // Extract diagnosticId from the URL params

//       // Fetch the diagnostic center by its ID
//       const diagnostic = await Diagnostic.findById(diagnosticId);

//       if (!diagnostic) {
//           return res.status(404).json({ message: 'Diagnostic center not found' });
//       }

//       // Return the tests and packages associated with this specific diagnostic center
//       res.status(200).json({
//           message: 'Tests and packages retrieved successfully',
//           tests: diagnostic.tests, // The array of tests directly under the diagnostic center
//           packages: diagnostic.packages // The array of packages associated with the diagnostic center
//       });
//   } catch (error) {
//       console.error('Error fetching tests and packages:', error);
//       res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };





// // Update Diagnostic Center and its Tests
// export const updateDiagnosticDetails = async (req, res) => {
//     try {
//         const { diagnosticId } = req.params;  // Get diagnosticId from the URL
//         const { name, image, address, tests } = req.body;

//         // Find the diagnostic center by its ID
//         const diagnostic = await Diagnostic.findById(diagnosticId);
//         if (!diagnostic) {
//             return res.status(404).json({ message: 'Diagnostic center not found' });
//         }

//         // Validate tests to ensure each test has all necessary fields
//         const validatedTests = tests.map(test => {
//             if (!test.test_name || !test.description || !test.price) {
//                 throw new Error('Each test must have a name, description, and price');
//             }
//             // Ensure offerPrice is always provided or defaults to price
//             test.offerPrice = test.offerPrice || test.price;
//             return test;
//         });

//         // Update the diagnostic center fields
//         diagnostic.name = name || diagnostic.name;
//         diagnostic.image = image || diagnostic.image;
//         diagnostic.address = address || diagnostic.address;
//         diagnostic.tests = validatedTests || diagnostic.tests;

//         // Save the updated diagnostic center to the database
//         await diagnostic.save();

//         // Send the response back with updated diagnostic center details
//         res.status(200).json({
//             message: 'Diagnostic center updated successfully',
//             diagnostic
//         });
//     } catch (error) {
//         console.error('Error updating diagnostic details:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };


// Delete a Diagnostic Center
export const deleteDiagnosticDetails = async (req, res) => {
  try {
    const { diagnosticId } = req.params;  // Get diagnosticId from the URL

    // Find and delete the diagnostic center by its ID
    const diagnostic = await Diagnostic.findByIdAndDelete(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: 'Diagnostic center not found' });
    }

    // Send the response back confirming the deletion
    res.status(200).json({
      message: 'Diagnostic center deleted successfully',
      diagnostic
    });
  } catch (error) {
    console.error('Error deleting diagnostic details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addAmountToWallet = async (req, res) => {
  try {
    const { staffId, companyId } = req.params;
    const { forTests = 0, forDoctors = 0, forPackages = 0, from = "Admin" } = req.body;

    const totalAmount = forTests + forDoctors + forPackages;

    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // ✅ Step 1: Validate company
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // ✅ Step 2: Find staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // ✅ Step 3: Update wallet values
    staff.wallet_balance += totalAmount;
    staff.forTests += forTests;
    staff.forDoctors += forDoctors;
    staff.forPackages += forPackages;
    staff.totalAmount = staff.forTests + staff.forDoctors + staff.forPackages;

    // ✅ Step 4: Add wallet log (AFTER updating totals)
    staff.wallet_logs.push({
      type: "credit",
      forTests,
      forDoctors,
      forPackages,
      totalAmount,
      from
    });

    await staff.save();

    return res.status(200).json({
      message: "Amount added to wallet successfully",
      wallet_balance: staff.wallet_balance,
      forTests: staff.forTests,
      forDoctors: staff.forDoctors,
      forPackages: staff.forPackages,
      totalAmount: staff.totalAmount,
      latestLog: staff.wallet_logs.at(-1)
    });

  } catch (error) {
    console.error("Error in addAmountToWallet:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};




export const createDoctor = async (req, res) => {
  try {
    uploadDoctorImage(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: 'Error uploading files', error: err.message });
      }

      const {
        name,
        email,
        password,
        specialization,
        qualification,
        description,
        consultation_fee,
        address,
        category,
        consultation_type,
        onlineSlots,
        offlineSlots,
      } = req.body;

      const validTypes = ['Online', 'Offline', 'Chat', 'Both'];
      if (!validTypes.includes(consultation_type)) {
        return res.status(400).json({ message: 'Invalid consultation type' });
      }

      const image = req.files?.image?.[0]
        ? `/uploads/doctorimages/${req.files.image[0].filename}`
        : null;

      const documents = req.files?.documents?.map((doc) => `/uploads/doctorimages/${doc.filename}`) || [];

      // 🧠 Parse slots from stringified JSON (Postman form-data)
      let parsedOnlineSlots = [];
      let parsedOfflineSlots = [];

      try {
        if (consultation_type === 'Online' || consultation_type === 'Both') {
          parsedOnlineSlots = onlineSlots ? JSON.parse(onlineSlots) : [];
        }

        if (consultation_type === 'Offline' || consultation_type === 'Both') {
          parsedOfflineSlots = offlineSlots ? JSON.parse(offlineSlots) : [];
        }
      } catch (err) {
        return res.status(400).json({ message: 'Invalid slot JSON format', error: err.message });
      }

      const doctor = new Doctor({
        name,
        email,
        password,
        specialization,
        qualification,
        description,
        consultation_fee,
        address,
        image,
        documents,
        category,
        consultation_type,
        onlineSlots: parsedOnlineSlots,
        offlineSlots: parsedOfflineSlots,
      });

      await doctor.save();

      res.status(201).json({ message: 'Doctor created successfully', doctor });
    });
  } catch (error) {
    console.error('❌ Error creating doctor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const updateDoctors = async (req, res) => {
  try {
    uploadDoctorImage(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: 'Error uploading files', error: err.message });
      }

      const {
        name,
        email,
        password,
        specialization,
        qualification,
        description,
        consultation_fee,
        address,
        category,
        consultation_type,
        onlineSlots,
        offlineSlots,
      } = req.body;

      const doctorId = req.params.doctorId;

      const validTypes = ['Online', 'Offline', 'Chat', 'Both'];
      if (consultation_type && !validTypes.includes(consultation_type)) {
        return res.status(400).json({ message: 'Invalid consultation type' });
      }

      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      if (req.files?.image?.[0]) {
        doctor.image = `/uploads/doctorimages/${req.files.image[0].filename}`;
      }

      if (req.files?.documents && req.files.documents.length > 0) {
        doctor.documents = req.files.documents.map(doc => `/uploads/doctorimages/${doc.filename}`);
      }

      try {
        if (onlineSlots !== undefined) {
          doctor.onlineSlots = onlineSlots ? JSON.parse(onlineSlots) : [];
        }

        if (offlineSlots !== undefined) {
          doctor.offlineSlots = offlineSlots ? JSON.parse(offlineSlots) : [];
        }
      } catch (parseErr) {
        return res.status(400).json({ message: 'Invalid slot JSON format', error: parseErr.message });
      }

      // Update only if values provided
      if (name) doctor.name = name;
      if (email) doctor.email = email;
      if (password) doctor.password = password;
      if (specialization) doctor.specialization = specialization;
      if (qualification) doctor.qualification = qualification;
      if (description) doctor.description = description;
      if (consultation_fee) doctor.consultation_fee = consultation_fee;
      if (address) doctor.address = address;
      if (category) doctor.category = category;
      if (consultation_type) doctor.consultation_type = consultation_type;

      await doctor.save();

      res.status(200).json({ message: 'Doctor updated successfully', doctor });
    });
  } catch (error) {
    console.error('❌ Error updating doctor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const deleteSlotFromDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { slotType, day, date, timeSlot } = req.body;

    if (!['online', 'offline'].includes(slotType)) {
      return res.status(400).json({ message: "slotType must be 'online' or 'offline'." });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const field = slotType === 'online' ? 'onlineSlots' : 'offlineSlots';

    const originalLength = doctor[field].length;

    doctor[field] = doctor[field].filter(slot =>
      !(slot.day === day && slot.date === date && slot.timeSlot === timeSlot)
    );

    if (doctor[field].length === originalLength) {
      return res.status(404).json({ message: "No matching slot found to delete." });
    }

    await doctor.save();

    return res.status(200).json({ message: "Slot deleted successfully.", doctor });
  } catch (error) {
    console.error("❌ Error deleting slot:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const addSlotToDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { slotType, day, date, timeSlot, isBooked = false } = req.body;

    if (!doctorId || !slotType || !day || !date || !timeSlot) {
      return res.status(400).json({
        message: "doctorId, slotType, day, date, and timeSlot are required.",
      });
    }

    if (!['online', 'offline'].includes(slotType)) {
      return res.status(400).json({ message: "slotType must be 'online' or 'offline'." });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const field = slotType === 'online' ? 'onlineSlots' : 'offlineSlots';

    // Check for duplicate
    const slotExists = doctor[field].some(slot =>
      slot.day === day && slot.date === date && slot.timeSlot === timeSlot
    );

    if (slotExists) {
      return res.status(409).json({ message: "Slot already exists." });
    }

    doctor[field].push({
      day,
      date,
      timeSlot,
      isBooked,
    });

    await doctor.save();

    res.status(200).json({
      message: "Slot added successfully.",
      doctor,
    });
  } catch (error) {
    console.error("❌ Error adding slot:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};







export const getAllDoctors = async (req, res) => {
  try {
    const { categories } = req.query;

    const filter = {};

    // Filter by categories if provided
    if (categories) {
      filter.category = { $in: categories.split(',') };
    }

    const doctors = await Doctor.find(filter).sort({ createdAt: -1 });

    if (!doctors.length) {
      return res.status(404).json({ message: 'No doctors found for the selected category' });
    }

    const now = moment();

    const normalizeTimeSlot = (timeSlot) => {
      if (!timeSlot) return '';
      const trimmed = timeSlot.trim().toUpperCase();

      // If it's purely numeric with colon and ends with AM/PM, add space
      if (/^\d{1,2}:\d{2}[AP]M$/.test(trimmed)) {
        return trimmed.replace(/([0-9])([AP]M)$/, '$1 $2');
      }

      return trimmed;
    };

    const filterFutureSlots = (slots) => {
      return (slots || []).filter(slot => {
        const time = normalizeTimeSlot(slot.timeSlot);
        const dateTime = moment(`${slot.date} ${time}`, [
          'YYYY-MM-DD HH:mm',
          'YYYY-MM-DD H:mm',
          'YYYY-MM-DD h:mm A',
          'YYYY-MM-DD h:mmA',     // fallback
          'YYYY-MM-DD h:mm A'
        ]);

        return dateTime.isValid() && dateTime.isSameOrAfter(now);
      });
    };

    const filteredDoctors = doctors.map(doctor => {
      const docObj = doctor.toObject();

      return {
        ...docObj,
        onlineSlots: filterFutureSlots(docObj.onlineSlots),
        offlineSlots: filterFutureSlots(docObj.offlineSlots),
      };
    });

    res.status(200).json(filteredDoctors);

  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Get doctor by ID and populate myBlogs
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('myBlogs');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const now = moment();

    // Helper to filter future slots
    const filterFutureSlots = (slots) => {
      return slots.filter(slot => {
        const slotDateTime = moment(`${slot.date} ${slot.timeSlot}`, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD h:mm A', 'YYYY-MM-DD H:mm']);
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    const filteredDoctor = {
      ...doctor.toObject(),
      onlineSlots: filterFutureSlots(doctor.onlineSlots),
      offlineSlots: filterFutureSlots(doctor.offlineSlots)
    };

    res.status(200).json(filteredDoctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const getDoctorSlotsByDate = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, type } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required in query params" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const formattedDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");
    const now = moment();

    let slots = [];

    if (type === "online") {
      slots = doctor.onlineSlots || [];
    } else if (type === "offline") {
      slots = doctor.offlineSlots || [];
    } else {
      slots = [...(doctor.onlineSlots || []), ...(doctor.offlineSlots || [])];
    }

    // ✅ Filter + convert each slot to plain JS object + add isExpired
    const filteredSlots = (slots || [])
      .filter(slot => slot.date === formattedDate)
      .map(slotDoc => {
        const slot = typeof slotDoc.toObject === 'function' ? slotDoc.toObject() : slotDoc;
        const slotDateTime = moment(`${slot.date} ${slot.timeSlot}`, [
          "YYYY-MM-DD HH:mm",
          "YYYY-MM-DD H:mm",
          "YYYY-MM-DD h:mm A"
        ]);

        return {
          ...slot,
          isExpired: !slotDateTime.isValid() || slotDateTime.isBefore(now)
        };
      });

    if (filteredSlots.length === 0) {
      const availableDates = slots.map(slot => slot.date).filter(Boolean);
      return res.status(404).json({
        message: "No valid slots found for the given date",
        availableDates: availableDates.length > 0 ? availableDates : ["No available dates found"]
      });
    }

    return res.status(200).json({
      date: formattedDate,
      slots: filteredSlots
    });

  } catch (error) {
    console.error("❌ Error in getDoctorSlotsByDate:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    uploadDoctorImage(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: 'Error uploading image', error: err.message });
      }

      const {
        name,
        email,
        password,
        specialization,
        qualification,
        description,
        consultation_fee,
        address,
        category,
        consultation_type,
        schedule
      } = req.body;


      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found.' });
      }

      const parsedSchedule = schedule ? JSON.parse(schedule) : doctor.schedule;
      const image = req.file ? `/uploads/doctorimages/${req.file.filename}` : doctor.image;

      // Update fields (fallback to current if not provided)
      doctor.name = name || doctor.name;
      doctor.email = email || doctor.email;
      doctor.password = password || doctor.password;
      doctor.specialization = specialization || doctor.specialization;
      doctor.qualification = qualification || doctor.qualification;
      doctor.description = description || doctor.description;
      doctor.consultation_fee = consultation_fee || doctor.consultation_fee;
      doctor.address = address || doctor.address;
      doctor.category = category || doctor.category;
      doctor.consultation_type = consultation_type || doctor.consultation_type;
      doctor.schedule = parsedSchedule;
      doctor.image = image;

      await doctor.save();

      res.status(200).json({
        message: 'Doctor details updated successfully',
        doctor
      });
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete doctor
export const deleteDoctor = async (req, res) => {
  try {
    const deletedDoctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!deletedDoctor) return res.status(404).json({ message: 'Doctor not found' });
    res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Controller to get all diagnostic bookings with optional status filter
export const getAllDiagnosticBookings = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    // 1. Find all bookings for the staff member
    const bookings = await Booking.find({ staffId })
      .populate({
        path: "diagnosticId", // Full diagnostic details
      })
      .populate("familyMemberId", "name relation age gender")
      .populate("cartId")
      .populate("packageId", "name price description totalTestsIncluded")
      .lean();

    // 2. Populate cart items (tests/xrays)
    const bookingPromises = bookings.map(async (booking) => {
      if (booking.cartId?.items?.length) {
        const populatedItems = await Promise.all(
          booking.cartId.items.map(async (item) => {
            let details = null;
            if (item.type === "xray") {
              details = await Xray.findById(item.itemId).lean();
            } else if (item.type === "test") {
              details = await Test.findById(item.itemId).lean();
            }
            return { ...item, itemDetails: details || null };
          })
        );
        booking.cartId.items = populatedItems;
      }

      return booking;
    });

    const finalBookings = await Promise.all(bookingPromises);

    return res.status(200).json({
      success: true,
      bookings: finalBookings,
    });
  } catch (err) {
    console.error("❌ Error fetching diagnostic bookings:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const getAllDiagnosticBookingsForAdmin = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { diagnosticBookingId: { $exists: true } },
        { packageId: { $exists: true } }
      ]
    })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .populate({
        path: 'diagnosticId',
        select: 'name image address'
      })
      .populate({
        path: 'familyMemberId',
        select: 'name age gender'
      })
      .select(
        'diagnosticBookingId packageId diagnosticId staffId familyMemberId date timeSlot serviceType totalPrice discount payableAmount status report_file diagPrescription createdAt'
      )
      .sort({ createdAt: -1 });

    const formattedAppointments = bookings.map((booking) => ({
      appointmentId: booking._id,
      diagnosticBookingId: booking.diagnosticBookingId || null,
      packageId: booking.packageId || null,
      diagnosticId: booking.diagnosticId?._id || null, // ✅ Show the diagnostic center ID
      diagnostic_name: booking.diagnosticId?.name || '',
      diagnostic_image: booking.diagnosticId?.image || '',
      diagnostic_address: booking.diagnosticId?.address || '',
      staff_name: booking.staffId?.name || '',
      family_member: {
        name: booking.familyMemberId?.name || '',
        age: booking.familyMemberId?.age || '',
        gender: booking.familyMemberId?.gender || ''
      },
      service_type: booking.serviceType,
      appointment_date: booking.date,
      time_slot: booking.timeSlot === "null" ? null : booking.timeSlot,
      total_price: booking.totalPrice,
      discount: booking.discount,
      payable_amount: booking.payableAmount,
      status: booking.status,
      report_file: booking.report_file,
      diagPrescription: booking.diagPrescription,
      createdAt: booking.createdAt
    }));

    return res.status(200).json({
      message: 'All diagnostic & package appointments fetched successfully',
      appointments: formattedAppointments
    });

  } catch (error) {
    console.error('❌ Error fetching diagnostic/package appointments:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};



export const getDiagnosticBookingsByDiagnosticId = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: "diagnosticId param is required" });
    }

    const bookings = await Booking.find({
      diagnosticBookingId: { $exists: true },
      diagnosticId: diagnosticId,
    })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .populate({
        path: 'diagnosticId',
        select: 'name image address'
      })
      .populate({
        path: 'familyMemberId',
        select: 'name age gender'
      })
      .select(
        'diagnosticBookingId diagnosticId staffId familyMemberId date timeSlot serviceType totalPrice discount payableAmount status report_file diagPrescription createdAt'
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Diagnostic appointments fetched successfully',
      appointments: bookings.map((booking) => ({
        appointmentId: booking._id,
        diagnosticBookingId: booking.diagnosticBookingId,
        diagnostic_name: booking.diagnosticId?.name || '',
        diagnostic_image: booking.diagnosticId?.image || '',
        diagnostic_address: booking.diagnosticId?.address || '',
        staff_name: booking.staffId?.name || '',
        family_member: {
          name: booking.familyMemberId?.name || '',
          age: booking.familyMemberId?.age || '',
          gender: booking.familyMemberId?.gender || ''
        },
        service_type: booking.serviceType,
        appointment_date: booking.date,
        time_slot: booking.timeSlot,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        status: booking.status,
        report_file: booking.report_file,
        diagPrescription: booking.diagPrescription,
        createdAt: booking.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching diagnostic appointments by diagnosticId:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};




// Controller to get a single diagnostic booking (Admin - enhanced details with staff info)
// Controller to get a single diagnostic booking (Admin - enhanced details with staff info)
export const getSingleDiagnosticBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("diagnosticId")
      .populate("familyMemberId", "name relation age gender")
      .populate("cartId")
      .populate("packageId", "name price description totalTestsIncluded")
      .populate("staffId", "name email contact_number")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Populate cart item details
    if (booking.cartId?.items?.length) {
      const populatedItems = await Promise.all(
        booking.cartId.items.map(async (item) => {
          let details = null;
          if (item.type === "xray") {
            details = await Xray.findById(item.itemId).lean();
          } else if (item.type === "test") {
            details = await Test.findById(item.itemId).lean();
          }
          return { ...item, itemDetails: details || null };
        })
      );
      booking.cartId.items = populatedItems;
    }

    // ✅ Final structured object with reportFile and diagPrescription
   const bookingDetails = {
  bookingId: booking._id,
  diagnosticBookingId: booking.diagnosticBookingId || "", // ✅ Added this line
  serviceType: booking.serviceType || "",
  status: booking.status,
  date: booking.date,
  timeSlot: booking.timeSlot,
  totalPrice: booking.totalPrice,
  discount: booking.discount,
  payableAmount: booking.payableAmount,
  transactionId: booking.transactionId,
  paymentStatus: booking.paymentStatus,

  diagnostic: booking.diagnosticId
    ? {
        name: booking.diagnosticId.name,
        description: booking.diagnosticId.description,
        image: booking.diagnosticId.image,
        homeCollection: booking.diagnosticId.homeCollection,
        centerVisit: booking.diagnosticId.centerVisit,
        pincode: booking.diagnosticId.pincode,
        contactPerson: booking.diagnosticId.contactPersons?.[0] || null, // ✅ added
      }
    : null,

  package: booking.packageId || null,

  patient: booking.familyMemberId
    ? {
        name: booking.familyMemberId.name,
        relation: booking.familyMemberId.relation,
        age: booking.familyMemberId.age,
        gender: booking.familyMemberId.gender,
      }
    : null,

  staff: booking.staffId
    ? {
        name: booking.staffId.name,
        email: booking.staffId.email,
        contact_number: booking.staffId.contact_number,
      }
    : null,

  cartItems: booking.cartId?.items || [],

  reportFile: booking.report_file || null,
  diagPrescription: booking.diagPrescription || null,
};

    return res.status(200).json({
      success: true,
      booking: bookingDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching single diagnostic booking (Admin):", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// Controller to get bookings for a specific diagnostic center
export const getBookingsByDiagnosticId = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: 'Diagnostic ID is required' });
    }

    const { status } = req.body; // Optional status filter

    // 1. Find bookings for the specific diagnostic center
    const bookings = await Booking.find({ diagnostic: diagnosticId })
      .populate('staff')
      .populate('diagnostic')
      .populate({
        path: 'diagnostic.tests',
        select: 'test_name price offerPrice description image'
      });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this diagnostic center' });
    }

    // 2. Apply status filter if provided
    const filteredBookings = status
      ? bookings.filter((booking) => booking.status === status)
      : bookings;

    // 3. Format data
    const bookingDetails = filteredBookings.map((booking) => ({
      bookingId: booking._id,
      patient_name: booking.patient_name,
      patient_age: booking.age,
      patient_gender: booking.gender,
      staff_name: booking.staff ? booking.staff.name : 'N/A',
      diagnostic_name: booking.diagnostic ? booking.diagnostic.name : 'N/A',
      diagnostic_image: booking.diagnostic?.image || '',
      diagnostic_address: booking.diagnostic?.address || '',
      consultation_fee: booking.consultation_fee || 0,
      tests: booking.diagnostic?.tests?.map(test => ({
        test_name: test.test_name,
        price: test.price,
        offerPrice: test.offerPrice || test.price,
        description: test.description,
        image: test.image
      })) || [],
      appointment_date: booking.appointment_date,
      gender: booking.gender,
      age: booking.age,
      subtotal: booking.subtotal,
      gst_on_tests: booking.gst_on_tests,
      gst_on_consultation: booking.gst_on_consultation,
      total: booking.total,
      status: booking.status
    }));

    res.status(200).json({
      message: 'Bookings fetched successfully',
      bookings: bookingDetails
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Controller to delete a specific booking
export const deleteBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.status(200).json({
      message: 'Booking deleted successfully',
      deletedBookingId: deletedBooking._id,
    });
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const getAllDoctorAppointments = async (req, res) => {
  try {
    // Fetch all bookings sorted by latest first
    const bookings = await Booking.find()
      .populate({
        path: 'doctorId',
        select: 'name specialization image'
      })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .select('doctorId staffId familyMemberId bookedSlot totalPrice status meetingLink type discount payableAmount createdAt doctorConsultationBookingId')
      .sort({ createdAt: -1 });

    // ✅ Filter out bookings with null doctorId
    const validBookings = bookings.filter(b => b.doctorId);

    res.status(200).json({
      message: 'All doctor consultations fetched successfully',
      appointments: validBookings.map((booking) => ({
        appointmentId: booking._id,
        doctor_name: booking.doctorId?.name,
        doctor_specialization: booking.doctorId?.specialization,
        doctor_image: booking.doctorId?.image,
        staff_name: booking.staffId?.name,
        appointment_date: booking.bookedSlot?.date,
        time_slot: booking.bookedSlot?.timeSlot,
        status: booking.status,
        meeting_link: booking.meetingLink,
        consultation_type: booking.type,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        doctorConsultationBookingId: booking.doctorConsultationBookingId,
        createdAt: booking.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching doctor consultations:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};




export const getAcceptedDoctorAppointments = async (req, res) => {
  try {
    const acceptedBookings = await Booking.find({ status: "Accepted" })
      .populate({
        path: 'doctorId',
        select: 'name specialization image'
      })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .select('doctorId staffId familyMemberId bookedSlot totalPrice status meetingLink type discount payableAmount createdAt');

    res.status(200).json({
      message: 'Accepted doctor consultations fetched successfully',
      appointments: acceptedBookings.map((booking) => ({
        appointmentId: booking._id,
        doctor: {
          name: booking.doctorId?.name || null,
          specialization: booking.doctorId?.specialization || null,
          image: booking.doctorId?.image || null,
        },
        staff_name: booking.staffId?.name || null,
        appointment_date: booking.bookedSlot?.date || null,
        time_slot: booking.bookedSlot?.timeSlot || null,
        status: booking.status,
        meeting_link: booking.meetingLink,
        consultation_type: booking.type,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        createdAt: booking.createdAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching accepted doctor consultations:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};



export const getRejectedDoctorAppointments = async (req, res) => {
  try {
    const rejectedBookings = await Booking.find({ status: "Rejected" })
      .populate({
        path: 'doctorId',
        select: 'name specialization image'
      })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .select('doctorId staffId familyMemberId bookedSlot totalPrice status meetingLink type discount payableAmount createdAt');

    res.status(200).json({
      message: 'Rejected doctor consultations fetched successfully',
      appointments: rejectedBookings.map((booking) => ({
        appointmentId: booking._id,
        doctor: {
          name: booking.doctorId?.name || null,
          specialization: booking.doctorId?.specialization || null,
          image: booking.doctorId?.image || null,
        },
        staff_name: booking.staffId?.name || null,
        appointment_date: booking.bookedSlot?.date || null,
        time_slot: booking.bookedSlot?.timeSlot || null,
        status: booking.status,
        meeting_link: booking.meetingLink,
        consultation_type: booking.type,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        createdAt: booking.createdAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching rejected doctor consultations:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};



export const getAcceptedDiagnosticAppointments = async (req, res) => {
  try {
    const acceptedDiagnostics = await Booking.find({
      status: { $regex: /^accepted$/i } // case-insensitive match
    })
      .populate({
        path: 'diagnosticId',
        select: 'name image specialization'
      })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .populate({
        path: 'packageId',
        select: 'title testsIncluded price'
      })
      .select('diagnosticId staffId packageId familyMemberId serviceType date timeSlot totalPrice discount payableAmount status createdAt');

    res.status(200).json({
      message: 'Accepted diagnostic appointments fetched successfully',
      appointments: acceptedDiagnostics.map((item) => ({
        appointmentId: item._id,
        diagnostic: {
          id: item.diagnosticId?._id || null, // ✅ Add diagnosticId here
          name: item.diagnosticId?.name || null,
          image: item.diagnosticId?.image || null,
          specialization: item.diagnosticId?.specialization || null,
        },
        staff_name: item.staffId?.name || null,
        service_type: item.serviceType,
        package: {
          title: item.packageId?.title || null,
          testsIncluded: item.packageId?.testsIncluded || [],
          price: item.packageId?.price || null
        },
        date: item.date,
        time_slot: item.timeSlot,
        total_price: item.totalPrice,
        discount: item.discount,
        payable_amount: item.payableAmount,
        status: item.status,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching accepted diagnostic appointments:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};



export const getRejectedDiagnosticAppointments = async (req, res) => {
  try {
    const rejectedDiagnostics = await Booking.find({
      status: { $regex: /^rejected$/i } // case-insensitive match
    })
      .populate({
        path: 'diagnosticId',
        select: 'name image specialization'
      })
      .populate({
        path: 'staffId',
        select: 'name'
      })
      .populate({
        path: 'packageId',
        select: 'title testsIncluded price'
      })
      .select('diagnosticId staffId packageId familyMemberId serviceType date timeSlot totalPrice discount payableAmount status createdAt');

    res.status(200).json({
      message: 'Rejected diagnostic appointments fetched successfully',
      appointments: rejectedDiagnostics.map((item) => ({
        appointmentId: item._id,
        diagnostic: {
          id: item.diagnosticId?._id || null,
          name: item.diagnosticId?.name || null,
          image: item.diagnosticId?.image || null,
          specialization: item.diagnosticId?.specialization || null
        },
        staff_name: item.staffId?.name || null,
        service_type: item.serviceType,
        package: {
          title: item.packageId?.title || null,
          testsIncluded: item.packageId?.testsIncluded || [],
          price: item.packageId?.price || null
        },
        date: item.date,
        time_slot: item.timeSlot,
        total_price: item.totalPrice,
        discount: item.discount,
        payable_amount: item.payableAmount,
        status: item.status,
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching rejected diagnostic appointments:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};



// Update appointment status
export const updateDoctorAppointmentStatus = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const { status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({ message: "bookingId and status are required" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Appointment status updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



// Delete an appointment by bookingId
export const deleteDoctorAppointment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


export const getSingleDoctorAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const booking = await Booking.findById(appointmentId)
      .populate({
        path: 'doctorId',
        select: 'name specialization image',
      })
      .populate({
        path: 'staffId',
        select: 'name',
      })
      .select(
        'doctorId doctorConsultationBookingId staffId familyMemberId bookedSlot totalPrice status meetingLink type discount payableAmount createdAt doctorReports doctorPrescriptions transactionId paymentStatus'
      );

    if (!booking) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.status(200).json({
      message: 'Doctor appointment fetched successfully',
      appointment: {
        appointmentId: booking._id,
        doctor_name: booking.doctorId?.name,
        doctor_specialization: booking.doctorId?.specialization,
        doctor_image: booking.doctorId?.image,
        staff_name: booking.staffId?.name,
        appointment_date: booking.bookedSlot?.date,
        time_slot: booking.bookedSlot?.timeSlot,
        status: booking.status,
        meeting_link: booking.meetingLink,
        consultation_type: booking.type,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        doctor_reports: booking.doctorReports,  // ✅ SHOW REPORTS HERE
        doctor_prescriptions: booking.doctorPrescriptions, // ✅ Added
        doctorConsultationBookingId: booking.doctorConsultationBookingId,
        transactionId: booking.transactionId,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: "DoctorId parameter is required" });
    }

    // Fetch all bookings for the doctor (no status filter)
    const bookings = await Booking.find({ doctorId })
      .populate('staffId', 'name') // Only populate staff name
      .lean();

    if (!bookings.length) {
      return res.status(404).json({ message: "No appointments found for this doctor" });
    }

    // Fetch doctor details once
    const doctor = await Doctor.findById(doctorId).select('name specialization image').lean();

    // Map full booking data + doctor & staff info
   const appointments = bookings.map(bk => ({
  appointmentId: bk._id,
  doctor_id: doctorId,
  doctor_name: doctor?.name || "N/A",
  doctor_specialization: doctor?.specialization || "N/A",
  doctor_image: doctor?.image || null,
  
  // ✅ FIXED THIS:
  staffId: bk.staffId?._id || null,
  staff_name: bk.staffId?.name || "N/A",
  
  familyMemberId: bk.familyMemberId || null,
  serviceType: bk.serviceType || null,
  isBooked: bk.isBooked,
  bookedSlot: bk.bookedSlot || {},
  type: bk.type,
  meetingLink: bk.meetingLink || null,
  transactionId: bk.transactionId || null,
  paymentStatus: bk.paymentStatus || null,
  paymentDetails: bk.paymentDetails || {},
  isSuccessfull: bk.isSuccessfull,
  discount: bk.discount || 0,
  payableAmount: bk.payableAmount || 0,
  totalPrice: bk.totalPrice || 0,
  status: bk.status,
  doctorConsultationBookingId: bk.doctorConsultationBookingId || null,
  date: bk.date,
  timeSlot: bk.timeSlot,
  createdAt: bk.createdAt,
  updatedAt: bk.updatedAt,
  report_file: bk.report_file || null,
  diagPrescription: bk.diagPrescription || null,
  doctorReports: bk.doctorReports || [],
  doctorPrescriptions: bk.doctorPrescriptions || [],
}));

    res.status(200).json({
      message: `Appointments for Doctor ${doctor?.name || doctorId} fetched successfully`,
      appointments,
    });

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const createCompany = (req, res) => {
  uploadCompanyAssets(req, res, async (err) => {
    if (err) {
      console.error("File upload error:", err);
      return res.status(400).json({ message: "File upload failed", error: err.message });
    }

    try {
      const {
        name,
        companyType,
        assignedBy,
        registrationDate,
        contractPeriod,
        renewalDate,
        insuranceBroker,
        email,
        phone,
        gstNumber,
        companyStrength,
        country,
        state,
        city,
        pincode,
        password,
        diagnostic,
        contactPerson,
      } = req.body;

      // ✅ Parse and validate diagnostic IDs
      const diagnosticIds = typeof diagnostic === "string" ? JSON.parse(diagnostic) : diagnostic;
      const filteredDiagnosticIds = (diagnosticIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));

      const validDiagnostics = await Diagnostic.find({
        _id: { $in: filteredDiagnosticIds },
      }).select("_id");

      // ✅ Handle uploaded files with proper paths
      const imageFile = req.files?.image?.[0]?.filename
        ? `/uploads/company-images/${req.files.image[0].filename}`
        : null;

      const documents = req.files?.documents?.map(doc => `/uploads/documents/${doc.filename}`) || [];

      // ✅ Parse and format contact persons
      const parsedContactPersons = typeof contactPerson === "string" ? JSON.parse(contactPerson) : contactPerson;

      const formattedContactPersons = Array.isArray(parsedContactPersons)
        ? parsedContactPersons.map(person => ({
            name: person?.name,
            designation: person?.designation,
            gender: person?.gender,
            email: person?.email,
            phone: person?.phone,
            address: {
              country: person?.address?.country,
              state: person?.address?.state,
              city: person?.address?.city,
              pincode: person?.address?.pincode,
              street: person?.address?.street || "Not Provided",
            },
          }))
        : [];

      // ✅ Create company document
      const newCompany = new Company({
        name,
        companyType,
        assignedBy,
        registrationDate,
        contractPeriod,
        renewalDate,
        insuranceBroker,
        email,
        phone,
        gstNumber,
        companyStrength,
        country,
        state,
        city,
        pincode,
        password,
        diagnostics: validDiagnostics.map(d => d._id),
        image: imageFile,
        documents,
        contactPerson: formattedContactPersons,
      });

      const savedCompany = await newCompany.save();

      res.status(201).json({
        message: "Company created successfully!",
        company: savedCompany,
      });
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });
};


export const uploadCompaniesFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "../uploads/company-csv", req.file.filename);
    const companiesData = await csv().fromFile(filePath);
    const insertedCompanies = [];

    for (const item of companiesData) {
      const {
        name,
        companyType,
        assignedBy,
        registrationDate,
        contractPeriod,
        renewalDate,
        insuranceBroker,
        email = "",
        phone = "",
        gstNumber = "",
        companyStrength,
        country,
        state,
        city,
        pincode,
        password,
        diagnostic = "[]",
        contactPerson = "[]"
      } = item;

      if (!name) continue;

      const existing = await Company.findOne({ name: name.trim() });
      if (existing) continue;

      // ✅ Parse diagnostic IDs
      let diagnosticIds;
      try {
        diagnosticIds = JSON.parse(diagnostic);
      } catch {
        diagnosticIds = [];
      }

      const filteredDiagnosticIds = diagnosticIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      const validDiagnostics = await Diagnostic.find({
        '_id': { $in: filteredDiagnosticIds }
      }).select('_id');

      // ✅ Parse contactPerson array
      let parsedContactPersons;
      try {
        parsedContactPersons = JSON.parse(contactPerson);
      } catch {
        parsedContactPersons = [];
      }

      const formattedContactPersons = Array.isArray(parsedContactPersons)
        ? parsedContactPersons.map(person => ({
          name: person?.name || '',
          designation: person?.designation || '',
          gender: person?.gender || '',
          email: person?.email || '',
          phone: person?.phone || '',
          address: {
            country: person?.address?.country || '',
            state: person?.address?.state || '',
            city: person?.address?.city || '',
            pincode: person?.address?.pincode || '',
            street: person?.address?.street || 'Not Provided',
          }
        }))
        : [];

      const newCompany = new Company({
        name: name.trim(),
        companyType: companyType?.trim(),
        assignedBy: assignedBy?.trim(),
        registrationDate,
        contractPeriod,
        renewalDate,
        insuranceBroker: insuranceBroker?.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gstNumber: gstNumber.trim(),
        companyStrength: companyStrength?.trim(),
        country: country?.trim(),
        state: state?.trim(),
        city: city?.trim(),
        pincode: pincode?.trim(),
        password: password?.trim(),
        diagnostics: validDiagnostics.map(d => d._id),
        contactPerson: formattedContactPersons,
        image: "",      // CSV upload won't have image/docs
        documents: []   // So we keep these empty
      });

      await newCompany.save();
      insertedCompanies.push(newCompany);
    }

    fs.unlink(filePath, () => {}); // Optional cleanup

    res.status(201).json({
      message: "Companies uploaded from CSV successfully",
      count: insertedCompanies.length,
      companies: insertedCompanies
    });
  } catch (error) {
    console.error("CSV Upload Error:", error);
    res.status(500).json({ message: "Error uploading from CSV", error: error.message });
  }
};




export const updateCompany = (req, res) => {
  // Get companyId from URL params
  const { companyId } = req.params;

  // Call multer middleware manually to handle file uploads
  uploadCompanyAssets(req, res, async (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    try {
      const {
        name,
        companyType,
        assignedBy,
        registrationDate,
        contractPeriod,
        renewalDate,
        insuranceBroker,
        email,
        phone,
        gstNumber,
        companyStrength,
        country,
        state,
        city,
        pincode,
        contactPerson,
        password,
        diagnostic,  // Array of diagnostic _ids
      } = req.body;

      // 🔍 Parse diagnostic array from frontend if sent as stringified JSON
      const diagnosticIds = typeof diagnostic === 'string' ? JSON.parse(diagnostic) : diagnostic;

      // Check if all diagnostic _ids are valid
      const validDiagnostics = diagnosticIds
        ? await Diagnostic.find({ '_id': { $in: diagnosticIds } }).select('_id')
        : [];

      // 📂 Handle uploaded files (image and documents)
      const imageFile = req.files?.image?.[0]?.path || '';
      const documents = req.files?.documents?.map(doc => doc.path) || [];

      // 🔄 Parse the contactPerson if sent as stringified JSON
      const parsedContactPerson = typeof contactPerson === 'string' ? JSON.parse(contactPerson) : contactPerson;

      // Prepare the updated company data
      const updateData = {};

      // Only include the fields that are provided in the request
      if (name) updateData.name = name;
      if (companyType) updateData.companyType = companyType;
      if (assignedBy) updateData.assignedBy = assignedBy;
      if (registrationDate) updateData.registrationDate = registrationDate;
      if (contractPeriod) updateData.contractPeriod = contractPeriod;
      if (renewalDate) updateData.renewalDate = renewalDate;
      if (insuranceBroker) updateData.insuranceBroker = insuranceBroker;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (gstNumber) updateData.gstNumber = gstNumber;
      if (companyStrength) updateData.companyStrength = companyStrength;
      if (country) updateData.country = country;
      if (state) updateData.state = state;
      if (city) updateData.city = city;
      if (pincode) updateData.pincode = pincode;
      if (password) updateData.password = password;  // Store password directly

      if (validDiagnostics.length > 0) updateData.diagnostics = validDiagnostics.map(d => d._id);  // Store the array of diagnostic _ids
      if (imageFile) updateData.image = imageFile;  // Update the uploaded image path
      if (documents.length > 0) updateData.documents = documents;  // Update the uploaded document paths

      if (parsedContactPerson) {
        updateData.contactPerson = {
          name: parsedContactPerson?.name,
          designation: parsedContactPerson?.designation,
          gender: parsedContactPerson?.gender,
          email: parsedContactPerson?.email,
          phone: parsedContactPerson?.phone,
          address: {
            country: parsedContactPerson?.address?.country,
            state: parsedContactPerson?.address?.state,
            city: parsedContactPerson?.address?.city,
            pincode: parsedContactPerson?.address?.pincode,
            street: parsedContactPerson?.address?.street || 'Not Provided',  // Default if not provided
          },
        };
      }

      // Find the company by ID and update it
      const updatedCompany = await Company.findByIdAndUpdate(companyId, updateData, { new: true });

      if (!updatedCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Respond with success message and the updated company details
      res.status(200).json({
        message: 'Company updated successfully!',
        company: updatedCompany,
      });
    } catch (error) {
      console.error('Error updating company:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });
};




export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Companies fetched successfully',
      companies,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


export const getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate({
        path: 'diagnostics',
        populate: [
          { path: 'tests', model: 'Test' },
          { path: 'packages', model: 'Package' },
          { path: 'scans', model: 'Xray' },
        ]
      });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({
      message: 'Company fetched successfully',
      company,
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// Delete Company Controller
export const deleteCompany = async (req, res) => {
  const { companyId } = req.params; // companyId from URL params

  try {
    // Check if the company exists and delete it
    const company = await Company.findByIdAndDelete(companyId);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Return success response
    res.status(200).json({ message: 'Company deleted successfully!' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};



export const getCompanyDiagnostics = async (req, res) => {
  try {
    const { companyId } = req.params;

    // 1. Find company and populate diagnostics
    const company = await Company.findById(companyId).populate('diagnostics');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    return res.status(200).json({
      message: 'Diagnostics fetched successfully',
      diagnostics: company.diagnostics,
    });
  } catch (error) {
    console.error('❌ Error fetching diagnostics:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getCompanyWithStaff = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate({
        path: 'staff',
        model: 'Staff',
        select: 'name role contact_number email dob gender age address profileImage idImage wallet_balance department' // jitne fields chahiye ho
      });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    return res.status(200).json({
      message: "Company and staff fetched successfully",
      company
    });

  } catch (error) {
    console.error("Error fetching company and staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Create a new category with optional image
export const createCategory = async (req, res) => {
  try {
    const { name, type } = req.body; // type = 'special' or 'normal'

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required.' });
    }

    // Validate type
    if (!['special', 'normal'].includes(type.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid category type. Must be "special" or "normal".' });
    }

    // For normal category, image is required
    let imagePath = '';
    if (type === 'normal') {
      if (!req.file) {
        return res.status(400).json({ message: 'Image is required for normal category.' });
      }
      imagePath = `/uploads/category-images/${req.file.filename}`;
    }

    const category = new Category({
      name,
      image: imagePath,
      type: type.toLowerCase(), // Save lowercase for consistency
    });

    await category.save();

    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating category' });
  }
};


export const uploadCategoriesFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "../uploads/category-csv", req.file.filename); // ✅ Fixed path

    const categories = await csv().fromFile(filePath);
    const insertedCategories = [];

    for (const item of categories) {
      const { name, image = "" } = item;
      if (!name) continue;

      const existing = await Category.findOne({ name: name.trim() });
      if (existing) continue;

      const category = new Category({
        name: name.trim(),
        image: image.trim(),
      });

      await category.save();
      insertedCategories.push(category);
    }

    res.status(201).json({
      message: "Categories uploaded from CSV successfully",
      count: insertedCategories.length,
      categories: insertedCategories,
    });

    fs.unlink(filePath, () => {}); // Optional: delete after success
  } catch (error) {
    console.error("CSV Upload Error:", error);
    res.status(500).json({ message: "Error uploading from CSV" });
  }
};


// Edit category by ID
export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    let updateData = { name };

    // If image is uploaded
    if (req.file) {
      const imagePath = `/uploads/category-images/${req.file.filename}`;
      updateData.image = imagePath;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating category' });
  }
};



// Delete category by ID
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting category' });
  }
};


// Controller to get all categories
export const getAllCategories = async (req, res) => {
  try {
    // Find categories where 'image' exists and is not empty string
    const categories = await Category.find({
      image: { $exists: true, $ne: "" }
    });

    if (categories.length === 0) {
      return res.status(404).json({ message: 'No categories found' });
    }

    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};




export const fetchImageEnabledCategories = async (req, res) => {
  try {
    // Find categories where 'image' field is either missing or empty string
    const categories = await Category.find({
      $or: [
        { image: { $exists: false } },
        { image: "" }
      ]
    }).select("_id name image createdAt updatedAt");

    if (categories.length === 0) {
      return res.status(404).json({ message: 'No categories without images found' });
    }

    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories without images' });
  }
};





///company controllers

// Admin Login
export const loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if company exists
    const company = await Company.findOne({ email });
    if (!company) {
      return res.status(400).json({ message: 'Company does not exist' });
    }

    // Check if password matches directly (without bcrypt)
    if (company.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(company._id);

    // Return success message with company details and JWT token
    res.status(200).json({
      message: 'Login successful',
      token,
      company: {
        id: company._id, // Add company ID here
        name: company.name,
        email: company.email,
        companyType: company.companyType,
        assignedBy: company.assignedBy,
        registrationDate: company.registrationDate,
        contractPeriod: company.contractPeriod,
        renewalDate: company.renewalDate,
        insuranceBroker: company.insuranceBroker,
        gstNumber: company.gstNumber,
        companyStrength: company.companyStrength,
        country: company.country,
        state: company.state,
        city: company.city,
        pincode: company.pincode,
        contactPerson: company.contactPerson, // Include the contact person details
        documents: company.documents, // Include documents if necessary
      },
    });
  } catch (error) {
    console.error('Error during company login:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// Company Logout Controller
export const logoutCompany = async (req, res) => {
  try {
    // Clear the JWT token cookie if it's stored in a cookie
    res.clearCookie('company_token', {
      httpOnly: true, // Prevents JavaScript access to the cookie
      secure: process.env.NODE_ENV === 'production', // Secure flag for production (HTTPS)
      sameSite: 'strict', // CSRF protection
    });

    // Send response indicating successful logout
    res.status(200).json({
      message: "Company logout successful. Token cleared from cookies.",
    });
  } catch (error) {
    res.status(500).json({ message: "Company logout failed", error });
  }
};


// PUT controller to update status of a booking by bookingId from URL params
export const updateBookingStatusByDiagnostic = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newStatus } = req.body;

    // Validation: Ensure newStatus is provided
    if (!newStatus) {
      return res.status(400).json({ message: "newStatus is required in request body" });
    }

    // Find the booking by bookingId and update its status
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: { status: newStatus } },
      { new: true }  // Return the updated booking
    );

    // Check if booking was found
    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: `Booking status updated to "${newStatus}"`,
      updatedBooking
    });

  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Controller to get all diagnostic bookings with status 'accepted'
export const getAcceptedDiagnosticBookings = async (req, res) => {
  try {
    // 1. Find all bookings with status "accepted"
    const bookings = await Booking.find({ status: 'accepted' }) // Only fetch bookings with status "accepted"
      .populate('staff')  // Populate staff details
      .populate('diagnostic')  // Populate diagnostic center details
      .populate({
        path: 'diagnostic.tests',  // Populate the embedded tests
        select: 'test_name price offerPrice description image'
      });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No accepted bookings found' });
    }

    // 2. Format booking details
    const bookingDetails = bookings.map((booking) => {
      return {
        bookingId: booking._id,
        patient_name: booking.patient_name,
        patient_age: booking.age,
        patient_gender: booking.gender,
        staff_name: booking.staff ? booking.staff.name : 'N/A',
        diagnostic_name: booking.diagnostic ? booking.diagnostic.name : 'N/A',
        diagnostic_image: booking.diagnostic?.image || '',
        diagnostic_address: booking.diagnostic?.address || '',
        consultation_fee: booking.consultation_fee || 0,
        tests: booking.diagnostic?.tests?.map(test => ({
          test_name: test.test_name,
          price: test.price,
          offerPrice: test.offerPrice || test.price,
          description: test.description,
          image: test.image
        })) || [],
        appointment_date: booking.appointment_date,
        gender: booking.gender,
        age: booking.age,
        subtotal: booking.subtotal,
        gst_on_tests: booking.gst_on_tests,
        gst_on_consultation: booking.gst_on_consultation,
        total: booking.total,
        status: booking.status
      };
    });

    // 3. Send response
    res.status(200).json({
      message: 'Accepted bookings fetched successfully',
      bookings: bookingDetails
    });
  } catch (error) {
    console.error('Error fetching accepted bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// Controller to get all diagnostic bookings with status 'rejected'
export const getRejectedDiagnosticBookings = async (req, res) => {
  try {
    // 1. Find all bookings with status "rejected"
    const bookings = await Booking.find({ status: 'rejected' }) // Only fetch bookings with status "rejected"
      .populate('staff')  // Populate staff details
      .populate('diagnostic')  // Populate diagnostic center details
      .populate({
        path: 'diagnostic.tests',  // Populate the embedded tests
        select: 'test_name price offerPrice description image'
      });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No rejected bookings found' });
    }

    // 2. Format booking details
    const bookingDetails = bookings.map((booking) => {
      return {
        bookingId: booking._id,
        patient_name: booking.patient_name,
        patient_age: booking.age,
        patient_gender: booking.gender,
        staff_name: booking.staff ? booking.staff.name : 'N/A',
        diagnostic_name: booking.diagnostic ? booking.diagnostic.name : 'N/A',
        diagnostic_image: booking.diagnostic?.image || '',
        diagnostic_address: booking.diagnostic?.address || '',
        consultation_fee: booking.consultation_fee || 0,
        tests: booking.diagnostic?.tests?.map(test => ({
          test_name: test.test_name,
          price: test.price,
          offerPrice: test.offerPrice || test.price,
          description: test.description,
          image: test.image
        })) || [],
        appointment_date: booking.appointment_date,
        gender: booking.gender,
        age: booking.age,
        subtotal: booking.subtotal,
        gst_on_tests: booking.gst_on_tests,
        gst_on_consultation: booking.gst_on_consultation,
        total: booking.total,
        status: booking.status
      };
    });

    // 3. Send response
    res.status(200).json({
      message: 'Rejected bookings fetched successfully',
      bookings: bookingDetails
    });
  } catch (error) {
    console.error('Error fetching rejected bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;  // 👈 This is Booking._id from frontend
    const { newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ message: "newStatus is required in the request body" });
    }

    // 🔍 Update by Booking._id
    const updatedAppointment = await Booking.findOneAndUpdate(
      { _id: appointmentId },               // ✅ Correct: match _id, not appointmentId
      { $set: { status: newStatus } },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json({
      message: `Appointment status updated to "${newStatus}"`,
      updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const getAcceptedAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: "accepted" })
      .populate({
        path: 'doctor',
        select: 'name specialization image'
      })
      .select('patient_name patient_relation age gender subtotal total appointment_date status doctor');

    res.status(200).json({
      message: 'Accepted appointments fetched successfully',
      appointments: appointments.map((appointment) => ({
        appointmentId: appointment._id,
        doctor_name: appointment.doctor?.name,
        doctor_specialization: appointment.doctor?.specialization,
        doctor_image: appointment.doctor?.image,
        appointment_date: appointment.appointment_date,
        status: appointment.status,
        patient_name: appointment.patient_name,
        patient_relation: appointment.patient_relation,
        age: appointment.age,
        gender: appointment.gender,
        subtotal: appointment.subtotal,
        total: appointment.total,
      })),
    });
  } catch (error) {
    console.error('Error fetching accepted appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getRejectedAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ status: "rejected" })
      .populate({
        path: 'doctor',
        select: 'name specialization image'
      })
      .select('patient_name patient_relation age gender subtotal total appointment_date status doctor');

    res.status(200).json({
      message: 'Rejected appointments fetched successfully',
      appointments: appointments.map((appointment) => ({
        appointmentId: appointment._id,
        doctor_name: appointment.doctor?.name,
        doctor_specialization: appointment.doctor?.specialization,
        doctor_image: appointment.doctor?.image,
        appointment_date: appointment.appointment_date,
        status: appointment.status,
        patient_name: appointment.patient_name,
        patient_relation: appointment.patient_relation,
        age: appointment.age,
        gender: appointment.gender,
        subtotal: appointment.subtotal,
        total: appointment.total,
      })),
    });
  } catch (error) {
    console.error('Error fetching rejected appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getCounts = async (req, res) => {
  try {
    // Count doctor appointments (isBooked === true)
    const doctorAppointmentCount = await Booking.countDocuments({ isBooked: true });

    // Count diagnostic bookings (has diagnosticId)
    const diagnosticBookingCount = await Booking.countDocuments({ diagnosticId: { $exists: true, $ne: null } });

    res.status(200).json({
      message: 'Counts fetched successfully',
      totalDoctorAppointments: doctorAppointmentCount,
      totalDiagnosticBookings: diagnosticBookingCount,
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const getCompanyStaffStats = async (req, res) => {
  const { companyId } = req.params;

  try {
    // Step 1: Find company with populated staff
    const company = await Company.findById(companyId).populate('staff');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Step 2: Get staff array
    const staffArray = company.staff || [];

    // Step 3: Count total staff
    const totalStaff = staffArray.length;

    // Step 4: Calculate total wallet balance
    const totalWalletBalance = staffArray.reduce((sum, staff) => {
      return sum + (staff.wallet_balance || 0);
    }, 0);

    // Step 5: Send response
    res.status(200).json({
      message: 'Company staff stats fetched successfully',
      totalStaff,
      totalWalletBalance,
    });
  } catch (error) {
    console.error('Error fetching company staff stats:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// Doctor Login
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if doctor exists
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: 'Doctor does not exist' });
    }

    // Check if password matches directly (without bcrypt)
    if (doctor.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(doctor._id);

    // Return success message with doctor details and JWT token
    res.status(200).json({
      message: 'Login successful',
      token,
      doctor: {
        id: doctor._id, // Add doctor ID here
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        contactNumber: doctor.contactNumber,
        address: doctor.address,
        registrationDate: doctor.registrationDate,
        licenseNumber: doctor.licenseNumber,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        country: doctor.country,
        state: doctor.state,
        city: doctor.city,
        pincode: doctor.pincode,
        profilePicture: doctor.profilePicture, // Include profile picture if necessary
        documents: doctor.documents, // Include documents if necessary
      },
    });
  } catch (error) {
    console.error('Error during doctor login:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


// Doctor Logout Controller
export const logoutDoctor = async (req, res) => {
  try {
    // Clear the JWT token cookie if it's stored in a cookie
    res.clearCookie('doctor_token', {
      httpOnly: true, // Prevents JavaScript access to the cookie
      secure: process.env.NODE_ENV === 'production', // Secure flag for production (HTTPS)
      sameSite: 'strict', // CSRF protection
    });

    // Send response indicating successful logout
    res.status(200).json({
      message: "Doctor logout successful. Token cleared from cookies.",
    });
  } catch (error) {
    res.status(500).json({ message: "Doctor logout failed", error });
  }
};


// Diagnostic Login
export const loginDiagnostic = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if diagnostic user exists
    const diagnostic = await Diagnostic.findOne({ email });
    if (!diagnostic) {
      return res.status(400).json({ message: 'Diagnostic does not exist' });
    }

    // // Check if password matches (no bcrypt in use here)
    // if (diagnostic.password !== password) {
    //   return res.status(400).json({ message: 'Invalid credentials' });
    // }

    // Generate JWT token
    const token = generateToken(diagnostic._id);

    // Respond with success, token, and diagnostic details
    res.status(200).json({
      message: 'Login successful',
      token,
      diagnostic: {
        id: diagnostic._id,
        name: diagnostic.name,
        email: diagnostic.email,
        contactNumber: diagnostic.contactNumber,
        address: diagnostic.address,
        registrationDate: diagnostic.registrationDate,
        licenseNumber: diagnostic.licenseNumber,
        diagnosticCenterName: diagnostic.diagnosticCenterName,
        diagnosticCenterAddress: diagnostic.diagnosticCenterAddress,
        country: diagnostic.country,
        state: diagnostic.state,
        city: diagnostic.city,
        pincode: diagnostic.pincode,
        profilePicture: diagnostic.profilePicture,
        documents: diagnostic.documents,
      },
    });
  } catch (error) {
    console.error('Error during diagnostic login:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};



// Diagnostic Logout
export const logoutDiagnostic = async (req, res) => {
  try {
    res.clearCookie('diagnostic_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      message: "Diagnostic logout successful. Token cleared from cookies.",
    });
  } catch (error) {
    res.status(500).json({ message: "Diagnostic logout failed", error });
  }
};



export const importCompaniesFromExcel = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

    const savedCompanies = [];

    for (const entry of data) {
      const company = new Company({
        name: entry.name || '',
        companyType: entry.companyType || '',
        assignedBy: entry.assignedBy || '',
        registrationDate: entry.registrationDate ? new Date(entry.registrationDate) : null,
        contractPeriod: entry.contractPeriod || '',
        renewalDate: entry.renewalDate ? new Date(entry.renewalDate) : null,
        insuranceBroker: entry.insuranceBroker || '',
        email: entry.email || '',
        password: entry.password || '',
        phone: entry.phone || '',
        gstNumber: entry.gstNumber || '',
        companyStrength: Number(entry.companyStrength) || 0,
        image: entry.image || '',
        country: entry.country || '',
        state: entry.state || '',
        city: entry.city || '',
        pincode: entry.pincode || '',
        contactPerson: {
          name: entry.contactPerson_name || '',
          designation: entry.contactPerson_designation || '',
          gender: entry.contactPerson_gender || '',
          email: entry.contactPerson_email || '',
          phone: entry.contactPerson_phone || '',
          address: {
            country: entry.contactPerson_country || '',
            state: entry.contactPerson_state || '',
            city: entry.contactPerson_city || '',
            pincode: entry.contactPerson_pincode || '',
            street: entry.contactPerson_street || ''
          }
        },
        diagnostics: entry.diagnostics
          ? entry.diagnostics.split(',').map(id => id.trim())
          : [],
        documents: entry.documents
          ? entry.documents.split(',').map(doc => doc.trim())
          : [],
        staff: [] // Staff bulk add ka feature alag se banega
      });

      const saved = await company.save();
      savedCompanies.push(saved);
    }

    fs.unlinkSync(file.path); // remove uploaded Excel file

    res.status(200).json({
      message: 'Companies imported successfully',
      data: savedCompanies
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import companies' });
  }
};




export const importStaffFromExcel = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

    const savedStaff = [];

    for (const entry of data) {
      try {
        const staff = new Staff({
          name: entry.name || '',
          email: entry.email || '',
          password: entry.password || '',
          role: entry.role || 'Staff', // Default to 'Staff' role
          contact_number: entry.contact_number || '',
          address: entry.address || '',
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
          updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
          myBookings: entry.myBookings ? entry.myBookings.split(',').map(id => id.trim()) : [],
          wallet_balance: Number(entry.wallet_balance) || 0,
          doctorAppointments: entry.doctorAppointments ? entry.doctorAppointments.split(',').map(id => mongoose.Types.ObjectId(id.trim())) : [], // Convert to ObjectId
          wallet_logs: parseJsonField(entry.wallet_logs),
          family_members: parseJsonField(entry.family_members),
          profileImage: entry.profileImage || '',
          addresses: parseJsonField(entry.addresses),
          issues: parseJsonField(entry.issues)
        });

        const saved = await staff.save();
        savedStaff.push(saved);
      } catch (error) {
        console.error('Error processing entry:', entry, error);
      }
    }

    fs.unlinkSync(file.path); // Remove the uploaded Excel file

    res.status(200).json({
      message: 'Staff imported successfully',
      data: savedStaff
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import staff' });
  }
};

// Helper function to parse JSON fields safely
function parseJsonField(field) {
  if (!field) return [];

  try {
    // Assuming the field is a comma-separated string of JSON objects
    return field.split(',').map(item => {
      try {
        return JSON.parse(item.trim()); // Trim extra spaces and parse JSON
      } catch (e) {
        console.error('Invalid JSON:', item);
        return {}; // Return an empty object on invalid JSON
      }
    });
  } catch (error) {
    console.error('Error parsing field:', field, error);
    return [];
  }
}



export const getDashboardCounts = async (req, res) => {
  try {
    const companyCount = await Company.countDocuments();
    const diagnosticCount = await Diagnostic.countDocuments();
    const appointmentCount = await Booking.countDocuments({ isBooked: true }); // Appointments from Booking model
    const bookingCount = await Booking.countDocuments();
    const staffCount = await Staff.countDocuments();
    const doctorCount = await Doctor.countDocuments();
    const hraCount = await Hra.countDocuments(); // Count from Hra collection

    res.status(200).json({
      success: true,
      data: {
        companies: companyCount,
        diagnostics: diagnosticCount,
        appointments: appointmentCount,
        bookings: bookingCount,
        staff: staffCount,
        doctors: doctorCount,
        hra: hraCount
      },
    });
  } catch (error) {
    console.error("Error fetching counts:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching counts",
      error: error.message,
    });
  }
};


// Helper function to map age group to range (3-year intervals)
const getAgeRange = (ageGroup) => {
  const ageRanges = {
    '20-23': [20, 23],
    '23-26': [23, 26],
    '26-29': [26, 29],
    '29-32': [29, 32],
    '32-35': [32, 35],
    '35-38': [35, 38],
    '38-41': [38, 41],
    '41-44': [41, 44],
    '44-47': [44, 47],
    '47-50': [47, 50],
    '50-53': [50, 53],
    '53-56': [53, 56],
    '56-59': [56, 59],
    '59-62': [59, 62],
    '62-65': [62, 65],
    '65-68': [65, 68],
    '68-71': [68, 71],
    '71-74': [71, 74],
    '74-77': [74, 77],
    '77-80': [77, 80]
  };
  return ageRanges[ageGroup];
};

export const addTestsToStaffByAgeGroup = async (req, res) => {
  try {
    const { ageGroup, diagnostics } = req.body;

    // ✅ Step 1: Parse the ageGroup string (e.g., "20-23") into min and max age
    const [minAgeStr, maxAgeStr] = ageGroup.split('-');
    const minAge = parseInt(minAgeStr);
    const maxAge = parseInt(maxAgeStr);

    if (isNaN(minAge) || isNaN(maxAge)) {
      return res.status(400).json({ message: 'Invalid age group format. Use format like "20-23".' });
    }

    // ✅ Step 2: Find staff members within the given age range
    const staffMembers = await Staff.find({ age: { $gte: minAge, $lte: maxAge } });

    if (staffMembers.length === 0) {
      return res.status(404).json({ message: 'No staff members found in the specified age group.' });
    }

    // ✅ Step 3: Extract all diagnostic IDs and find corresponding documents
    const diagnosticIds = diagnostics.map(d => d.diagnosticId);
    const diagnosticDocs = await Diagnostic.find({ _id: { $in: diagnosticIds } });

    // ✅ Handle missing diagnostics gracefully
    const missingDiagnosticIds = diagnosticIds.filter(diagnosticId => 
      !diagnosticDocs.some(doc => doc._id.toString() === diagnosticId.toString())
    );

    if (missingDiagnosticIds.length > 0) {
      console.warn('Missing diagnostics:', missingDiagnosticIds);
    }

    // If there are no diagnostics at all, return a specific message
    if (diagnosticDocs.length === 0) {
      return res.status(404).json({ message: 'No diagnostics found matching the provided IDs.' });
    }

    // ✅ Step 4: Loop through each staff member and add selected packages
    for (const staff of staffMembers) {
      let updated = false;

      for (const diagnostic of diagnostics) {
        const matchedDiagnostic = diagnosticDocs.find(d => d._id.toString() === diagnostic.diagnosticId);
        if (!matchedDiagnostic) continue; // Skip this diagnostic if not found

        const selectedPackageIds = Array.isArray(diagnostic.packageIds) ? diagnostic.packageIds : [];

        for (const pkgId of selectedPackageIds) {
          const matchedPackage = matchedDiagnostic.packages.find(pkg => pkg._id.toString() === pkgId);
          if (!matchedPackage) continue; // Skip if no package is found

          const alreadyExists = staff.myPackages.some(p =>
            p.diagnosticId.toString() === matchedDiagnostic._id.toString() &&
            p.packageId.toString() === matchedPackage._id.toString()
          );

          if (!alreadyExists) {
            staff.myPackages.push({
              diagnosticId: matchedDiagnostic._id,
              packageId: matchedPackage._id,
              packageName: matchedPackage.packageName,
              price: matchedPackage.price,
              offerPrice: matchedPackage.offerPrice,
              tests: matchedPackage.tests,
            });
            updated = true;
          }
        }
      }

      if (updated) await staff.save();
    }

    res.status(200).json({ message: 'Packages successfully added to all matching staff members.' });
  } catch (error) {
    console.error('Error in addTestsToStaffByAgeGroup:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};



export const submitSection = async (req, res) => {
  try {
    const { sectionName, questions } = req.body;

    if (!sectionName || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'sectionName and questions are required. questions must be an array.' });
    }

    const sectionId = new mongoose.Types.ObjectId();

    const formattedQuestions = questions.map((q) => {
      const formattedOptions = [];
      const points = {};

      q.options.forEach(opt => {
        const match = opt.match(/^(.*?)(?:\s*→\s*|\s*->\s*)(\d+)\s*pts?$/i);
        if (match) {
          const optionText = match[1].trim();
          const pointValue = parseInt(match[2], 10);
          formattedOptions.push(optionText);
          points[optionText] = pointValue;
        } else {
          formattedOptions.push(opt.trim());
          points[opt.trim()] = 0;
        }
      });

      return {
        questionId: new mongoose.Types.ObjectId(),
        question: q.question,
        options: formattedOptions,
        points
      };
    });

    let healthAssessment = await HealthAssessment.findOne();

    if (!healthAssessment) {
      healthAssessment = new HealthAssessment({
        sections: [{ sectionId, sectionName, questions: formattedQuestions }]
      });
    } else {
      healthAssessment.sections.push({ sectionId, sectionName, questions: formattedQuestions });
    }

    await healthAssessment.save();

    res.status(200).json({
      message: 'Section added successfully',
      data: {
        sectionId,
        sectionName,
        questions: formattedQuestions.map(q => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options,
          points: q.points
        }))
      }
    });
  } catch (error) {
    console.error('Error adding section:', error);
    res.status(500).json({ message: 'Error adding section', error: error.message });
  }
};



// GET method to fetch the entire health assessment
export const getAssessment = async (req, res) => {
  try {
    const healthAssessment = await HealthAssessment.findOne();

    if (!healthAssessment) {
      return res.status(404).json({ message: "No assessment found" });
    }

    res.status(200).json({ data: healthAssessment });
  } catch (error) {
    res.status(500).json({ message: "Error fetching assessment", error: error.message });
  }
};


// Fetch all unique categories from the Doctor model
export const getAllDoctorCategories = async (req, res) => {
  try {
    // Use `distinct` to get all unique categories from the Doctor model
    const categories = await Doctor.distinct('category');

    if (categories.length === 0) {
      return res.status(404).json({ message: 'No categories found' });
    }

    // Return the list of categories
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Fetch all doctors with optional category, consultation_fee filter, and sorting
export const getAllDoctorsByFilter = async (req, res) => {
  try {
    // Get distinct values for department (category) and consultation types
    const departments = await Doctor.distinct('category');
    const consultationTypes = await Doctor.distinct('consultation_type');

    // Fetch all consultation fees and calculate price ranges
    const fees = await Doctor.find({}, { consultation_fee: 1, _id: 0 });
    const prices = fees.map(d => d.consultation_fee).filter(Boolean);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Define price ranges
    const priceFilters = [
      { id: "1", name: "₹0 - ₹499", range: [0, 499] },
      { id: "2", name: "₹500 - ₹999", range: [500, 999] },
      { id: "3", name: "₹1000+", range: [1000, maxPrice] }
    ];

    // Construct the filters object
    const filters = {
      Department: departments.map((dept, i) => ({ id: `${i + 1}`, name: dept })),
      Consultation: consultationTypes.map((type, i) => ({ id: `${i + 1}`, name: type })),
      Price: priceFilters,
      "Sort By": [
        { id: "1", name: "Relevance" },
        { id: "2", name: "Rating" },
        { id: "3", name: "Experience" }
      ]
    };

    // Return the filters
    res.status(200).json({ filters });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Fetch doctors with optional filters like category, consultation type, price, and sorting
export const getAllDoctorsFilter = async (req, res) => {
  try {
    // Extract query parameters from the request
    const { category, consultation_type, consultation_fee, sortBy } = req.query;

    // Initialize the filter object
    const filter = {};

    // Apply category filter if provided
    if (category) {
      filter.category = category; // Match doctors by category (e.g., "Cardiology")
    }

    // Apply consultation_type filter if provided
    if (consultation_type) {
      filter.consultation_type = consultation_type; // Match doctors by consultation type (e.g., "In-Person")
    }

    // Apply consultation_fee filter if provided (price range filter)
    if (consultation_fee) {
      const [minFee, maxFee] = consultation_fee.split('-').map(Number);
      filter.consultation_fee = { $gte: minFee, $lte: maxFee }; // Filter by price range
    }

    // Initialize the sorting object
    const sort = {};

    // Apply sorting if provided
    if (sortBy) {
      const [field, order] = sortBy.split(',');
      const sortOrder = order === 'desc' ? -1 : 1; // Sort order
      sort[field] = sortOrder; // Set the sort field and order
    }

    // Fetch doctors from the database based on the filters
    const doctors = await Doctor.find(filter).sort(sort);

    // If no doctors are found, return a message indicating no matches
    if (doctors.length === 0) {
      return res.status(404).json({ message: 'No doctors found matching the criteria' });
    }

    // Return the filtered and sorted list of doctors
    res.status(200).json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const createTest = async (req, res) => {
  try {
    const {
      name,
      price,
      fastingRequired,
      homeCollectionAvailable, // ✅ new field
      reportIn24Hrs,
      description,
      category
    } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const test = new Test({
      name,
      price,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      description,
      category
    });

    const savedTest = await test.save();

    return res.status(201).json({
      message: 'Test created successfully',
      test: savedTest
    });
  } catch (err) {
    console.error("❌ Error creating test:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const createTestForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const {
      name,
      price,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      description,
      instruction,
      precaution,
      reportHour,
    } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // ✅ Store full image path
    const image = req.file ? `/uploads/testImages/${req.file.filename}` : null;

    const test = new Test({
      name,
      price,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      description,
      instruction,
      precaution,
      reportHour,
      image, // now contains full relative path
    });

    const savedTest = await test.save();

    const diagnostic = await Diagnostic.findByIdAndUpdate(
      diagnosticId,
      { $push: { tests: savedTest._id } },
      { new: true }
    );

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic not found" });
    }

    res.status(201).json({
      message: "Test created successfully",
      test: savedTest,
      diagnostic,
    });
  } catch (error) {
    console.error("Create test error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTestForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, testId } = req.params;
    const {
      name,
      price,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      description,
      instruction,
      precaution,
      reportHour,
    } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Optional: Verify that the test belongs to the diagnostic
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic not found" });
    }
    if (!diagnostic.tests.includes(testId)) {
      return res.status(400).json({ message: "Test does not belong to this diagnostic" });
    }

    const updateData = {
      name,
      price,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      description,
      instruction,
      precaution,
      reportHour,
    };

    if (req.file) {
      updateData.image = `/uploads/testImages/${req.file.filename}`;
    }

    const updatedTest = await Test.findByIdAndUpdate(testId, updateData, { new: true });

    if (!updatedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({
      message: "Test updated successfully",
      test: updatedTest,
    });
  } catch (error) {
    console.error("Update test error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const deleteTestForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, testId } = req.params;

    // Delete test document
    const deletedTest = await Test.findByIdAndDelete(testId);

    if (!deletedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Remove testId from diagnostic's tests array
    await Diagnostic.findByIdAndUpdate(diagnosticId, {
      $pull: { tests: testId },
    });

    res.status(200).json({ message: "Test deleted successfully" });
  } catch (error) {
    console.error("Delete test error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getAllTestsForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    // Find the diagnostic with populated tests
    const diagnostic = await Diagnostic.findById(diagnosticId).populate('tests');

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic not found" });
    }

    // Send all tests of the diagnostic
    res.status(200).json({
      message: "Tests fetched successfully",
      tests: diagnostic.tests,
    });
  } catch (error) {
    console.error("Get tests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



export const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 }); // latest first

    return res.status(200).json({
      message: 'Tests fetched successfully',
      total: tests.length,
      tests
    });
  } catch (err) {
    console.error("❌ Error fetching tests:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const updateTests = async (req, res) => {
  try {
    const { testId } = req.params;
    const updateData = req.body;

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Update fields dynamically
    Object.keys(updateData).forEach(key => {
      test[key] = updateData[key];
    });

    await test.save();

    return res.status(200).json({
      message: "Test updated successfully",
      test
    });
  } catch (err) {
    console.error("❌ Error updating test:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const deleteTests = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    await Test.findByIdAndDelete(testId);

    return res.status(200).json({
      message: "Test deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    return res.status(500).json({ message: "Server error" });
  }
};








export const createPackage = async (req, res) => {
  try {
    const {
      name,
      price,
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests
    } = req.body;

    if (!name || !price || !totalTestsIncluded || !includedTests?.length) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const newPackage = new Package({
      name,
      price,
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests
    });

    const saved = await newPackage.save();

    res.status(201).json({
      message: "Test package created successfully",
      package: saved
    });

  } catch (err) {
    console.error("❌ Error creating package:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const createPackageForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const {
      name,
      price,
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
    } = req.body;

    if (!name || !price || !totalTestsIncluded || !includedTests?.length) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const newPackage = new Package({
      name,
      price,
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
    });

    const savedPackage = await newPackage.save();

    if (diagnosticId) {
      await Diagnostic.findByIdAndUpdate(
        diagnosticId,
        { $push: { packages: savedPackage._id } },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Test package created and added to diagnostic successfully",
      package: savedPackage,
    });
  } catch (err) {
    console.error("❌ Error creating package:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const updatePackageForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, packageId } = req.params;
    const {
      name,
      price,
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
    } = req.body;

    if (!name || !price || !totalTestsIncluded || !includedTests?.length) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Find and update the package
    const updatedPackage = await Package.findOneAndUpdate(
      { _id: packageId },
      {
        name,
        price,
        doctorInfo,
        totalTestsIncluded,
        description,
        precautions,
        includedTests,
      },
      { new: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package updated successfully",
      package: updatedPackage,
    });
  } catch (err) {
    console.error("❌ Error updating package:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const deletePackageForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, packageId } = req.params;

    // Delete package from Package collection
    const deletedPackage = await Package.findByIdAndDelete(packageId);

    if (!deletedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Remove package reference from Diagnostic
    await Diagnostic.findByIdAndUpdate(diagnosticId, {
      $pull: { packages: packageId },
    });

    res.status(200).json({ message: "Package deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting package:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const getPackagesForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: "Diagnostic ID is required" });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId).populate("packages");

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic not found" });
    }

    res.status(200).json({
      message: "Packages fetched successfully",
      packages: diagnostic.packages,
    });
  } catch (err) {
    console.error("❌ Error fetching packages:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const updatedFields = {
      name: req.body.name,
      price: req.body.price,
      doctorInfo: req.body.doctorInfo,
      totalTestsIncluded: req.body.totalTestsIncluded,
      description: req.body.description,
      precautions: req.body.precautions,
      includedTests: req.body.includedTests
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      { $set: updatedFields },
      { new: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package updated successfully",
      package: updatedPackage
    });
  } catch (error) {
    console.error("❌ Error updating package:", error);
    res.status(500).json({ message: "Server error" });
  }
};
 


export const deletePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const deletedPackage = await Package.findByIdAndDelete(packageId);

    if (!deletedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package deleted successfully",
      package: deletedPackage
    });
  } catch (error) {
    console.error("❌ Error deleting package:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: 'All test packages fetched successfully',
      packages
    });
  } catch (err) {
    console.error('❌ Error fetching packages:', err);
    res.status(500).json({ message: 'Server error while fetching packages' });
  }
};



// Get the Most Recent Package
export const getRecentPackage = async (req, res) => {
  try {
    // Fetch the most recent package based on `createdAt`
    const recentPackage = await Package.findOne().sort({ createdAt: -1 });

    if (!recentPackage) {
      return res.status(404).json({ message: 'No recent package available.' });
    }

    res.status(200).json({
      message: 'Most recent test package fetched successfully',
      package: recentPackage
    });
  } catch (err) {
    console.error('❌ Error fetching recent package:', err);
    res.status(500).json({ message: 'Server error while fetching the recent package' });
  }
};


export const getSinglePackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const testPackage = await Package.findById(packageId);

    if (!testPackage) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.status(200).json({
      message: 'Package fetched successfully',
      package: testPackage
    });
  } catch (err) {
    console.error('❌ Error fetching single package:', err);
    res.status(500).json({ message: 'Server error while fetching package' });
  }
};





// 📤 Create X-ray with image
export const createXray = async (req, res) => {
  try {
    const { title, price, preparation, reportTime } = req.body;
    const image = req.file ? `/uploads/xray-images/${req.file.filename}` : null;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required." });
    }

    const newXray = new Xray({
      title,
      price,
      preparation,
      reportTime,
      image,
    });

    const saved = await newXray.save();
    res.status(201).json({
      message: "X-ray created successfully",
      xray: saved,
    });
  } catch (err) {
    console.error("❌ Error creating X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const createXrayForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params; // yahan se diagnosticId lo
    const { title, price, preparation, reportTime } = req.body;
    const image = req.file ? `/uploads/xray-images/${req.file.filename}` : null;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required." });
    }

    // Naya xray create karo
    const newXray = new Xray({
      title,
      price,
      preparation,
      reportTime,
      image,
    });

    const savedXray = await newXray.save();

    // Diagnostic update karo: scans me naye xray ka id push karo
    if (diagnosticId) {
      await Diagnostic.findByIdAndUpdate(
        diagnosticId,
        { $push: { scans: savedXray._id } },
        { new: true }
      );
    }

    res.status(201).json({
      message: "X-ray created successfully",
      xray: savedXray,
    });
  } catch (err) {
    console.error("❌ Error creating X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Update X-ray controller
export const updateXrayForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, xrayId } = req.params;
    const { title, price, preparation, reportTime } = req.body;
    const image = req.file ? `/uploads/xray-images/${req.file.filename}` : null;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required." });
    }

    // Prepare update object
    const updateData = { title, price, preparation, reportTime };
    if (image) updateData.image = image;

    const updatedXray = await Xray.findByIdAndUpdate(xrayId, updateData, {
      new: true,
    });

    if (!updatedXray) {
      return res.status(404).json({ message: "X-ray not found" });
    }

    res.status(200).json({
      message: "X-ray updated successfully",
      xray: updatedXray,
    });
  } catch (err) {
    console.error("❌ Error updating X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete X-ray controller
export const deleteXrayForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId, xrayId } = req.params;

    // Delete xray document
    const deletedXray = await Xray.findByIdAndDelete(xrayId);

    if (!deletedXray) {
      return res.status(404).json({ message: "X-ray not found" });
    }

    // Diagnostic se xray id remove karo
    if (diagnosticId) {
      await Diagnostic.findByIdAndUpdate(diagnosticId, {
        $pull: { scans: xrayId },
      });
    }

    res.status(200).json({ message: "X-ray deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAllXraysForDiagnostic = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: "Diagnostic ID is required." });
    }

    // Diagnostic find karo aur scans populate karo
    const diagnosticWithScans = await Diagnostic.findById(diagnosticId).populate('scans');

    if (!diagnosticWithScans) {
      return res.status(404).json({ message: "Diagnostic not found." });
    }

    res.status(200).json({
      message: "X-rays fetched successfully",
      scans: diagnosticWithScans.scans,
    });
  } catch (err) {
    console.error("❌ Error fetching X-rays:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 📥 Get all X-rays
export const getAllXrays = async (req, res) => {
  try {
    const xrays = await Xray.find().sort({ createdAt: -1 });
    res.status(200).json(xrays);
  } catch (err) {
    console.error("❌ Error fetching X-rays:", err);
    res.status(500).json({ message: "Server error" });
  }
};



export const updateXray = async (req, res) => {
  try {
    const { id } = req.params; // assuming id param for Xray document
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "X-ray ID is required." });
    }

    // Find and update the Xray document
    const updatedXray = await Xray.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedXray) {
      return res.status(404).json({ message: "X-ray not found." });
    }

    res.status(200).json({ message: "X-ray updated successfully.", xray: updatedXray });
  } catch (err) {
    console.error("❌ Error updating X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};




export const deleteXray = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "X-ray ID is required." });
    }

    const deletedXray = await Xray.findByIdAndDelete(id);

    if (!deletedXray) {
      return res.status(404).json({ message: "X-ray not found." });
    }

    res.status(200).json({ message: "X-ray deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 🔍 Get single X-ray by xrayId
export const getXrayById = async (req, res) => {
  try {
    const xray = await Xray.findById(req.params.xrayId);
    if (!xray) {
      return res.status(404).json({ message: "X-ray not found" });
    }
    res.status(200).json(xray);
  } catch (err) {
    console.error("❌ Error fetching X-ray:", err);
    res.status(500).json({ message: "Server error" });
  }
};



//diagnostic

export const createDiagnostic = async (req, res) => {
  try {
    const {
      name, email, password, phone, address, centerType, methodology,
      pathologyAccredited, gstNumber, centerStrength,
      location, country, state, city, pincode,
      visitType, homeCollectionSlots, centerVisitSlots,
      contactPersons, tests, packages, scans, network,
      description,
    } = req.body;

    // 🔍 Helper to parse stringified JSON fields
    const parseJsonField = (field, fieldName) => {
      if (!field) return [];
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (err) {
          console.error(`Failed to parse ${fieldName}:`, err.message);
          return [];
        }
      }
      return field;
    };

    // ✅ Parse fields
    const parsedContacts = parseJsonField(contactPersons, "contactPersons");
    const parsedTests = parseJsonField(tests, "tests");
    const parsedPackages = parseJsonField(packages, "packages");
    const parsedScans = parseJsonField(scans, "scans");
    const parsedHomeSlots = parseJsonField(homeCollectionSlots, "homeCollectionSlots");
    const parsedCenterSlots = parseJsonField(centerVisitSlots, "centerVisitSlots");

    // 📸 Handle uploaded images
    const files = req.files || [];
    
    // First image for diagnostic center
    const diagnosticImage = files[0] ? `/uploads/diagnostic-images/${files[0].filename}` : null;

    // Second image (X-ray)
    const xrayImage = files[1] ? `/uploads/xray-images/${files[1].filename}` : null;

    console.log('Diagnostic Image:', diagnosticImage);
    console.log('Xray Image:', xrayImage);

    // ✅ Insert Tests
    let testIds = [];
    if (parsedTests.length > 0) {
      try {
        const insertedTests = await Test.insertMany(parsedTests);
        testIds = insertedTests.map(t => t._id);
      } catch (e) {
        console.error("Test insertion error:", e);
        return res.status(400).json({ message: "Failed to insert tests", error: e.message });
      }
    }

    // ✅ Insert Packages
    let packageIds = [];
    if (parsedPackages.length > 0) {
      try {
        const pkgDocs = parsedPackages.map(pkg => ({
          name: pkg.packageName || pkg.name,
          price: pkg.price,
          description: pkg.description,
          precautions: pkg.instructions || pkg.precautions || '',
          totalTestsIncluded: pkg.totalTestsIncluded,
          includedTests: (pkg.includedTests || []).map(test => ({
            name: test.name,
            subTestCount: test.subTestCount,
            subTests: test.subTests || [],
          })),
        }));

        const insertedPackages = await Package.insertMany(pkgDocs);
        packageIds = insertedPackages.map(p => p._id);
      } catch (e) {
        console.error("Package insertion error:", e);
        return res.status(400).json({ message: "Failed to insert packages", error: e.message });
      }
    }

    // ✅ Insert Scans
    let scanIds = [];
    if (parsedScans.length > 0) {
      try {
        // Add x-ray image to the scans if present
        if (xrayImage) {
          parsedScans.forEach(scan => {
            scan.image = xrayImage; // Link the X-ray image to the scan (can be any scan, not just "Chest X-Ray")
          });
        }

        console.log('Scans being inserted with X-ray image:', parsedScans);

        const insertedScans = await Xray.insertMany(parsedScans);
        scanIds = insertedScans.map(s => s._id);
      } catch (e) {
        console.error("Scan insertion error:", e);
        return res.status(400).json({ message: "Failed to insert scans", error: e.message });
      }
    }

    // 🏥 Create Diagnostic Document
    const diagnostic = new Diagnostic({
      name, email, password, phone, address,
      image: diagnosticImage,  // Save diagnostic image in Diagnostic model
      centerType, methodology, pathologyAccredited, gstNumber,
      centerStrength, location, country, state, city, pincode,
      visitType,
      homeCollectionSlots: parsedHomeSlots,
      centerVisitSlots: parsedCenterSlots,
      contactPersons: parsedContacts,
      tests: testIds,
      packages: packageIds,
      scans: scanIds, // Reference scans here
      network,
      description
    });

    const savedDiagnostic = await diagnostic.save();

    // 🔗 Add diagnosticId references to other models
    await Promise.all([
      Test.updateMany({ _id: { $in: testIds } }, { diagnosticId: savedDiagnostic._id }),
      Package.updateMany({ _id: { $in: packageIds } }, { diagnosticId: savedDiagnostic._id }),
      Xray.updateMany({ _id: { $in: scanIds } }, { diagnosticId: savedDiagnostic._id }),
    ]);

    // 📦 Populate for response
    const populatedDiagnostic = await Diagnostic.findById(savedDiagnostic._id)
      .populate("tests")
      .populate("packages")
      .populate("scans");

    return res.status(201).json({
      message: "Diagnostic center created successfully",
      diagnostic: populatedDiagnostic,
    });

  } catch (error) {
    console.error("❌ Error creating diagnostic:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const addDiagnosticSlot = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slotType, day, date, timeSlot, isBooked = false } = req.body;

    if (!diagnosticId || !slotType || !day || !date || !timeSlot) {
      return res.status(400).json({
        message: "diagnosticId, slotType, day, date, and timeSlot are required."
      });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found." });
    }

    const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
    const exists = diagnostic[field].some(s => s.day === day && s.date === date && s.timeSlot === timeSlot);

    if (exists) {
      return res.status(409).json({ message: "Slot already exists." });
    }

    diagnostic[field].push({ day, date, timeSlot, isBooked });
    await diagnostic.save();

    return res.status(200).json({
      message: "Slot added successfully.",
      diagnostic
    });
  } catch (error) {
    console.error("❌ Error adding diagnostic slot:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const updateDiagnosticSlot = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slotType, day, date, timeSlot, newSlot } = req.body;
    const { newDay, newDate, newTimeSlot, isBooked } = newSlot || {};

    if (!diagnosticId || !slotType || !day || !date || !timeSlot || !newSlot) {
      return res.status(400).json({
        message: "diagnosticId, slotType, day, date, timeSlot, and newSlot are required."
      });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found." });
    }

    const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
    const updated = diagnostic[field].map(s => {
      if (s.day === day && s.date === date && s.timeSlot === timeSlot) {
        return { day: newDay, date: newDate, timeSlot: newTimeSlot, isBooked: isBooked ?? s.isBooked };
      }
      return s;
    });

    if (JSON.stringify(updated) === JSON.stringify(diagnostic[field])) {
      return res.status(404).json({ message: "No matching slot found to update." });
    }

    diagnostic[field] = updated;
    await diagnostic.save();

    return res.status(200).json({
      message: "Slot updated successfully.",
      diagnostic
    });
  } catch (error) {
    console.error("❌ Error updating diagnostic slot:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const deleteDiagnosticSlot = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slotType, day, date, timeSlot } = req.body;

   

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found." });
    }

    // ✅ Use correct field name
    const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';

    const originalLen = diagnostic[field].length;

    // ✅ Match based on day, date, and timeSlot
    diagnostic[field] = diagnostic[field].filter(
      s => !(s.day === day && s.date === date && s.timeSlot === timeSlot)
    );

    if (diagnostic[field].length === originalLen) {
      return res.status(404).json({ message: "No matching slot found to delete." });
    }

    await diagnostic.save();

    return res.status(200).json({ message: "Slot deleted successfully.", diagnostic });

  } catch (error) {
    console.error("❌ Error deleting diagnostic slot:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};





// 📥 Get all diagnostic centers
// 📥 Get all diagnostic centers
export const getAllDiagnostics = async (req, res) => {
  try {
    const diagnostics = await Diagnostic.find()
      .populate("tests")
      .populate("packages")
      .populate("scans");

    const now = moment();

    // Function to filter future slots
    const filterFutureSlots = (slots) => {
      return (slots || []).filter(slot => {
        const slotDateTime = moment(`${slot.date} ${slot.timeSlot}`, [
          'YYYY-MM-DD HH:mm',
          'YYYY-MM-DD H:mm',
          'YYYY-MM-DD h:mm A'
        ]);
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    // Map through each diagnostic and add filtered slots
    const filteredDiagnostics = diagnostics.map(diagnostic => {
      const diagnosticObj = diagnostic.toObject();
      return {
        ...diagnosticObj,
        homeCollectionSlots: filterFutureSlots(diagnosticObj.homeCollectionSlots),
        centerVisitSlots: filterFutureSlots(diagnosticObj.centerVisitSlots),
      };
    });

    res.status(200).json({
      message: "Diagnostics fetched successfully",
      data: filteredDiagnostics,
    });
  } catch (error) {
    console.error("❌ Error fetching diagnostics:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// 📥 Get single diagnostic center by ID
// 📥 Get single diagnostic center by ID
export const getDiagnosticById = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(diagnosticId)) {
      return res.status(400).json({ message: "Invalid diagnostic ID format" });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId)
      .populate("tests")
      .populate("packages")
      .populate("scans")
      .populate("contactPersons");

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found" });
    }

    const now = moment();

    // Function to filter out past slots
    const filterFutureSlots = (slots) => {
      return slots.filter(slot => {
        const slotDateTime = moment(`${slot.date} ${slot.timeSlot}`, [
          'YYYY-MM-DD HH:mm',
          'YYYY-MM-DD H:mm',
          'YYYY-MM-DD h:mm A'
        ]);
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    // Filter homeCollectionSlots and centerVisitSlots
    const filteredHomeSlots = filterFutureSlots(diagnostic.homeCollectionSlots || []);
    const filteredCenterSlots = filterFutureSlots(diagnostic.centerVisitSlots || []);

    const diagnosticData = {
      ...diagnostic.toObject(),
      homeCollectionSlots: filteredHomeSlots,
      centerVisitSlots: filteredCenterSlots
    };

    return res.status(200).json({
      message: "Diagnostic fetched successfully",
      diagnostic: diagnosticData,
    });

  } catch (error) {
    console.error("❌ Error fetching diagnostic by ID:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// 🧹 Delete diagnostic and its related data
export const deleteDiagnosticById = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    // Step 1: Find the diagnostic
    const diagnostic = await Diagnostic.findById(diagnosticId);

    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic not found" });
    }

    // Step 2: Delete associated tests
    if (diagnostic.tests && diagnostic.tests.length > 0) {
      await Test.deleteMany({ _id: { $in: diagnostic.tests } });
    }

    // Step 3: Delete associated packages
    if (diagnostic.packages && diagnostic.packages.length > 0) {
      await Package.deleteMany({ _id: { $in: diagnostic.packages } });
    }

    // Step 4: Delete associated scans
    if (diagnostic.scans && diagnostic.scans.length > 0) {
      await Scan.deleteMany({ _id: { $in: diagnostic.scans } });
    }

    // Step 5: Delete the diagnostic itself
    await Diagnostic.findByIdAndDelete(diagnosticId);

    res.status(200).json({ message: "✅ Diagnostic and all related data deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting diagnostic:", error);
    res.status(500).json({ message: "Server error" });
  }
};




export const editDiagnosticById = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const updateData = req.body;

    // Step 1: Find the diagnostic by ID
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found" });
    }

    // Step 2: Update only the provided fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        diagnostic[key] = updateData[key];
      }
    });

    // Step 3: Save the updated document
    await diagnostic.save();

    res.status(200).json({
      message: "Diagnostic center updated successfully",
      diagnostic,
    });
  } catch (error) {
    console.error("❌ Error updating diagnostic:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





// Controller for handling upload and storing the Hra object in the database
export const uploadHraImage = (req, res) => {
  uploadCategoryImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Image upload failed', error: err.message });
    }

    try {
      const { hraName, prescribed } = req.body;

      if (!hraName) {
        return res.status(400).json({ message: 'HRA name is required' });
      }

      const hraImage = req.file ? `/uploads/category-images/${req.file.filename}` : null;

      const newHra = new Hra({
        hraName,
        hraImage,
        prescribed: prescribed || '', // set to empty string if not provided
      });

      await newHra.save();

      return res.status(201).json({
        message: 'HRA created successfully',
        hra: newHra,
      });
    } catch (error) {
      console.error('Error saving HRA:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};



// Controller to update HRA
export const updateHra = async (req, res) => {
  uploadCategoryImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Image upload failed', error: err.message });
    }

    try {
      const { hraId } = req.params;
      const { hraName, prescribed } = req.body;

      const hra = await Hra.findById(hraId);
      if (!hra) {
        return res.status(404).json({ message: 'HRA not found' });
      }

      // Update name if provided
      if (hraName) hra.hraName = hraName;

      // Update prescribed if provided (string)
      if (typeof prescribed !== 'undefined') {
        hra.prescribed = prescribed;
      }

      // Update image if file uploaded
      if (req.file) {
        hra.hraImage = `/uploads/category-images/${req.file.filename}`;
      }

      await hra.save();

      return res.status(200).json({
        message: 'HRA updated successfully',
        hra,
      });
    } catch (error) {
      console.error('❌ Error updating HRA:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};



// Controller to delete HRA
export const deleteHra = async (req, res) => {
  try {
    const { hraId } = req.params;

    const hra = await Hra.findByIdAndDelete(hraId);
    if (!hra) {
      return res.status(404).json({ message: 'Hra not found' });
    }

    return res.status(200).json({ message: 'Hra deleted successfully' });
  } catch (error) {
    console.error('Error deleting Hra:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};




// Controller to get all HRAs
export const getAllHra = async (req, res) => {
  try {
    // Retrieve all HRAs from the database
    const hras = await Hra.find();  // This will fetch all documents from the Hra collection

    // Check if there are any HRAs
    if (!hras || hras.length === 0) {
      return res.status(404).json({ message: 'No HRAs found' });
    }

    // Return the list of HRAs
    return res.status(200).json({
      message: 'HRAs fetched successfully',
      hras,
    });
  } catch (error) {
    console.error('Error fetching HRAs:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};







export const createMultipleHraQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    for (let question of questions) {
      const { hraCategoryName, questionText, options } = question;

      if (!hraCategoryName || !questionText || !options || options.length === 0) {
        return res.status(400).json({ message: 'Each question must have a category name, text, and options' });
      }

      // Check each option has text and point
      for (let opt of options) {
        if (!opt.text || typeof opt.point !== 'number') {
          return res.status(400).json({ message: 'Each option must have text and point' });
        }
      }

      const hraCategory = await Hra.findOne({ hraName: hraCategoryName });

      if (!hraCategory) {
        return res.status(400).json({ message: `No category found with name ${hraCategoryName}` });
      }

      question.hraCategoryId = hraCategory._id;
    }

    const newQuestions = await HraQuestion.insertMany(
      questions.map((question) => ({
        hraCategoryId: question.hraCategoryId,
        hraCategoryName: question.hraCategoryName,
        question: question.questionText,
        options: question.options,
      }))
    );

    res.status(201).json({
      message: `${newQuestions.length} HRA Questions created successfully`,
      hraQuestions: newQuestions,
    });
  } catch (error) {
    console.error('Error creating HRA Questions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const getAllHraQuestions = async (req, res) => {
  try {
    const { hraCategoryName } = req.query;

    let hraQuestions;

    if (hraCategoryName && hraCategoryName.trim() !== '') {
      const trimmedName = hraCategoryName.trim();

      // Find the category using case-insensitive search
      const hraCategory = await Hra.findOne({
        hraName: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });

      if (!hraCategory) {
        return res.status(404).json({
          message: `No category found with the name "${trimmedName}"`,
        });
      }

      // Fetch questions based on hraCategoryId
      hraQuestions = await HraQuestion.find({
        hraCategoryId: hraCategory._id,
      }).select('hraCategoryId hraCategoryName question options');

      if (!hraQuestions.length) {
        return res.status(404).json({
          message: 'No HRA questions found for the given category',
        });
      }
    } else {
      // Fetch all HRA questions
      hraQuestions = await HraQuestion.find().select('hraCategoryId hraCategoryName question options');

      if (!hraQuestions.length) {
        return res.status(404).json({
          message: 'No HRA questions found',
        });
      }
    }

    return res.status(200).json({
      message: 'HRA Questions fetched successfully',
      hraQuestions,
    });
  } catch (error) {
    console.error('Error fetching HRA Questions:', error);
    return res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};



// Update a single HRA question by ID
export const updateHraQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { hraCategoryName, questionText, options } = req.body;

    // Validate options
    for (let opt of options) {
      if (!opt.text || typeof opt.point !== 'number') {
        return res.status(400).json({ message: 'Each option must have text and point' });
      }
    }

    // Find category to get hraCategoryId
    const hraCategory = await Hra.findOne({ hraName: hraCategoryName });
    if (!hraCategory) {
      return res.status(400).json({ message: `No category found with name ${hraCategoryName}` });
    }

    // Update the question
    const updatedQuestion = await HraQuestion.findByIdAndUpdate(
      id,
      {
        hraCategoryId: hraCategory._id,
        hraCategoryName,
        question: questionText,
        options,
      },
      { new: true } // return the updated doc
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'HRA Question not found' });
    }

    res.status(200).json({
      message: 'HRA Question updated successfully',
      hraQuestion: updatedQuestion,
    });
  } catch (error) {
    console.error('Error updating HRA Question:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a single HRA question by ID
export const deleteHraQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedQuestion = await HraQuestion.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'HRA Question not found' });
    }

    res.status(200).json({ message: 'HRA Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting HRA Question:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};





// Create blog with image upload
export const createBlog = async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageFile = req.file;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    if (!imageFile) {
      return res.status(400).json({ message: 'Blog image is required' });
    }

    const blog = new Blog({
      title,
      description,
      image: `/uploads/blog/${imageFile.filename}`, // Relative path for access
      createdBy: 'admin',
    });

    await blog.save();

    res.status(201).json({
      message: 'Blog created successfully',
      blog: {
        id: blog._id,
        title: blog.title,
        description: blog.description,
        image: blog.image,
        createdAt: blog.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Error creating blog:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// ✅ Jitsi Meet link generator
function generateJitsiLink() {
  const randomRoom = Math.random().toString(36).substring(2, 12);
  return `https://meet.jit.si/${randomRoom}`;
}


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_BxtRNvflG06PTV",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "RecEtdcenmR7Lm4AIEwo4KFr",
});

export const createDoctorConsultationBookingByAdmin = async (req, res) => {
  try {
    const {
      staffId,
      doctorId,
      day,
      date, // Expecting "YYYY-MM-DD"
      timeSlot,
      familyMemberId,
      type,
      transactionId
    } = req.body;

    if (!staffId || !doctorId || !date || !timeSlot || !type) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (!["Online", "Offline"].includes(type)) {
      return res.status(400).json({ message: "Invalid consultation type." });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const formattedDate = parsedDate.toISOString().split("T")[0]; // format: "YYYY-MM-DD"

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found." });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found." });

    const consultationFee = doctor.consultation_fee;
    if (!consultationFee || consultationFee <= 0) {
      return res.status(400).json({ message: "Invalid consultation fee." });
    }

    const availableDoctorBalance = staff.forDoctors || 0;

    let walletUsed = 0;
    let onlinePaymentUsed = 0;
    let paymentStatus = null;
    let paymentDetails = null;

    // Wallet logic
    if (availableDoctorBalance >= consultationFee) {
      walletUsed = consultationFee;
      staff.wallet_balance -= walletUsed;
      staff.forDoctors -= walletUsed;
    } else {
      walletUsed = availableDoctorBalance;
      onlinePaymentUsed = consultationFee - availableDoctorBalance;
      staff.wallet_balance -= walletUsed;
      staff.forDoctors = 0;

      if (!transactionId) {
        return res.status(402).json({
          message: "Insufficient wallet balance. Please provide transactionId for online payment.",
          walletAvailable: availableDoctorBalance,
          requiredOnline: onlinePaymentUsed,
        });
      }

      let paymentInfo = await razorpay.payments.fetch(transactionId);
      if (!paymentInfo) {
        return res.status(404).json({ message: "Payment not found." });
      }

      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(transactionId, onlinePaymentUsed * 100, "INR");
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          console.error("❌ Razorpay capture failed:", err);
          return res.status(500).json({ message: "Payment capture failed." });
        }
      }

      if (paymentInfo.status !== "captured") {
        return res.status(400).json({ message: `Payment not captured. Status: ${paymentInfo.status}` });
      }

      paymentStatus = paymentInfo.status;
      paymentDetails = paymentInfo;
    }

    if (walletUsed > 0) {
      staff.wallet_logs.push({
        type: "debit",
        forDoctors: walletUsed,
        forTests: 0,
        forPackages: 0,
        totalAmount: walletUsed,
        from: "Doctor Consultation (Admin)",
        date: new Date(),
      });
    }

    await staff.save();

    const meetingLink = type === "Online" ? "https://meet.google.com/kas-xfzh-irp" : null;

    // Generate unique doctorConsultationBookingId
    const lastBooking = await Booking.findOne({ doctorConsultationBookingId: { $exists: true } })
      .sort({ createdAt: -1 });

    let newBookingNumber = 1;
    if (lastBooking && lastBooking.doctorConsultationBookingId) {
      const parts = lastBooking.doctorConsultationBookingId.split('_');
      const lastNum = parseInt(parts[1]);
      if (!isNaN(lastNum)) {
        newBookingNumber = lastNum + 1;
      }
    }
    const formattedBookingId = `DoctorBookingId_${String(newBookingNumber).padStart(4, '0')}`;

    // Create booking
    const booking = new Booking({
      staffId,
      doctorId,
      familyMemberId,
      day,
      date: parsedDate,
      timeSlot,
      totalPrice: consultationFee,
      discount: 0,
      payableAmount: consultationFee,
      status: "Confirmed",
      type,
      meetingLink,
      isBooked: true,
      bookedSlot: {
        day,
        date: parsedDate,
        timeSlot
      },
      doctorConsultationBookingId: formattedBookingId,
      transactionId: transactionId || null,
      paymentStatus,
      paymentDetails,
      isSuccessfull: true,
    });

    const savedBooking = await booking.save();

    // 🔁 Update slot status in doctor object
    let updated = false;

    if (type === "Online") {
      doctor.onlineSlots = doctor.onlineSlots.map(slot => {
        if (
          slot.day.toLowerCase() === day.toLowerCase() &&
          slot.date === formattedDate &&
          slot.timeSlot === timeSlot &&
          !slot.isBooked
        ) {
          slot.isBooked = true;
          updated = true;
        }
        return slot;
      });
    } else if (type === "Offline") {
      doctor.offlineSlots = doctor.offlineSlots.map(slot => {
        if (
          slot.day.toLowerCase() === day.toLowerCase() &&
          slot.date === formattedDate &&
          slot.timeSlot === timeSlot &&
          !slot.isBooked
        ) {
          slot.isBooked = true;
          updated = true;
        }
        return slot;
      });
    }

    if (updated) {
      await doctor.save(); // important: persist updated slots
    }

    res.status(201).json({
      message: "Doctor consultation booked successfully by admin.",
      doctorConsultationBookingId: formattedBookingId,
      walletUsed,
      onlinePaymentUsed,
      remainingForDoctorsBalance: staff.forDoctors,
      walletBalance: staff.wallet_balance,
      booking: {
        ...savedBooking._doc,
        date: parsedDate.toISOString().split("T")[0],
        bookedSlot: {
          ...savedBooking.bookedSlot,
          date: parsedDate.toISOString().split("T")[0]
        }
      },
      meetingLink,
    });

  } catch (err) {
    console.error("❌ Admin booking error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// GET: Fetch all staff with family members
export const getAllStaff = async (req, res) => {
  try {
    const staffList = await Staff.find({}, { password: 0 }); // Exclude password if needed

    res.status(200).json({
      success: true,
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff data',
    });
  }
};


export const uploadDoctorReport = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No report file uploaded.' });
    }

    const filePath = `/uploads/reports/${req.file.filename}`;

    const booking = await Booking.findByIdAndUpdate(
      appointmentId,
      { $push: { doctorReports: filePath } },  // Push into doctorReports array
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    res.status(200).json({
      message: 'Doctor report uploaded successfully',
      reportPath: filePath,
      booking,
    });
  } catch (error) {
    console.error('Error uploading doctor report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const uploadDoctorPrescription = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No prescription file uploaded.' });
    }

    const filePath = `/uploads/doctorprescription/${req.file.filename}`;

    const booking = await Booking.findByIdAndUpdate(
      appointmentId,
      { $push: { doctorPrescriptions: filePath } }, // doctorPrescriptions should be an array in schema
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    res.status(200).json({
      message: 'Doctor prescription uploaded successfully',
      prescriptionPath: filePath,
      booking,
    });
  } catch (error) {
    console.error('Error uploading doctor prescription:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadBookingReport = (req, res) => {
  uploadDiagnosticReport(req, res, async function (err) {
    if (err) {
      console.error("❌ Multer Error:", err);
      return res.status(400).json({ success: false, message: "File upload failed", error: err.message });
    }

    const bookingId = req.params.bookingId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { report_file: `/uploads/diagnosticReport/${req.file.filename}` },
        { new: true }
      );

      if (!updatedBooking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Report uploaded and attached to booking successfully",
        booking: updatedBooking
      });
    } catch (error) {
      console.error("❌ Error updating booking with report:", error);
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  });
};



// 🧾 Upload Diagnostic Prescription
export const uploadDiagnosticPrescription = (req, res) => {
  uploadDiagPrescription(req, res, async function (err) {
    if (err) {
      console.error("❌ Multer Error:", err);
      return res.status(400).json({ success: false, message: "File upload failed", error: err.message });
    }

    const bookingId = req.params.bookingId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { diagPrescription: `/uploads/diagprescription/${req.file.filename}` },
        { new: true }
      );

      if (!updatedBooking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Diagnostic prescription uploaded successfully",
        booking: updatedBooking
      });
    } catch (error) {
      console.error("❌ Error updating booking:", error);
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  });
};


// Diagnostic Booking ID generator
const generateDiagnosticBookingId = async () => {
  const lastBooking = await Booking.findOne({})
    .sort({ createdAt: -1 })
    .select("diagnosticBookingId");

  if (!lastBooking || !lastBooking.diagnosticBookingId) {
    return "DIA-0001";
  }

  const lastId = parseInt(lastBooking.diagnosticBookingId.split("-")[1]);
  const newId = (lastId + 1).toString().padStart(4, "0");
  return `DIA-${newId}`;
};

export const createPackageBookingByAdmin = async (req, res) => {
  try {
    const {
      staffId,
      familyMemberId,
      diagnosticId,
      packageId,
      serviceType,
      date,
      timeSlot,
      transactionId,
    } = req.body;

    // Validate required fields
    if (
      !staffId ||
      !familyMemberId ||
      !diagnosticId ||
      !packageId ||
      !serviceType ||
      !date ||
      !timeSlot
    ) {
      return res
        .status(400)
        .json({ message: "All fields are required.", isSuccessfull: false });
    }

    // Validate service type
    if (!["Home Collection", "Center Visit"].includes(serviceType)) {
      return res
        .status(400)
        .json({ message: "Invalid service type", isSuccessfull: false });
    }

    // Fetch staff
    const staff = await Staff.findById(staffId);
    if (!staff)
      return res
        .status(404)
        .json({ message: "Staff not found", isSuccessfull: false });

    // Fetch package data
    const packageData = await Package.findById(packageId);
    if (!packageData)
      return res
        .status(404)
        .json({ message: "Package not found", isSuccessfull: false });

    const payableAmount = packageData.offerPrice || packageData.price;

    const availableBalance = staff.wallet_balance || 0;

    let walletUsed = 0;
    let onlinePaymentUsed = 0;
    let paymentStatus = null;
    let paymentDetails = null;

    // Wallet and payment logic
    if (availableBalance >= payableAmount) {
      walletUsed = payableAmount;
      staff.wallet_balance -= walletUsed;
    } else {
      walletUsed = availableBalance;
      onlinePaymentUsed = payableAmount - availableBalance;
      staff.wallet_balance = 0;

      if (!transactionId) {
        return res.status(402).json({
          message: `Insufficient wallet balance. ₹${onlinePaymentUsed.toFixed(
            2
          )} more needed. Please provide transactionId for online payment.`,
          isSuccessfull: false,
          walletAvailable: availableBalance,
          requiredOnline: onlinePaymentUsed,
        });
      }

      let paymentInfo;
      try {
        paymentInfo = await razorpay.payments.fetch(transactionId);
      } catch {
        return res
          .status(404)
          .json({ message: "Payment not found", isSuccessfull: false });
      }

      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(transactionId, paymentInfo.amount, "INR");
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          console.error("❌ Razorpay capture failed:", err);
          return res
            .status(500)
            .json({ message: "Payment capture failed", isSuccessfull: false });
        }
      }

      if (paymentInfo.status !== "captured") {
        return res.status(400).json({
          message: `Payment not captured. Status: ${paymentInfo.status}`,
          isSuccessfull: false,
        });
      }

      paymentStatus = paymentInfo.status;
      paymentDetails = paymentInfo;
    }

    // Wallet log if wallet used
    if (walletUsed > 0) {
      staff.wallet_logs.push({
        type: "debit",
        forTests: 0,
        forDoctors: 0,
        forPackages: walletUsed,
        totalAmount: walletUsed,
        from: "Package Booking",
        date: new Date(),
      });
    }

    await staff.save();

    // Generate diagnosticBookingId
    const diagnosticBookingId = await generateDiagnosticBookingId();

    // Format date
    const bookingDate = moment(date, ["YYYY-MM-DD", "DD/MM/YYYY"]).format(
      "YYYY-MM-DD"
    );

    // Create booking
    const booking = new Booking({
      staffId,
      familyMemberId,
      diagnosticId,
      serviceType,
      date: bookingDate,
      timeSlot,
      packageId,
      totalPrice: packageData.price,
      discount: packageData.price - payableAmount,
      payableAmount,
      status: "Confirmed",
      transactionId: transactionId || null,
      paymentStatus,
      paymentDetails,
      isSuccessfull: true,
      createdByAdmin: true,
      diagnosticBookingId, // Added here
    });

    const savedBooking = await booking.save();

    // Mark diagnostic slot as booked
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (diagnostic) {
      let updated = false;

      if (serviceType === "Home Collection") {
        diagnostic.homeCollectionSlots = diagnostic.homeCollectionSlots.map(
          (slot) => {
            if (
              slot.date === bookingDate &&
              slot.timeSlot === timeSlot &&
              !slot.isBooked
            ) {
              slot.isBooked = true;
              updated = true;
            }
            return slot;
          }
        );
      } else if (serviceType === "Center Visit") {
        diagnostic.centerVisitSlots = diagnostic.centerVisitSlots.map((slot) => {
          if (
            slot.date === bookingDate &&
            slot.timeSlot === timeSlot &&
            !slot.isBooked
          ) {
            slot.isBooked = true;
            updated = true;
          }
          return slot;
        });
      }

      if (updated) await diagnostic.save();
    }

    // Add notification to staff
    staff.notifications.push({
      title: "Package Booking Confirmed",
      message: `Your package booking for ${bookingDate} at ${timeSlot} has been confirmed.`,
      timestamp: new Date(),
      bookingId: savedBooking._id,
    });

    await staff.save();

    // Response
    return res.status(201).json({
      message: "Package booking successfully created by admin.",
      booking: savedBooking,
      walletUsed,
      onlinePaymentUsed,
      walletBalance: staff.wallet_balance,
      isSuccessfull: true,
      diagnosticBookingId,
    });
  } catch (err) {
    console.error("❌ Error in admin package booking:", err);
    return res
      .status(500)
      .json({ message: "Server error", isSuccessfull: false, error: err.message });
  }
};

// Create a new Test
export const createTestName = async (req, res) => {
  try {
    const { testName } = req.body;

    if (!testName) {
      return res.status(400).json({ message: "Test name is required" });
    }

    const newTest = new TestName({ testName });
    await newTest.save();

    res.status(201).json({
      message: "Test created successfully",
      test: newTest,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all Tests
export const getAllTestsName = async (req, res) => {
  try {
    const tests = await TestName.find().sort({ createdAt: -1 });

    res.status(200).json({ tests });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Edit/Update Test by ID
export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { testName } = req.body;

    const updatedTest = await TestName.findByIdAndUpdate(
      id,
      { testName },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({
      message: "Test updated successfully",
      test: updatedTest,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Test by ID
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTest = await TestName.findByIdAndDelete(id);

    if (!deletedTest) {
      return res.status(404).json({ message: "Test not found" });
    }

    res.status(200).json({ message: "Test deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// 📌 Get country suggestions
export const getCountries = async (req, res) => {
  try {
    const search = req.query.search?.toLowerCase() || '';
    const countries = Country.getAllCountries();

    const filtered = countries.filter(c =>
      c.name.toLowerCase().includes(search)
    );

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting countries', error });
  }
};

// 📌 Get state suggestions
export const getStates = async (req, res) => {
  try {
    const { countryCode, search = '' } = req.query;

    if (!countryCode) {
      return res.status(400).json({ success: false, message: 'countryCode is required' });
    }

    const states = State.getStatesOfCountry(countryCode);

    const filtered = states.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting states', error });
  }
};

// 📌 Get city suggestions
export const getCities = async (req, res) => {
  try {
    const { countryCode, stateCode, search = '' } = req.query;

    if (!countryCode || !stateCode) {
      return res.status(400).json({ success: false, message: 'countryCode and stateCode are required' });
    }

    const cities = City.getCitiesOfState(countryCode, stateCode);

    const filtered = cities.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting cities', error });
  }
};



export const bulkUploadTestsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const filePath = req.file.path;

    const testArray = await csv().fromFile(filePath);

    // 🔍 Map to DB format (column must be: testName)
    const formattedTests = testArray
      .filter((row) => row.testName) // Skip empty rows
      .map((row) => ({
        testName: row.testName.trim(),
      }));

    if (!formattedTests.length) {
      return res.status(400).json({ message: 'No valid test entries found in CSV' });
    }

    const inserted = await TestName.insertMany(formattedTests);

    res.status(201).json({
      message: 'Tests uploaded successfully',
      insertedCount: inserted.length,
      data: inserted,
    });
  } catch (error) {
    console.error('Error uploading test CSV:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// ✅ Bulk Upload Controller
export const bulkUploadTestsFromCSVForDiag = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: 'Diagnostic ID is required in params' });
    }

    // ✅ Check if Diagnostic exists
    const diagnosticExists = await Diagnostic.findById(diagnosticId);
    if (!diagnosticExists) {
      return res.status(404).json({ message: 'Diagnostic not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const csvData = await csv().fromFile(req.file.path);

    const formattedTests = csvData
      .filter(row => row.name || row.test_name)
      .map(row => ({
        name: (row.name || row.test_name || '').trim(),
        description: row.description?.trim() || '',
        price: parseFloat(row.price) || 0,
        reportHour: row.reportHour ? parseInt(row.reportHour, 10) : undefined,
        instruction: row.instruction?.trim() || '',
        precaution: row.precaution?.trim() || '',
        fastingRequired: row.fastingRequired?.toLowerCase() === 'true',
        homeCollectionAvailable: row.homeCollectionAvailable?.toLowerCase() === 'true',
        reportIn24Hrs: row.reportIn24Hrs?.toLowerCase() === 'true',
        image: row.image?.trim() || null,
        category: row.category?.trim() || 'General',
        diagnosticId,
      }));

    if (!formattedTests.length) {
      return res.status(400).json({ message: 'No valid test entries found' });
    }

    // ✅ Insert tests
    const insertedTests = await Test.insertMany(formattedTests);

    // ✅ Update Diagnostic: push test _ids into tests array
    const insertedIds = insertedTests.map(test => test._id);
    await Diagnostic.findByIdAndUpdate(diagnosticId, {
      $push: { tests: { $each: insertedIds } },
    });

    res.status(201).json({
      message: 'Tests uploaded and linked to diagnostic successfully',
      insertedCount: insertedTests.length,
      data: insertedTests,
    });
  } catch (error) {
    console.error('❌ Error uploading tests CSV:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const bulkUploadPackagesFromCSV = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: 'Diagnostic ID is required in params' });
    }

    // ✅ Check if diagnostic exists
    const diagnosticExists = await Diagnostic.findById(diagnosticId);
    if (!diagnosticExists) {
      return res.status(404).json({ message: 'Diagnostic not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    // ✅ Parse CSV file
    const filePath = req.file.path;
    const csvData = await csv().fromFile(filePath);

    // ✅ Format each package from CSV
    const formattedPackages = csvData
      .filter(row => row.name)
      .map(row => ({
        name: row.name?.trim() || '',
        price: parseFloat(row.price) || 0,
        doctorInfo: row.doctorInfo?.trim() || '',
        totalTestsIncluded: parseInt(row.totalTestsIncluded) || 0,
        description: row.description?.trim() || '',
        precautions: row.precautions?.trim() || '',
        includedTests: row.includedTests
          ? JSON.parse(row.includedTests) // should be a JSON stringified array
          : [],
        diagnosticId,
      }));

    if (formattedPackages.length === 0) {
      return res.status(400).json({ message: 'No valid packages found in CSV' });
    }

    // ✅ Insert all packages
    const insertedPackages = await Package.insertMany(formattedPackages);

    // ✅ Get their IDs
    const insertedIds = insertedPackages.map(pkg => pkg._id);

    // ✅ Push those IDs into the diagnostic
    await Diagnostic.findByIdAndUpdate(diagnosticId, {
      $addToSet: { packages: { $each: insertedIds } }, // avoids duplicates
    });

    res.status(201).json({
      message: 'Packages uploaded and linked to Diagnostic successfully',
      insertedCount: insertedPackages.length,
      data: insertedPackages,
    });
  } catch (error) {
    console.error('❌ Error uploading package CSV:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};





export const importXrayCSV = async (req, res) => {
  try {
    const { diagnosticId } = req.params;

    if (!diagnosticId) {
      return res.status(400).json({ message: 'Diagnostic ID is required in params' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' });
    }

    const jsonArray = await csv().fromFile(req.file.path);

    const xrayData = jsonArray.map(row => ({
      title: row.title?.trim(),
      price: parseFloat(row.price) || 0,
      preparation: row.preparation?.trim() || '',
      reportTime: row.reportTime?.trim() || '',
      image: row.image?.trim() || "",
      diagnosticId,  // Add diagnosticId here for reference if needed
    }));

    // Insert all Xray documents
    const insertedXrays = await Xray.insertMany(xrayData);

    // Extract inserted IDs
    const insertedIds = insertedXrays.map(xray => xray._id);

    // Push inserted Xray IDs into Diagnostic's scans array (avoid duplicates)
    await Diagnostic.findByIdAndUpdate(diagnosticId, {
      $addToSet: { scans: { $each: insertedIds } },
    });

    res.status(200).json({
      message: 'X-ray data imported and linked to Diagnostic successfully',
      insertedCount: insertedXrays.length,
      data: insertedXrays,
    });
  } catch (err) {
    console.error('Error importing X-ray CSV:', err);
    res.status(500).json({
      message: 'Failed to import X-ray data',
      error: err.message,
    });
  }
};


export const updateMeetingLink = async (req, res) => {
  const { id } = req.params;
  const { meeting_link } = req.body;

  if (!meeting_link || meeting_link.trim() === "") {
    return res.status(400).json({ message: "Meeting link is required" });
  }

  try {
    const appointment = await Booking.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.meetingLink = meeting_link.trim();
    await appointment.save();

    res.status(200).json({
      message: "Meeting link updated",
      appointment,
    });
  } catch (error) {
    console.error("❌ Error updating meeting link:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};



export const bulkUploadStaffProfiles = async (req, res) => {
  try {
    const { companyId } = req.params;
    const staffList = req.body.staff; // frontend should send { staff: [...] }

    // 🔐 Validation
    if (!Array.isArray(staffList) || staffList.length === 0) {
      return res.status(400).json({ message: "Staff data array is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company ID format" });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const savedStaffs = [];
    const failedEntries = [];

    for (const staffData of staffList) {
      try {
        // 🔁 Destructure and clean input
        const {
          name,
          email,
          password,
          contact_number,
          address,
          dob,
          gender,
          age,
          department,
          designation,
          role
        } = staffData;

        // Create new staff
        const newStaff = new Staff({
          name,
          email,
          password,
          contact_number,
          address,
          dob,
          gender,
          age,
          department,
          designation,
          role: role || "User",
          wallet_balance: 0
        });

        const saved = await newStaff.save();

        // Prepare minimal staff object for company.staff array
        const staffForCompany = {
          _id: saved._id,
          name: saved.name,
          role: saved.role,
          contact_number: saved.contact_number,
          email: saved.email,
          dob: saved.dob,
          gender: saved.gender,
          age: saved.age,
          address: saved.address,
          wallet_balance: saved.wallet_balance,
          department: saved.department,
          designation: saved.designation,
        };

        // Push into company's staff array
        await Company.findByIdAndUpdate(companyId, {
          $push: { staff: staffForCompany }
        });

        savedStaffs.push(saved);
      } catch (err) {
        console.error("Error saving staff:", err.message);
        failedEntries.push({ email: staffData.email || "Unknown", error: err.message });
      }
    }

   res.status(200).json({
  message: "Bulk staff upload completed",
  totalUploaded: savedStaffs.length,
  totalFailed: failedEntries.length,
  failedEntries,
  savedStaffs  // <-- yeh add karo
});


  } catch (error) {
    console.error("❌ Bulk staff upload error:", error);
    res.status(500).json({
      message: "Server error during bulk staff upload",
      error: error.message,
    });
  }
};