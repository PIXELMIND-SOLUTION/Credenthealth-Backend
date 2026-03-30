import Admin from '../Models/Admin.js';
import generateToken from '../config/jwtToken.js';
import Staff from '../Models/staffModel.js';
import Doctor from '../Models/doctorModel.js';
import { uploadDocuments, uploadTestImages, uploadCompanyAssets, uploadStaffImages, uploadDoctorImage, uploadCategoryImage, uploadDiagnosticReport, uploadDiagPrescription, uploadStaffProfile, uploadBlogImage, uploadBannerImages } from '../config/multerConfig.js';
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
import TestName from '../Models/TestName.js';
import { Country, State, City } from 'country-state-city';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js"; // ✅ add `.js`
import path from 'path';
import csv from "csvtojson";
import { fileURLToPath } from "url";
import Razorpay from 'razorpay';

import dotenv from 'dotenv'
import nodemailer from "nodemailer";
import moment from "moment-timezone";
import cron from "node-cron";
import Employee from '../Models/Employee.js';
import Banner from '../Models/Banner.js';
import { HraSubmission } from '../Models/HraSubmission.js';
import SimpleQuestion from '../Models/SimpleQuestion.js';
import admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import csvParser from "csv-parser";
import Cart from '../Models/Cart.js';




dotenv.config();

// ✅ Replace __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account JSON
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

// Read JSON file
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK with service account credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});




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
        role: admin.role
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

    // Check valid company ID
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company ID format" });
    }

    // Handle file uploads
    uploadStaffImages(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          message: "File upload error",
          error: err.message,
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
        branch,
        employeeId,
      } = req.body;

      // Validate required fields including employeeId
      if (!employeeId) {
        return res.status(400).json({
          message: "Employee ID is required",
        });
      }

      // Check if staff with same email exists
      const existingStaffByEmail = await Staff.findOne({ email });
      if (existingStaffByEmail) {
        return res.status(400).json({
          message: "Staff with this email already exists",
        });
      }

      // Check if staff with same employee ID exists
      const existingStaffByEmployeeId = await Staff.findOne({ employeeId });
      if (existingStaffByEmployeeId) {
        return res.status(400).json({
          message: "Staff with this Employee ID already exists",
        });
      }

      // Handle uploaded images
      const profileImage = req.files?.profileImage?.[0]
        ? `/uploads/staffimages/${req.files.profileImage[0].filename}`
        : null;

      const idImage = req.files?.idImage?.[0]
        ? `/uploads/staffimages/${req.files.idImage[0].filename}`
        : null;

      // Make branch optional
      const branchValue = branch && branch !== "" ? branch : null;

      // Create staff with employeeId
      const staff = new Staff({
        employeeId, // ✅ Employee ID manually entered by user
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
        branch: branchValue,
        wallet_balance: 0,
        profileImage,
        idImage,
      });

      const savedStaff = await staff.save();

      // Prepare staff info for company
      const staffInfoForCompany = {
        _id: savedStaff._id,
        employeeId: savedStaff.employeeId, // ✅ Include employeeId in company staff array
        name: savedStaff.name,
        role: savedStaff.role,
        contact_number: savedStaff.contact_number,
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
        branch: savedStaff.branch || null,
        mailSent: false,
        mailSentAt: null
      };

      // Push staff to company's staff array
      const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        { $push: { staff: staffInfoForCompany } },
        { new: true }
      );

      if (!updatedCompany) {
        await Staff.findByIdAndDelete(savedStaff._id);
        return res.status(404).json({ message: "Company not found" });
      }

      // Respond success
      res.status(201).json({
        message: "Staff created successfully",
        staffId: savedStaff._id,
        employeeId: savedStaff.employeeId, // ✅ Return employeeId in response
        staff: savedStaff,
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


export const sendStaffCredentialsEmail = async (req, res) => {
  try {
    const { staffId, companyId } = req.params;

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Find staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: "Staff not found" 
      });
    }

    // Email Transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "support@credenthealth.com",
        pass: "jwrxbxngjlbphydn",
      },
    });

    // ✅ FULL EMAIL CONTENT EXACTLY LIKE YOUR ORIGINAL
    const mailOptions = {
      from: "support@credenthealth.com",
      to: staff.email,
      subject: "Your CredentHealth Login Credentials",
      text: `Dear ${staff.name},\n
Your account on the CredentHealth Portal has been successfully created. Please find your login details below:\n
Website: https://credenthealth.com/\n
Login ID: ${staff.email}
Password: ${staff.password}\n
You may now log in using the above credentials to access your account and portal services.\n
If you require any assistance, please reach out to our support team at support@credenthealth.com.\n
Thank you for choosing CredentHealth.\n
Warm regards,
Team CredentHealth
CredentHealth | Elthium Healthcare Pvt. Ltd.
https://credenthealth.com/`
    };

    // Send Email
    await transporter.sendMail(mailOptions);

    // ✅ UPDATE 1: Staff document mein mailSent field ko true karo
    await Staff.findByIdAndUpdate(
      staffId,
      { 
        $set: { 
          mailSent: true,
          mailSentAt: new Date()
        } 
      },
      { new: true }
    );

    // ✅ UPDATE 2: Company ke staff array mein add/update karo
    const companyUpdateResult = await Company.findByIdAndUpdate(
      companyId,
      {
        $addToSet: {
          staff: {
            _id: staff._id,
            userId: staff.userId,
            name: staff.name,
            role: staff.role,
            contact_number: staff.contact_number,
            email: staff.email,
            dob: staff.dob,
            gender: staff.gender,
            age: staff.age,
            address: staff.address,
            profileImage: staff.profileImage,
            idImage: staff.idImage,
            wallet_balance: staff.wallet_balance || 0,
            department: staff.department,
            designation: staff.designation,
            branch: staff.branch,
            mailSent: true,
            mailSentAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!companyUpdateResult) {
      console.warn(`⚠️ Company with ID ${companyId} not found`);
    }

    console.log(`✅ Email sent successfully to ${staff.email}`);
    console.log(`✅ Updated mailSent field for staff ${staffId}`);
    console.log(`✅ Added/Updated staff in company ${companyId}`);

    res.status(200).json({
      success: true,
      message: "Credentials email sent successfully",
      staffId: staff._id,
      email: staff.email,
      mailSent: true,
      mailSentAt: new Date(),
      companyUpdated: !!companyUpdateResult
    });

  } catch (error) {
    console.error("❌ Email sending error:", error);
    res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error.message,
    });
  }
};


export const sendBulkEmail = async (req, res) => {
  try {
    const { staffIds, companyId } = req.body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs are required'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Email Transporter Setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "support@credenthealth.com",
        pass: "jwrxbxngjlbphydn",
      },
    });

    // Fetch all staff members from database
    const staffMembers = await Staff.find({ 
      _id: { $in: staffIds } 
    });

    if (staffMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No staff members found with the provided IDs'
      });
    }

    // Send email to each staff member
    const emailPromises = staffMembers.map(async (staff) => {
      const mailOptions = {
        from: "support@credenthealth.com",
        to: staff.email,
        subject: "Your CredentHealth Login Credentials",
        text: `Dear ${staff.name},\n
Your account on the CredentHealth Portal has been successfully created. Please find your login details below:\n
Website: https://credenthealth.com/\n
Login ID: ${staff.email}
Password: ${staff.password}\n
You may now log in using the above credentials to access your account and portal services.\n
If you require any assistance, please reach out to our support team at support@credenthealth.com.\n
Thank you for choosing CredentHealth.\n
Warm regards,
Team CredentHealth
CredentHealth | Elthium Healthcare Pvt. Ltd.
https://credenthealth.com/`
      };

      return transporter.sendMail(mailOptions);
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    // ✅ UPDATE 1: Staff documents mein mailSent field ko true karo
    const updateStaffPromises = staffMembers.map(async (staff) => {
      return Staff.findByIdAndUpdate(
        staff._id,
        { 
          $set: { 
            mailSent: true,
            mailSentAt: new Date()
          } 
        },
        { new: true }
      );
    });

    await Promise.all(updateStaffPromises);

    // ✅ UPDATE 2: Company ke staff array mein add/update karo
    const companyUpdateResult = await Company.findByIdAndUpdate(
      companyId,
      {
        $addToSet: {
          staff: {
            $each: staffMembers.map(staff => ({
              _id: staff._id,
              userId: staff.userId,
              name: staff.name,
              role: staff.role,
              contact_number: staff.contact_number,
              email: staff.email,
              dob: staff.dob,
              gender: staff.gender,
              age: staff.age,
              address: staff.address,
              profileImage: staff.profileImage,
              idImage: staff.idImage,
              wallet_balance: staff.wallet_balance || 0,
              department: staff.department,
              designation: staff.designation,
              branch: staff.branch,
              mailSent: true, // ✅ Add mailSent field
              mailSentAt: new Date() // ✅ Add mailSentAt timestamp
            }))
          }
        }
      },
      { new: true }
    );

    if (!companyUpdateResult) {
      console.warn(`⚠️ Company with ID ${companyId} not found`);
    }

    console.log(`✅ Bulk email sent successfully to ${staffMembers.length} staff members`);
    console.log(`✅ Updated mailSent field for ${staffMembers.length} staff members`);
    console.log(`✅ Added/Updated ${staffMembers.length} staff in company ${companyId}`);

    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${staffMembers.length} users`,
      sentCount: staffMembers.length,
      staffEmails: staffMembers.map(staff => staff.email),
      mailSentUpdated: true,
      companyUpdated: true
    });

  } catch (error) {
    console.error("❌ Bulk email sending error:", error);
    res.status(500).json({
      success: false,
      message: 'Email sending failed',
      error: error.message
    });
  }
};


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// Function to send push notifications via FCM
const sendPushNotification = (staff) => {
  const message = {
    notification: {
      title: 'Account Created',
      body: `Dear ${staff.name}, your account has been created. Login ID: ${staff.email}, Password: ${staff.password}`,
    },
    token: staff.fcmToken,  // FCM token stored in the database
  };

  console.log(`Sending push notification to ${staff.name} (${staff.email})`);
  console.log('Message Details:', message);

  return admin.messaging().send(message)
    .then(response => ({
      name: staff.name,
      email: staff.email,
      status: 'success',
      response
    }))
    .catch(error => ({
      name: staff.name,
      email: staff.email,
      status: 'failed',
      error: error.message
    }));
};

// Function to handle bulk sending notifications
export const sendBulkSMS = functions.https.onRequest(async (req, res) => {
  const { staffIds, companyId } = req.body;

  // Read projectId / productId from query parameter
  const projectId = req.query.projectId || 'Not Provided';
  console.log('Project / Product ID from query:', projectId);

  if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Staff IDs are required',
      projectId
    });
  }

  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: 'Company ID is required',
      projectId
    });
  }

  try {
    const staffMembers = await Staff.find({ '_id': { $in: staffIds } }).exec();

    if (staffMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No staff members found with the provided IDs',
        projectId
      });
    }

    console.log(`Fetched ${staffMembers.length} staff members from the database.`);
    staffMembers.forEach(staff => {
      console.log(`Staff Details: Name - ${staff.name}, Email - ${staff.email}, FCM Token - ${staff.fcmToken}`);
    });

    const notificationResults = await Promise.all(staffMembers.map(staff => sendPushNotification(staff)));

    console.log('Notification Results:', notificationResults);

    res.status(200).json({
      success: true,
      message: `Push notifications sent successfully to ${staffMembers.length} staff members`,
      projectId,                // Added projectId to response
      results: notificationResults
    });

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk notifications',
      projectId,
      error: error.message
    });
  }
});

export const editStaffProfile = async (req, res) => {
  const { staffId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ message: "Invalid staff ID format" });
  }

  try {
    const updatedFields = req.body; // Dynamically handle all fields

    // 1. Update Staff model
    await Staff.findByIdAndUpdate(staffId, updatedFields, {
      new: true,
      runValidators: true,
    });

    // 2. Fetch updated staff
    const updatedStaff = await Staff.findById(staffId);

    if (!updatedStaff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // 3. Prepare allowed fields to update inside Company.staff[]
    const companyUpdateFields = {};
    const allowedFields = [
      "name",
      "role",
      "contact_number",
      "email",
      "dob",
      "gender",
      "age",
      "address",
      "branch"   // ✅ Added branch support
    ];

    allowedFields.forEach((field) => {
      if (updatedFields[field] !== undefined) {
        const key = `staff.$.${field === "contact_number" ? "contact" : field}`;
        companyUpdateFields[key] = updatedFields[field];
      }
    });

    // 4. Update embedded staff inside Company model
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

// controllers/staffController.js
export const addAmountToWallet = async (req, res) => {
  try {
    const { staffId, companyId } = req.params; // companyId bhi aayega but hum sirf check karenge
    const { forTests = 0, forDoctors = 0, forPackages = 0, from = "Admin" } = req.body;

    console.log('Received request for staff:', staffId);

    const totalAmount = forTests + forDoctors + forPackages;

    if (totalAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Amount must be greater than zero' 
      });
    }

    // 1. Pehle company check karo
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: "Company not found" 
      });
    }

    // 2. Check karo ki staff company ke staff array mein hai
    if (!company.staff || !Array.isArray(company.staff)) {
      return res.status(404).json({ 
        success: false,
        message: "No staff found in company" 
      });
    }

    // Staff ID ko string mein convert karo for comparison
    const staffExists = company.staff.some(staff => {
      if (!staff || !staff._id) return false;
      
      // Check both string and ObjectId formats
      const staffIdStr = typeof staff._id === 'object' ? staff._id.toString() : staff._id;
      return staffIdStr === staffId;
    });

    console.log('Staff exists in company array:', staffExists);
    console.log('Company staff IDs:', company.staff.map(s => s?._id));

    if (!staffExists) {
      return res.status(404).json({ 
        success: false,
        message: "Staff not found in this company's staff list" 
      });
    }

    // 3. Ab directly Staff DB mein update karo
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: "Staff not found in database" 
      });
    }

    // 4. Update wallet
    staff.wallet_balance = (staff.wallet_balance || 0) + totalAmount;
    staff.forTests = (staff.forTests || 0) + forTests;
    staff.forDoctors = (staff.forDoctors || 0) + forDoctors;
    staff.forPackages = (staff.forPackages || 0) + forPackages;
    staff.totalAmount = staff.forTests + staff.forDoctors + staff.forPackages;

    // 5. Add log
    if (!staff.wallet_logs) {
      staff.wallet_logs = [];
    }
    
    staff.wallet_logs.push({
      type: "credit",
      forTests,
      forDoctors,
      forPackages,
      totalAmount,
      from,
      date: new Date()
    });

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Amount added successfully",
      staffId: staff._id,
      staffName: staff.name,
      employeeId: staff.employeeId || 'N/A',
      wallet_balance: staff.wallet_balance,
      forTests: staff.forTests,
      forDoctors: staff.forDoctors,
      forPackages: staff.forPackages,
      totalAmount: staff.totalAmount
    });

  } catch (error) {
    console.error("Error in addAmountToWallet:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error", 
      error: error.message 
    });
  }
};


// Add amount to selected staff members
export const addAmountToAllStaff = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { 
      staffIds, // Array of selected staff IDs
      forTests = 0, 
      forDoctors = 0, 
      forPackages = 0, 
      from = "Admin" 
    } = req.body;

    console.log('Adding amount to selected staff:', {
      companyId,
      staffIds,
      staffCount: staffIds?.length || 0,
      forTests,
      forDoctors,
      forPackages
    });

    const totalAmount = forTests + forDoctors + forPackages;

    // Validate inputs
    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Please select at least one staff member' 
      });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Amount must be greater than zero' 
      });
    }

    // 1. Company check
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ 
        success: false,
        message: "Company not found" 
      });
    }

    // 2. Get all staff from company to validate
    if (!company.staff || !Array.isArray(company.staff) || company.staff.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No staff found in this company" 
      });
    }

    const companyStaffIds = company.staff
      .filter(staff => staff && staff._id)
      .map(staff => typeof staff._id === 'object' ? staff._id.toString() : staff._id);

    // 3. Validate that selected staff belong to this company
    const invalidStaffIds = [];
    const validStaffIds = [];

    staffIds.forEach(staffId => {
      if (companyStaffIds.includes(staffId.toString())) {
        validStaffIds.push(staffId.toString());
      } else {
        invalidStaffIds.push(staffId.toString());
      }
    });

    if (invalidStaffIds.length > 0) {
      console.log('Invalid staff IDs (not in company):', invalidStaffIds);
    }

    if (validStaffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the selected staff belong to this company',
        invalidStaffIds
      });
    }

    console.log('Valid staff IDs to update:', validStaffIds);
    console.log('Total selected staff count:', validStaffIds.length);

    const results = {
      totalSelected: staffIds.length,
      validStaffCount: validStaffIds.length,
      invalidStaffCount: invalidStaffIds.length,
      updatedCount: 0,
      failedCount: 0,
      successStaff: [],
      failedStaff: [],
      invalidStaffIds
    };

    // 4. Update each valid staff member
    for (const staffId of validStaffIds) {
      try {
        const staff = await Staff.findById(staffId);
        
        if (!staff) {
          console.log(`Staff ${staffId} not found in database`);
          results.failedCount++;
          results.failedStaff.push({
            staffId,
            error: "Staff not found in database",
            name: "Unknown"
          });
          continue;
        }

        // Store old values for logging
        const oldBalance = staff.wallet_balance || 0;
        const oldTests = staff.forTests || 0;
        const oldDoctors = staff.forDoctors || 0;
        const oldPackages = staff.forPackages || 0;

        // Update wallet
        staff.wallet_balance = oldBalance + totalAmount;
        staff.forTests = oldTests + forTests;
        staff.forDoctors = oldDoctors + forDoctors;
        staff.forPackages = oldPackages + forPackages;
        staff.totalAmount = staff.forTests + staff.forDoctors + staff.forPackages;

        // Update history if field exists
        if (!staff.history) {
          staff.history = [];
        }
        staff.history.push({
          type: "wallet_credit",
          amount: totalAmount,
          from,
          date: new Date(),
          details: {
            forTests,
            forDoctors,
            forPackages,
            oldBalance,
            newBalance: staff.wallet_balance
          }
        });

        // Add wallet log
        if (!staff.wallet_logs) {
          staff.wallet_logs = [];
        }
        
        staff.wallet_logs.push({
          type: "credit",
          forTests,
          forDoctors,
          forPackages,
          totalAmount,
          from,
          date: new Date(),
          details: {
            addedBy: req.user?.name || "Admin",
            company: company.company_name || "Unknown Company"
          }
        });

        await staff.save();
        results.updatedCount++;
        results.successStaff.push({
          staffId,
          name: staff.name,
          employeeId: staff.employeeId,
          oldBalance,
          newBalance: staff.wallet_balance,
          addedAmount: totalAmount
        });
        
        console.log(`Updated staff ${staffId} (${staff.name}) - Added ₹${totalAmount}`);
        
      } catch (error) {
        console.error(`Error updating staff ${staffId}:`, error);
        results.failedCount++;
        
        const staff = await Staff.findById(staffId).select('name employeeId');
        results.failedStaff.push({
          staffId,
          error: error.message,
          name: staff?.name || "Unknown",
          employeeId: staff?.employeeId
        });
      }
    }

    // 5. Prepare response
    const response = {
      success: true,
      message: `Amount added to ${results.updatedCount} out of ${results.validStaffCount} selected staff members`,
      summary: results,
      amountDetails: {
        forTests,
        forDoctors,
        forPackages,
        totalAmount,
        totalAdded: totalAmount * results.updatedCount
      },
      timestamp: new Date().toISOString()
    };

    console.log('API Response:', JSON.stringify(response, null, 2));

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error in addAmountToSelectedStaff:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal Server Error", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ✅ Slot Generation Function
const generateDefaultSlots = () => {
  const slots = [];

  for (let i = 0; i < 7; i++) {
    const dateObj = moment().add(i, "days");
    const day = dateObj.format("dddd"); // e.g., Monday
    const date = dateObj.format("YYYY-MM-DD"); // e.g., 2025-08-23

    let startTime = moment(date + " 09:00", "YYYY-MM-DD HH:mm");
    const endTime = moment(date + " 23:00", "YYYY-MM-DD HH:mm");

    while (startTime.isBefore(endTime)) {
      slots.push({
        day,
        date,
        timeSlot: startTime.format("HH:mm"),
        isBooked: false,
      });
      startTime.add(30, "minutes"); // ⏰ half-hour gap
    }
  }

  return slots;
};


// ✅ Check the next Sunday function
const getNextSunday = () => {
  const today = moment();
  const daysUntilSunday = (7 - today.day()) % 7;  // Calculate how many days until Sunday
  const nextSunday = today.add(daysUntilSunday, 'days').startOf('day').add(1, 'day'); // Next Sunday at 12 AM
  return nextSunday;
};

// ✅ Countdown Cron Job: Remind users daily about the upcoming slot generation
const countdownCronJob = () => {
  setInterval(() => {
    const nextSunday = getNextSunday();
    const daysLeft = nextSunday.diff(moment(), 'days');
    console.log(`⏳ ${daysLeft} days left until new slots are generated on Sunday!`);
  }, 86400000);  // Runs every 24 hours (86400000 ms)
};

// Start countdown job
countdownCronJob();



// ✅ Generate 30-min slots from 6 AM to 7 PM (adjusting for the required times)
const generateSlotsForWeek = (startTime, endTime) => {
  const slots = [];
  let current = moment(startTime);

  while (current.isBefore(endTime)) {
    slots.push({
      day: current.format('dddd'), // Day of the week (e.g., "Monday")
      date: current.format('YYYY-MM-DD'), // Date in "YYYY-MM-DD" format
      timeSlot: current.format('HH:mm'), // Time of the slot (e.g., "12:30")
      isBooked: false, // Default to false, assuming slot is not booked
    });
    current.add(30, 'minutes'); // Increment by 30 minutes for the next slot
  }

  return slots;
};

// ✅ Function to generate slots for all doctors and diagnostic slots for the week
const generateWeeklySlotsForDoctorsAndDiagnostics = async () => {
  try {
    const doctors = await Doctor.find(); // Fetch all doctors

    // Loop through each day of the week (Monday to Saturday)
    for (let i = 0; i < 6; i++) { // 6 days: Monday to Saturday
      const startTime = moment().startOf('week').add(i + 1, 'days').hour(6).minute(0).second(0); // 6 AM on the specific day
      const endTime = moment(startTime).hour(19).minute(0).second(0); // 7 PM on the same day

      for (const doc of doctors) {
        const newSlots = generateSlotsForWeek(startTime, endTime);

        // Update slots based on consultation type for doctors
        if (doc.consultation_type === 'Online' || doc.consultation_type === 'Both') {
          doc.onlineSlots.push(...newSlots);
        }

        if (doc.consultation_type === 'Offline' || doc.consultation_type === 'Both') {
          doc.offlineSlots.push(...newSlots);
        }

        // For Diagnostic services (Home Collection and Center Visit)
        const homeCollectionSlots = newSlots.map(slot => ({
          ...slot,
          type: 'Home Collection',
        }));

        const centerVisitSlots = newSlots.map(slot => ({
          ...slot,
          type: 'Center Visit',
        }));

        // Add slots to doctor's diagnostic collections (if applicable)
        doc.homeCollectionSlots.push(...homeCollectionSlots);
        doc.centerVisitSlots.push(...centerVisitSlots);

        // Save the updated slots in the database
        await doc.save();
        console.log(`✅ Slots generated for Dr. ${doc.name} for ${startTime.format('dddd, MMMM Do YYYY')}`);
      }
    }
  } catch (err) {
    console.error('❌ Error generating weekly slots:', err);
  }
};

// ✅ Run the slot generation function every Sunday at 5 AM
const scheduleWeeklySlotGeneration = () => {
  const now = moment();
  let nextSunday = moment().day(7).hour(5).minute(0).second(0); // Next Sunday at 5 AM

  // If it's already past Sunday 5 AM, schedule for the next Sunday
  if (now.isAfter(nextSunday)) {
    nextSunday = nextSunday.add(1, 'weeks');
  }

  // Calculate the delay in milliseconds to the next Sunday at 5 AM
  const delay = nextSunday.diff(now);

  // Schedule the slot generation function to run at 5 AM on Sunday every week
  setTimeout(() => {
    console.log('🌟 Generating slots for the upcoming week...');
    generateWeeklySlotsForDoctorsAndDiagnostics();

    // After the first run, repeat weekly at 5 AM on Sundays
    setInterval(() => {
      console.log('🌟 Generating slots for the upcoming week...');
      generateWeeklySlotsForDoctorsAndDiagnostics();
    }, 7 * 24 * 60 * 60 * 1000); // Repeat weekly (7 days)
  }, delay);
};

// Start scheduling weekly generation
scheduleWeeklySlotGeneration();


// ✅ Create Doctor Controller
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

      // Parse or fallback to default slots if none are provided
      let parsedOnlineSlots = [];
      let parsedOfflineSlots = [];

      try {
        if (consultation_type === 'Online' || consultation_type === 'Both') {
          parsedOnlineSlots = onlineSlots ? JSON.parse(onlineSlots) : generateDefaultSlots();
        }

        if (consultation_type === 'Offline' || consultation_type === 'Both') {
          parsedOfflineSlots = offlineSlots ? JSON.parse(offlineSlots) : generateDefaultSlots();
        }

        if (consultation_type === 'Online' && !onlineSlots) {
          parsedOnlineSlots = generateDefaultSlots();
        }

        if (consultation_type === 'Offline' && !offlineSlots) {
          parsedOfflineSlots = generateDefaultSlots();
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

    const formattedDate = moment.tz(date, "YYYY-MM-DD", "Asia/Kolkata").format("YYYY-MM-DD");
    const now = moment.tz("Asia/Kolkata");

    let slots = [];
    if (type === "online") {
      slots = doctor.onlineSlots || [];
    } else if (type === "offline") {
      slots = doctor.offlineSlots || [];
    } else {
      slots = [...(doctor.onlineSlots || []), ...(doctor.offlineSlots || [])];
    }

    // Filter slots by date, exclude expired and booked slots
    const filteredSlots = (slots || [])
      .filter(slot => slot.date === formattedDate)
      .filter(slot => {
        const slotDateTime = moment.tz(`${slot.date} ${slot.timeSlot}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata");
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      })
      .filter(slot => !slot.isBooked) // exclude booked slots
      .map(slotDoc => {
        const slot = typeof slotDoc.toObject === "function" ? slotDoc.toObject() : slotDoc;
        return {
          _id: slot._id,
          day: slot.day,
          date: slot.date,
          timeSlot: slot.timeSlot,
          isBooked: slot.isBooked
        };
      });

    if (filteredSlots.length === 0) {
      return res.status(404).json({
        message: "No valid slots found for the given date"
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
        select: 'name employeeId' // ✅ employeeId added here
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
      diagnosticId: booking.diagnosticId?._id || null,
      diagnostic_name: booking.diagnosticId?.name || '',
      diagnostic_image: booking.diagnosticId?.image || '',
      diagnostic_address: booking.diagnosticId?.address || '',
      staffId: booking.staffId || '',
      staff_name: booking.staffId?.name || '',
      staff_employeeId: booking.staffId?.employeeId || null, // ✅ employeeId added here
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
      .populate("staffId", "name email contact_number employeeId") // ✅ employeeId add किया
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Get address details if addressId exists
    let addressDetails = null;
    if (booking.addressId) {
      const staff = await Staff.findById(booking.staffId._id).select("addresses");
      if (staff) {
        addressDetails = staff.addresses.find(addr =>
          addr._id.toString() === booking.addressId.toString()
        );
      }
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

    // Final structured object with address details + received reports/prescriptions
    const bookingDetails = {
      bookingId: booking._id,
      diagnosticBookingId: booking.diagnosticBookingId || "",
      serviceType: booking.serviceType || "",
      status: booking.status,
      date: booking.date,
      timeSlot: booking.timeSlot,
      totalPrice: booking.totalPrice,
      discount: booking.discount,
      payableAmount: booking.payableAmount,
      transactionId: booking.transactionId,
      paymentStatus: booking.paymentStatus,

      // Address details (only for Home Collection)
      address: addressDetails ? {
        street: addressDetails.street,
        city: addressDetails.city,
        state: addressDetails.state,
        country: addressDetails.country,
        postalCode: addressDetails.postalCode,
        addressType: addressDetails.addressType,
        _id: addressDetails._id
      } : null,

      diagnostic: booking.diagnosticId
        ? {
          name: booking.diagnosticId.name,
          description: booking.diagnosticId.description,
          image: booking.diagnosticId.image,
          homeCollection: booking.diagnosticId.homeCollection,
          centerVisit: booking.diagnosticId.centerVisit,
          pincode: booking.diagnosticId.pincode,
          contactPerson: booking.diagnosticId.contactPersons?.[0] || null,
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
          employeeId: booking.staffId.employeeId || "N/A", // ✅ employeeId added here
        }
        : null,

      cartItems: booking.cartId?.items || [],

      reportFile: booking.report_file || null,
      diagPrescription: booking.diagPrescription || null,

      // ✅ New fields for staff/doctor uploads
      receivedDiagReports: booking.receivedDiagReports || [],
      receivedDiagPrescriptions: booking.receivedDiagPrescriptions || []
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
        select: 'name employeeId' // ✅ employeeId add किया
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
        staffId: booking.staffId,
        staff_name: booking.staffId?.name,
        staff_employeeId: booking.staffId?.employeeId || null, // ✅ employeeId added here
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
        select: 'name employeeId', // ✅ employeeId add किया
      })
      .select(
        'doctorId doctorConsultationBookingId staffId familyMemberId bookedSlot totalPrice status meetingLink type discount payableAmount createdAt doctorReports doctorPrescriptions receivedDoctorReports receivedDoctorPrescriptions transactionId paymentStatus'
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
        staff_employeeId: booking.staffId?.employeeId || null, // ✅ employeeId added here
        appointment_date: booking.bookedSlot?.date,
        time_slot: booking.bookedSlot?.timeSlot,
        status: booking.status,
        meeting_link: booking.meetingLink,
        consultation_type: booking.type,
        total_price: booking.totalPrice,
        discount: booking.discount,
        payable_amount: booking.payableAmount,
        doctor_reports: booking.doctorReports,
        doctor_prescriptions: booking.doctorPrescriptions,
        receivedDoctorReports: booking.receivedDoctorReports || [],        // ✅ Added
        receivedDoctorPrescriptions: booking.receivedDoctorPrescriptions || [], // ✅ Added
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
        branches,
        noOfBranches, // ✅ added here (manual field)
      } = req.body;

      // ✅ Parse and validate diagnostic IDs
      const diagnosticIds = typeof diagnostic === "string" ? JSON.parse(diagnostic) : diagnostic;
      const filteredDiagnosticIds = (diagnosticIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));

      const validDiagnostics = await Diagnostic.find({
        _id: { $in: filteredDiagnosticIds },
      }).select("_id");

      // ✅ Handle uploaded files
      const imageFile = req.files?.image?.[0]?.filename
        ? `/uploads/company-images/${req.files.image[0].filename}`
        : null;

      const documents = req.files?.documents?.map(doc => `/uploads/documents/${doc.filename}`) || [];

      // ✅ Parse contact persons
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

      // ✅ Parse branches
      const parsedBranches = typeof branches === "string" ? JSON.parse(branches) : branches;

      const formattedBranches = Array.isArray(parsedBranches)
        ? parsedBranches.map(branch => ({
          branchName: branch?.branchName,
          branchCode: branch?.branchCode,
          email: branch?.email,
          phone: branch?.phone,
          branchHead: branch?.branchHead,
          country: branch?.country,
          state: branch?.state,
          city: branch?.city,
          pincode: branch?.pincode,
          address: branch?.address,
          contactPerson: {
            name: branch?.contactPerson?.name,
            designation: branch?.contactPerson?.designation,
            email: branch?.contactPerson?.email,
            phone: branch?.contactPerson?.phone,
            gender: branch?.contactPerson?.gender,
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
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
        branches: formattedBranches,
        noOfBranches: Number(noOfBranches) || 0, // ✅ manually entered field
      });

      const savedCompany = await newCompany.save();

      res.status(201).json({
        message: "Company created successfully!",
        company: savedCompany,
      });
    } catch (error) {
      console.error("Error creating company:", error);

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          message: `${field} already exists`,
        });
      }

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
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

    fs.unlink(filePath, () => { }); // Optional cleanup

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
        branches,
        password,
        diagnostic,
        noOfBranches
      } = req.body;

      // 🔍 Parse diagnostic array from frontend if sent as stringified JSON
      const diagnosticIds = typeof diagnostic === 'string' ? JSON.parse(diagnostic) : diagnostic;
      const filteredDiagnosticIds = (diagnosticIds || []).filter(id => mongoose.Types.ObjectId.isValid(id));

      // Check if all diagnostic _ids are valid
      const validDiagnostics = filteredDiagnosticIds.length > 0
        ? await Diagnostic.find({ '_id': { $in: filteredDiagnosticIds } }).select('_id')
        : [];

      // 📂 Handle uploaded files (image and documents)
      const imageFile = req.files?.image?.[0]?.filename
        ? `/uploads/company-images/${req.files.image[0].filename}`
        : null;

      const documents = req.files?.documents?.map(doc => `/uploads/documents/${doc.filename}`) || [];

      // 🔄 Parse the contactPerson if sent as stringified JSON
      const parsedContactPersons = typeof contactPerson === 'string' ? JSON.parse(contactPerson) : contactPerson;

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

      // 🔄 Parse and format branches - IMPROVED VERSION
      const parsedBranches = typeof branches === 'string' ? JSON.parse(branches) : branches;

      const formattedBranches = Array.isArray(parsedBranches)
        ? parsedBranches.map(branch => {
          // For new branches (without _id), generate new ObjectId
          // For existing branches, keep the same _id
          const branchId = branch?._id ? branch._id : new mongoose.Types.ObjectId();
          
          return {
            _id: branchId,
            branchName: branch?.branchName,
            branchCode: branch?.branchCode,
            email: branch?.email,
            phone: branch?.phone,
            branchHead: branch?.branchHead,
            country: branch?.country,
            state: branch?.state,
            city: branch?.city,
            pincode: branch?.pincode,
            address: branch?.address,
            contactPerson: {
              name: branch?.contactPerson?.name,
              designation: branch?.contactPerson?.designation,
              email: branch?.contactPerson?.email,
              phone: branch?.contactPerson?.phone,
              gender: branch?.contactPerson?.gender,
            },
            status: branch?.status || 'active',
            createdAt: branch?.createdAt || new Date(),
            updatedAt: new Date(),
          };
        })
        : [];

      // Prepare the updated company data
      const updateData = {
        updatedAt: new Date()
      };

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
      if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
      if (companyStrength) updateData.companyStrength = companyStrength;
      if (country) updateData.country = country;
      if (state) updateData.state = state;
      if (city) updateData.city = city;
      if (pincode) updateData.pincode = pincode;
      if (password) updateData.password = password;
      if (noOfBranches !== undefined) updateData.noOfBranches = Number(noOfBranches); // ✅ Added

      // Update arrays and nested objects
      if (validDiagnostics.length > 0) updateData.diagnostics = validDiagnostics.map(d => d._id);
      
      // Handle image update - only update if new image is uploaded
      if (imageFile) {
        updateData.image = imageFile;
      }
      
      // Handle documents - append new documents to existing ones
      if (documents.length > 0) {
        // Get current company to preserve existing documents
        const currentCompany = await Company.findById(companyId).select('documents');
        const existingDocuments = currentCompany?.documents || [];
        updateData.documents = [...existingDocuments, ...documents];
      }

      // Update contact persons if provided
      if (formattedContactPersons.length > 0) {
        updateData.contactPerson = formattedContactPersons;
      }

      // Update branches if provided - COMPLETE REPLACEMENT
      if (formattedBranches.length > 0) {
        updateData.branches = formattedBranches;
      }

      console.log('Updating company with data:', {
        basicFields: Object.keys(updateData).filter(key => key !== 'branches' && key !== 'contactPerson'),
        branchesCount: formattedBranches.length,
        contactPersonsCount: formattedContactPersons.length
      });

      // Find the company by ID and update it
      const updatedCompany = await Company.findByIdAndUpdate(
        companyId, 
        { $set: updateData }, // Use $set to properly update nested arrays
        { 
          new: true, // Return updated document
          runValidators: true // Run model validations
        }
      );

      if (!updatedCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Populate the diagnostics and other references if needed
      await updatedCompany.populate('diagnostics');
      await updatedCompany.populate('staff');

      // Respond with success message and the updated company details
      res.status(200).json({
        message: 'Company updated successfully!',
        company: updatedCompany,
        updatedBranches: formattedBranches.length,
        updatedContactPersons: formattedContactPersons.length
      });
    } catch (error) {
      console.error('Error updating company:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ 
          message: `${field} already exists`, 
          field: field
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          message: "Validation failed", 
          errors 
        });
      }
      
      // Handle CastError (invalid ID)
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          message: "Invalid company ID" 
        });
      }
      
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  });
};




export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });

    // Sabhi companies ke liye statistics calculate karna
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        // Company ke saare staff IDs collect karo
        const companyStaffIds = company.staff.map(staff => staff._id);

        // Diagnostic statistics collect karo
        const diagnosticsStats = {};
        let totalTests = 0;
        let totalPackages = 0;
        let totalScans = 0;
        let totalStaffWithAssignments = 0;
        const assignedStaffSet = new Set();

        // Staff ke assigned items process karo
        const staffs = await Staff.find({ 
          _id: { $in: companyStaffIds } 
        }).select('myTests myPackages myScans name email employeeId');

        staffs.forEach(staff => {
          // Tests
          staff.myTests.forEach(test => {
            if (test.diagnosticId) {
              const diagId = test.diagnosticId.toString();
              if (!diagnosticsStats[diagId]) {
                diagnosticsStats[diagId] = {
                  diagnosticId: diagId,
                  tests: 0,
                  packages: 0,
                  scans: 0,
                  staffIds: new Set()
                };
              }
              diagnosticsStats[diagId].tests++;
              diagnosticsStats[diagId].staffIds.add(staff._id.toString());
              assignedStaffSet.add(staff._id.toString());
              totalTests++;
            }
          });

          // Packages
          staff.myPackages.forEach(pkg => {
            if (pkg.diagnosticId) {
              const diagId = pkg.diagnosticId.toString();
              if (!diagnosticsStats[diagId]) {
                diagnosticsStats[diagId] = {
                  diagnosticId: diagId,
                  tests: 0,
                  packages: 0,
                  scans: 0,
                  staffIds: new Set()
                };
              }
              diagnosticsStats[diagId].packages++;
              diagnosticsStats[diagId].staffIds.add(staff._id.toString());
              assignedStaffSet.add(staff._id.toString());
              totalPackages++;
            }
          });

          // Scans
          staff.myScans.forEach(scan => {
            if (scan.diagnosticId) {
              const diagId = scan.diagnosticId.toString();
              if (!diagnosticsStats[diagId]) {
                diagnosticsStats[diagId] = {
                  diagnosticId: diagId,
                  tests: 0,
                  packages: 0,
                  scans: 0,
                  staffIds: new Set()
                };
              }
              diagnosticsStats[diagId].scans++;
              diagnosticsStats[diagId].staffIds.add(staff._id.toString());
              assignedStaffSet.add(staff._id.toString());
              totalScans++;
            }
          });
        });

        // Diagnostic details fetch karo
        const diagnosticIds = Object.keys(diagnosticsStats);
        const diagnostics = await Diagnostic.find({ 
          _id: { $in: diagnosticIds } 
        }).select('name email phone address city centerType');

        // Diagnostic data map karo
        const diagnosticData = diagnostics.map(diagnostic => {
          const stats = diagnosticsStats[diagnostic._id.toString()] || {
            tests: 0,
            packages: 0,
            scans: 0,
            staffIds: new Set()
          };

          return {
            _id: diagnostic._id,
            name: diagnostic.name,
            email: diagnostic.email,
            phone: diagnostic.phone,
            address: diagnostic.address,
            city: diagnostic.city,
            centerType: diagnostic.centerType,
            statistics: {
              tests: stats.tests,
              packages: stats.packages,
              scans: stats.scans,
              totalItems: stats.tests + stats.packages + stats.scans,
              staffAssigned: stats.staffIds.size
            }
          };
        });

        // Company ke totals calculate karo
        const companyTotals = {
          totalStaff: company.staff.length,
          totalTests,
          totalPackages,
          totalScans,
          totalItems: totalTests + totalPackages + totalScans,
          totalDiagnostics: diagnosticData.length,
          staffWithAssignments: assignedStaffSet.size,
          assignmentPercentage: company.staff.length > 0 
            ? ((assignedStaffSet.size / company.staff.length) * 100).toFixed(2) 
            : 0
        };

        return {
          ...company.toObject(),
          statistics: companyTotals,
          diagnostics: diagnosticData,
          staffSummary: {
            total: company.staff.length,
            withAssignments: assignedStaffSet.size,
            withoutAssignments: company.staff.length - assignedStaffSet.size
          }
        };
      })
    );

    res.status(200).json({
      message: 'Companies fetched successfully with statistics',
      companies: companiesWithStats,
      timestamp: new Date(),
      totalCompanies: companiesWithStats.length,
      globalStats: {
        totalCompanies: companiesWithStats.length,
        totalStaff: companiesWithStats.reduce((sum, company) => sum + company.statistics.totalStaff, 0),
        totalTests: companiesWithStats.reduce((sum, company) => sum + company.statistics.totalTests, 0),
        totalPackages: companiesWithStats.reduce((sum, company) => sum + company.statistics.totalPackages, 0),
        totalScans: companiesWithStats.reduce((sum, company) => sum + company.statistics.totalScans, 0),
        totalDiagnostics: companiesWithStats.reduce((sum, company) => sum + company.statistics.totalDiagnostics, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching companies with stats:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};


export const getCompanyById = async (req, res) => {
  try {
    const { companyId } = req.params;

    // पहले company को base details के साथ fetch करें
    const company = await Company.findById(companyId);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Company ke saare staff IDs collect karo
    const companyStaffIds = company.staff.map(staff => staff._id);

    // Diagnostic statistics collect karo - MODIFIED
    const diagnosticsStats = {};
    const uniqueTestAssignments = new Map(); // Test ID -> Test details with assigned staff array
    const uniquePackageAssignments = new Map(); // Package ID -> Package details with assigned staff array
    const uniqueScanAssignments = new Map(); // Scan ID -> Scan details with assigned staff array

    // Staff details fetch karo
    const staffs = await Staff.find({ 
      _id: { $in: companyStaffIds } 
    }).select('myTests myPackages myScans name email employeeId gender age');

    // Staff details ke liye map create karo
    const staffDetailsMap = new Map();
    staffs.forEach(staff => {
      staffDetailsMap.set(staff._id.toString(), {
        _id: staff._id,
        name: staff.name,
        employeeId: staff.employeeId,
        gender: staff.gender || 'Other',
        age: staff.age || 0
      });
    });

    // Process tests - MODIFIED
    staffs.forEach(staff => {
      const staffDetail = staffDetailsMap.get(staff._id.toString());

      // Tests with details - GROUP BY TEST ID
      staff.myTests.forEach(test => {
        if (test.diagnosticId && test.testId) {
          const diagId = test.diagnosticId.toString();
          const testId = test.testId.toString();
          
          if (!diagnosticsStats[diagId]) {
            diagnosticsStats[diagId] = {
              diagnosticId: diagId,
              uniqueTests: new Map(), // Use Map for unique tests
              uniquePackages: new Map(), // Use Map for unique packages
              uniqueScans: new Map(), // Use Map for unique scans
              staffIds: new Set()
            };
          }
          
          // Age group determine karo
          const age = staffDetail.age || 0;
          let ageGroup = 'Unknown';
          if (age >= 18 && age <= 25) ageGroup = '18-25';
          else if (age >= 26 && age <= 35) ageGroup = '26-35';
          else if (age >= 36 && age <= 45) ageGroup = '36-45';
          else if (age >= 46 && age <= 55) ageGroup = '46-55';
          else if (age > 55) ageGroup = '56+';
          
          // Staff assignment details
          const staffAssignment = {
            _id: staff._id,
            name: staff.name,
            employeeId: staff.employeeId,
            gender: staffDetail.gender,
            age: staffDetail.age,
            ageGroup: ageGroup
          };
          
          // Check if test already exists in uniqueTests Map
          if (!diagnosticsStats[diagId].uniqueTests.has(testId)) {
            // Create new test entry
            diagnosticsStats[diagId].uniqueTests.set(testId, {
              _id: test._id,
              testId: test.testId,
              testName: test.testName,
              price: test.price,
              fastingRequired: test.fastingRequired,
              homeCollectionAvailable: test.homeCollectionAvailable,
              reportIn24Hrs: test.reportIn24Hrs,
              description: test.description,
              instruction: test.instruction,
              precaution: test.precaution,
              subTests: test.subTests || [],
              assignedStaff: [staffAssignment] // Array of assigned staff
            });
          } else {
            // Add staff to existing test's assignedStaff array
            const existingTest = diagnosticsStats[diagId].uniqueTests.get(testId);
            existingTest.assignedStaff.push(staffAssignment);
          }
          
          diagnosticsStats[diagId].staffIds.add(staff._id.toString());
        }
      });

      // Packages with details - GROUP BY PACKAGE ID
      staff.myPackages.forEach(pkg => {
        if (pkg.diagnosticId && pkg.packageId) {
          const diagId = pkg.diagnosticId.toString();
          const packageId = pkg.packageId.toString();
          
          if (!diagnosticsStats[diagId]) {
            diagnosticsStats[diagId] = {
              diagnosticId: diagId,
              uniqueTests: new Map(),
              uniquePackages: new Map(),
              uniqueScans: new Map(),
              staffIds: new Set()
            };
          }
          
          // Age group determine karo
          const age = staffDetail.age || 0;
          let ageGroup = 'Unknown';
          if (age >= 18 && age <= 25) ageGroup = '18-25';
          else if (age >= 26 && age <= 35) ageGroup = '26-35';
          else if (age >= 36 && age <= 45) ageGroup = '36-45';
          else if (age >= 46 && age <= 55) ageGroup = '46-55';
          else if (age > 55) ageGroup = '56+';
          
          // Staff assignment details
          const staffAssignment = {
            _id: staff._id,
            name: staff.name,
            employeeId: staff.employeeId,
            gender: staffDetail.gender,
            age: staffDetail.age,
            ageGroup: ageGroup
          };
          
          // Check if package already exists in uniquePackages Map
          if (!diagnosticsStats[diagId].uniquePackages.has(packageId)) {
            // Create new package entry
            diagnosticsStats[diagId].uniquePackages.set(packageId, {
              _id: pkg._id,
              packageId: pkg.packageId,
              packageName: pkg.packageName,
              price: pkg.price,
              offerPrice: pkg.offerPrice,
              totalTestsIncluded: pkg.totalTestsIncluded,
              description: pkg.description,
              precautions: pkg.precautions,
              includedTests: pkg.includedTests || [],
              assignedStaff: [staffAssignment] // Array of assigned staff
            });
          } else {
            // Add staff to existing package's assignedStaff array
            const existingPackage = diagnosticsStats[diagId].uniquePackages.get(packageId);
            existingPackage.assignedStaff.push(staffAssignment);
          }
          
          diagnosticsStats[diagId].staffIds.add(staff._id.toString());
        }
      });

      // Scans with details - GROUP BY SCAN ID
      staff.myScans.forEach(scan => {
        if (scan.diagnosticId && scan.scanId) {
          const diagId = scan.diagnosticId.toString();
          const scanId = scan.scanId.toString();
          
          if (!diagnosticsStats[diagId]) {
            diagnosticsStats[diagId] = {
              diagnosticId: diagId,
              uniqueTests: new Map(),
              uniquePackages: new Map(),
              uniqueScans: new Map(),
              staffIds: new Set()
            };
          }
          
          // Age group determine karo
          const age = staffDetail.age || 0;
          let ageGroup = 'Unknown';
          if (age >= 18 && age <= 25) ageGroup = '18-25';
          else if (age >= 26 && age <= 35) ageGroup = '26-35';
          else if (age >= 36 && age <= 45) ageGroup = '36-45';
          else if (age >= 46 && age <= 55) ageGroup = '46-55';
          else if (age > 55) ageGroup = '56+';
          
          // Staff assignment details
          const staffAssignment = {
            _id: staff._id,
            name: staff.name,
            employeeId: staff.employeeId,
            gender: staffDetail.gender,
            age: staffDetail.age,
            ageGroup: ageGroup
          };
          
          // Check if scan already exists in uniqueScans Map
          if (!diagnosticsStats[diagId].uniqueScans.has(scanId)) {
            // Create new scan entry
            diagnosticsStats[diagId].uniqueScans.set(scanId, {
              _id: scan._id,
              scanId: scan.scanId,
              title: scan.title,
              price: scan.price,
              preparation: scan.preparation,
              reportTime: scan.reportTime,
              image: scan.image,
              assignedStaff: [staffAssignment] // Array of assigned staff
            });
          } else {
            // Add staff to existing scan's assignedStaff array
            const existingScan = diagnosticsStats[diagId].uniqueScans.get(scanId);
            existingScan.assignedStaff.push(staffAssignment);
          }
          
          diagnosticsStats[diagId].staffIds.add(staff._id.toString());
        }
      });
    });

    // Diagnostic details fetch karo
    const diagnosticIds = Object.keys(diagnosticsStats);
    const diagnostics = await Diagnostic.find({ 
      _id: { $in: diagnosticIds } 
    }).select('name email phone address city centerType');

    // Collect unique test, package, and scan IDs for fetching details
    const allTestIds = new Set();
    const allPackageIds = new Set();
    const allScanIds = new Set();

    Object.values(diagnosticsStats).forEach(stats => {
      // Get test IDs from Map keys
      Array.from(stats.uniqueTests.keys()).forEach(testId => {
        allTestIds.add(testId);
      });
      
      // Get package IDs from Map keys
      Array.from(stats.uniquePackages.keys()).forEach(packageId => {
        allPackageIds.add(packageId);
      });
      
      // Get scan IDs from Map keys
      Array.from(stats.uniqueScans.keys()).forEach(scanId => {
        allScanIds.add(scanId);
      });
    });

    // Parallel queries for better performance
    const [testsDetails, packagesDetails, scansDetails] = await Promise.all([
      Test.find({ _id: { $in: Array.from(allTestIds) } }).select('name price description instruction precaution fastingRequired homeCollectionAvailable reportIn24Hrs gender'),
      Package.find({ _id: { $in: Array.from(allPackageIds) } }).select('name price description precautions includedTests totalTestsIncluded gender'),
      Xray.find({ _id: { $in: Array.from(allScanIds) } }).select('title price preparation reportTime image gender')
    ]);

    // Create lookup maps
    const testsMap = new Map(testsDetails.map(test => [test._id.toString(), test]));
    const packagesMap = new Map(packagesDetails.map(pkg => [pkg._id.toString(), pkg]));
    const scansMap = new Map(scansDetails.map(scan => [scan._id.toString(), scan]));

    // Diagnostic data map karo with full details
    const diagnosticData = diagnostics.map(diagnostic => {
      const stats = diagnosticsStats[diagnostic._id.toString()] || {
        uniqueTests: new Map(),
        uniquePackages: new Map(),
        uniqueScans: new Map(),
        staffIds: new Set()
      };

      // Convert Maps to Arrays for response
      const uniqueTestsArray = Array.from(stats.uniqueTests.values());
      const uniquePackagesArray = Array.from(stats.uniquePackages.values());
      const uniqueScansArray = Array.from(stats.uniqueScans.values());

      // Enrich test details
      const enrichedTests = uniqueTestsArray.map(test => {
        const testDetails = testsMap.get(test.testId?.toString());
        return {
          ...test,
          testDetails: testDetails || null
        };
      });

      // Enrich package details
      const enrichedPackages = uniquePackagesArray.map(pkg => {
        const packageDetails = packagesMap.get(pkg.packageId?.toString());
        return {
          ...pkg,
          packageDetails: packageDetails || null
        };
      });

      // Enrich scan details
      const enrichedScans = uniqueScansArray.map(scan => {
        const scanDetails = scansMap.get(scan.scanId?.toString());
        return {
          ...scan,
          scanDetails: scanDetails || null
        };
      });

      // Calculate gender and age group distribution
      const testGenderDistribution = {};
      const testAgeGroupDistribution = {};
      
      const packageGenderDistribution = {};
      const packageAgeGroupDistribution = {};
      
      const scanGenderDistribution = {};
      const scanAgeGroupDistribution = {};

      // Tests ka distribution calculate karo - now from assignedStaff array
      enrichedTests.forEach(test => {
        test.assignedStaff?.forEach(staff => {
          const gender = staff?.gender || 'Unknown';
          const ageGroup = staff?.ageGroup || 'Unknown';
          
          // Gender distribution
          if (!testGenderDistribution[gender]) {
            testGenderDistribution[gender] = 0;
          }
          testGenderDistribution[gender]++;
          
          // Age group distribution
          if (!testAgeGroupDistribution[ageGroup]) {
            testAgeGroupDistribution[ageGroup] = 0;
          }
          testAgeGroupDistribution[ageGroup]++;
        });
      });

      // Packages ka distribution calculate karo
      enrichedPackages.forEach(pkg => {
        pkg.assignedStaff?.forEach(staff => {
          const gender = staff?.gender || 'Unknown';
          const ageGroup = staff?.ageGroup || 'Unknown';
          
          // Gender distribution
          if (!packageGenderDistribution[gender]) {
            packageGenderDistribution[gender] = 0;
          }
          packageGenderDistribution[gender]++;
          
          // Age group distribution
          if (!packageAgeGroupDistribution[ageGroup]) {
            packageAgeGroupDistribution[ageGroup] = 0;
          }
          packageAgeGroupDistribution[ageGroup]++;
        });
      });

      // Scans ka distribution calculate karo
      enrichedScans.forEach(scan => {
        scan.assignedStaff?.forEach(staff => {
          const gender = staff?.gender || 'Unknown';
          const ageGroup = staff?.ageGroup || 'Unknown';
          
          // Gender distribution
          if (!scanGenderDistribution[gender]) {
            scanGenderDistribution[gender] = 0;
          }
          scanGenderDistribution[gender]++;
          
          // Age group distribution
          if (!scanAgeGroupDistribution[ageGroup]) {
            scanAgeGroupDistribution[ageGroup] = 0;
          }
          scanAgeGroupDistribution[ageGroup]++;
        });
      });

      // Calculate total assigned staff across all items
      const allAssignedStaffIds = new Set();
      enrichedTests.forEach(test => {
        test.assignedStaff?.forEach(staff => {
          allAssignedStaffIds.add(staff._id?.toString());
        });
      });
      enrichedPackages.forEach(pkg => {
        pkg.assignedStaff?.forEach(staff => {
          allAssignedStaffIds.add(staff._id?.toString());
        });
      });
      enrichedScans.forEach(scan => {
        scan.assignedStaff?.forEach(staff => {
          allAssignedStaffIds.add(staff._id?.toString());
        });
      });

      return {
        _id: diagnostic._id,
        name: diagnostic.name,
        email: diagnostic.email,
        phone: diagnostic.phone,
        address: diagnostic.address,
        city: diagnostic.city,
        centerType: diagnostic.centerType,
        statistics: {
          uniqueTests: enrichedTests.length,
          uniquePackages: enrichedPackages.length,
          uniqueScans: enrichedScans.length,
          totalAssignedStaff: allAssignedStaffIds.size,
          testDistribution: {
            gender: testGenderDistribution,
            ageGroup: testAgeGroupDistribution,
            totalAssignments: Object.values(testGenderDistribution).reduce((a, b) => a + b, 0)
          },
          packageDistribution: {
            gender: packageGenderDistribution,
            ageGroup: packageAgeGroupDistribution,
            totalAssignments: Object.values(packageGenderDistribution).reduce((a, b) => a + b, 0)
          },
          scanDistribution: {
            gender: scanGenderDistribution,
            ageGroup: scanAgeGroupDistribution,
            totalAssignments: Object.values(scanGenderDistribution).reduce((a, b) => a + b, 0)
          }
        },
        tests: enrichedTests, // Now this will have unique tests with assignedStaff array
        packages: enrichedPackages, // Now this will have unique packages with assignedStaff array
        scans: enrichedScans, // Now this will have unique scans with assignedStaff array
        assignedStaff: Array.from(stats.staffIds)
      };
    });

    // Company ke totals calculate karo - MODIFIED for unique counts
    const assignedStaffSet = new Set();
    let totalTestAssignments = 0;
    let totalPackageAssignments = 0;
    let totalScanAssignments = 0;

    diagnosticData.forEach(diag => {
      diag.tests.forEach(test => {
        test.assignedStaff?.forEach(staff => {
          assignedStaffSet.add(staff._id?.toString());
          totalTestAssignments++;
        });
      });
      diag.packages.forEach(pkg => {
        pkg.assignedStaff?.forEach(staff => {
          assignedStaffSet.add(staff._id?.toString());
          totalPackageAssignments++;
        });
      });
      diag.scans.forEach(scan => {
        scan.assignedStaff?.forEach(staff => {
          assignedStaffSet.add(staff._id?.toString());
          totalScanAssignments++;
        });
      });
    });

    const companyTotals = {
      totalStaff: company.staff.length,
      uniqueTests: diagnosticData.reduce((sum, diag) => sum + diag.tests.length, 0),
      uniquePackages: diagnosticData.reduce((sum, diag) => sum + diag.packages.length, 0),
      uniqueScans: diagnosticData.reduce((sum, diag) => sum + diag.scans.length, 0),
      totalTestAssignments,
      totalPackageAssignments,
      totalScanAssignments,
      totalDiagnostics: diagnosticData.length,
      staffWithAssignments: assignedStaffSet.size,
      assignmentPercentage: company.staff.length > 0 
        ? ((assignedStaffSet.size / company.staff.length) * 100).toFixed(2) 
        : 0
    };

    // Combine company data with diagnostics and statistics
    const companyWithFullDetails = {
      ...company.toObject(),
      statistics: companyTotals,
      diagnostics: diagnosticData,
      staffSummary: {
        total: company.staff.length,
        withAssignments: assignedStaffSet.size,
        withoutAssignments: company.staff.length - assignedStaffSet.size
      }
    };

    res.status(200).json({
      message: 'Company fetched successfully with complete details',
      company: companyWithFullDetails,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching company with full details:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
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

    // 1️⃣ Fetch company (has branches array)
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // 2️⃣ Extract staff IDs from company
    const staffIds = company.staff.map(st => st._id);

    // 3️⃣ Fetch staff data including employeeId
    const staffMembers = await Staff.find({
      _id: { $in: staffIds }
    }).select(
      "name role contact_number email age gender address profileImage idImage wallet_balance department branch mailSent mailSentAt employeeId termsAndConditionsAccepted termsAcceptedAt"
    );

    // 4️⃣ Map staff → find branchName in company.branches[]
    const companyBranchesMap = {};
    company.branches.forEach(br => {
      companyBranchesMap[br._id.toString()] = br.branchName;
    });

    const finalStaff = staffMembers.map(staff => {
      const branchId = staff.branch ? staff.branch.toString() : null;
      // Find branch name
      const branchName = branchId ? companyBranchesMap[branchId] || null : null;

      return {
        ...staff._doc,
        branchName: branchName,  // ⭐ Add branchName
        termsAndConditionsAccepted: staff.termsAndConditionsAccepted,  // Add terms acceptance fields
        termsAcceptedAt: staff.termsAcceptedAt   // Add terms acceptance fields
      };
    });

    // 5️⃣ Send response
    return res.status(200).json({
      message: "Company and staff fetched successfully",
      company: {
        ...company._doc,
        staff: finalStaff
      }
    });

  } catch (error) {
    console.error("❌ Error fetching company + staff:", error);
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

    fs.unlink(filePath, () => { }); // Optional: delete after success
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
      // Parse branches from Excel
      let branches = [];
      if (entry.branches) {
        try {
          // Try to parse as JSON string first
          branches = typeof entry.branches === 'string' ? JSON.parse(entry.branches) : entry.branches;
        } catch (parseError) {
          console.warn('Failed to parse branches as JSON, trying alternative format:', parseError.message);
          // Alternative: Parse from comma-separated branch names
          if (typeof entry.branches === 'string') {
            const branchNames = entry.branches.split(',').map(name => name.trim()).filter(Boolean);
            branches = branchNames.map(branchName => ({
              branchName: branchName,
              branchCode: generateBranchCode(branchName), // Helper function to generate branch code
              email: entry.email || '',
              phone: entry.phone || '',
              branchHead: entry.contactPerson_name || '',
              country: entry.country || '',
              state: entry.state || '',
              city: entry.city || '',
              pincode: entry.pincode || '',
              address: `${entry.city || ''}, ${entry.state || ''}, ${entry.country || ''}`,
              contactPerson: {
                name: entry.contactPerson_name || '',
                designation: entry.contactPerson_designation || '',
                email: entry.contactPerson_email || '',
                phone: entry.contactPerson_phone || '',
                gender: entry.contactPerson_gender || '',
              },
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          }
        }
      }

      // If no branches provided, create a default main branch
      if (!branches || branches.length === 0) {
        branches = [{
          branchName: 'Main Branch',
          branchCode: generateBranchCode(entry.name || 'Company'),
          email: entry.email || '',
          phone: entry.phone || '',
          branchHead: entry.contactPerson_name || '',
          country: entry.country || '',
          state: entry.state || '',
          city: entry.city || '',
          pincode: entry.pincode || '',
          address: `${entry.city || ''}, ${entry.state || ''}, ${entry.country || ''}`,
          contactPerson: {
            name: entry.contactPerson_name || '',
            designation: entry.contactPerson_designation || '',
            email: entry.contactPerson_email || '',
            phone: entry.contactPerson_phone || '',
            gender: entry.contactPerson_gender || '',
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }];
      }

      // Ensure branches is an array and format properly
      const formattedBranches = Array.isArray(branches) ? branches.map(branch => ({
        branchName: branch.branchName || 'Unnamed Branch',
        branchCode: branch.branchCode || generateBranchCode(branch.branchName || 'Branch'),
        email: branch.email || entry.email || '',
        phone: branch.phone || entry.phone || '',
        branchHead: branch.branchHead || entry.contactPerson_name || '',
        country: branch.country || entry.country || '',
        state: branch.state || entry.state || '',
        city: branch.city || entry.city || '',
        pincode: branch.pincode || entry.pincode || '',
        address: branch.address || `${entry.city || ''}, ${entry.state || ''}, ${entry.country || ''}`,
        contactPerson: {
          name: branch.contactPerson?.name || entry.contactPerson_name || '',
          designation: branch.contactPerson?.designation || entry.contactPerson_designation || '',
          email: branch.contactPerson?.email || entry.contactPerson_email || '',
          phone: branch.contactPerson?.phone || entry.contactPerson_phone || '',
          gender: branch.contactPerson?.gender || entry.contactPerson_gender || '',
        },
        status: branch.status || 'active',
        createdAt: branch.createdAt || new Date(),
        updatedAt: branch.updatedAt || new Date(),
      })) : [];

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
        contactPerson: [{
          name: entry.contactPerson_name || '',
          designation: entry.contactPerson_designation || '',
          gender: entry.contactPerson_gender || '',
          email: entry.contactPerson_email || '',
          phone: entry.contactPerson_phone || '',
          address: {
            country: entry.contactPerson_country || entry.country || '',
            state: entry.contactPerson_state || entry.state || '',
            city: entry.contactPerson_city || entry.city || '',
            pincode: entry.contactPerson_pincode || entry.pincode || '',
            street: entry.contactPerson_street || ''
          }
        }],
        diagnostics: entry.diagnostics
          ? entry.diagnostics.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id))
          : [],
        documents: entry.documents
          ? entry.documents.split(',').map(doc => doc.trim())
          : [],
        branches: formattedBranches, // NEW: Added branches array
        staff: [] // Staff bulk add ka feature alag se banega
      });

      const saved = await company.save();
      savedCompanies.push(saved);
    }

    fs.unlinkSync(file.path); // remove uploaded Excel file

    res.status(200).json({
      message: 'Companies imported successfully',
      data: savedCompanies.map(company => ({
        id: company._id,
        name: company.name,
        email: company.email,
        branches: company.branches // Include branches in response
      }))
    });
  } catch (error) {
    console.error('Company import failed:', error);
    res.status(500).json({ 
      error: 'Failed to import companies',
      details: error.message 
    });
  }
};

// Helper function to generate branch code
function generateBranchCode(branchName) {
  const prefix = branchName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3);
  
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}



// // Safe JSON parse helper
// const parseJsonField = (field, defaultVal = []) => {
//   if (!field) return defaultVal;
//   if (typeof field === 'object') return field;
//   try {
//     return JSON.parse(String(field));
//   } catch (e) {
//     // try to handle comma separated lists as fallback for arrays
//     if (typeof field === 'string' && field.includes(',')) {
//       return field.split(',').map(s => s.trim()).filter(Boolean);
//     }
//     return defaultVal;
//   }
// };

// // Normalize excel entry keys (case-insensitive)
// const getField = (entry, ...keys) => {
//   for (const key of keys) {
//     if (Object.prototype.hasOwnProperty.call(entry, key)) return entry[key];
//     // try case-insensitive match
//     const foundKey = Object.keys(entry).find(k => k.toLowerCase() === key.toLowerCase());
//     if (foundKey) return entry[foundKey];
//   }
//   return undefined;
// };



// Safe JSON parse helper
const parseJsonField = (field, defaultVal = []) => {
  if (!field) return defaultVal;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(String(field));
  } catch (e) {
    if (typeof field === 'string' && field.includes(',')) {
      return field.split(',').map(s => s.trim()).filter(Boolean);
    }
    return defaultVal;
  }
};

// Normalize excel entry keys (case-insensitive)
const getField = (entry, ...keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(entry, key)) return entry[key];
    const foundKey = Object.keys(entry).find(k => k.toLowerCase() === key.toLowerCase());
    if (foundKey) return entry[foundKey];
  }
  return undefined;
};


export const importStaffFromExcel = async (req, res) => {
  try {
    const file = req.file;
    const companyId = req.params.companyId;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const savedStaff = [];
    const skipped = [];

    // Helper function to parse any date format
    const parseAnyDate = (dateValue) => {
      if (!dateValue && dateValue !== 0) return null;
      
      console.log(`Parsing date: ${dateValue} (type: ${typeof dateValue})`);
      
      // If already a Date object
      if (dateValue instanceof Date) {
        return !isNaN(dateValue.getTime()) ? dateValue : null;
      }
      
      // Handle string dates
      if (typeof dateValue === 'string') {
        const cleanValue = dateValue.trim();
        
        // 1. DD-MM-YYYY (19-05-1990, 19/05/1990)
        const ddMMyyyy = cleanValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (ddMMyyyy) {
          const day = ddMMyyyy[1].padStart(2, '0');
          const month = ddMMyyyy[2].padStart(2, '0');
          const year = ddMMyyyy[3];
          const date = new Date(`${year}-${month}-${day}T00:00:00`);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed as DD-MM-YYYY: ${cleanValue} -> ${date.toISOString()}`);
            return date;
          }
        }
        
        // 2. YYYY-MM-DD (1990-05-19)
        const yyyyMMdd = cleanValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (yyyyMMdd) {
          const year = yyyyMMdd[1];
          const month = yyyyMMdd[2].padStart(2, '0');
          const day = yyyyMMdd[3].padStart(2, '0');
          const date = new Date(`${year}-${month}-${day}T00:00:00`);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed as YYYY-MM-DD: ${cleanValue} -> ${date.toISOString()}`);
            return date;
          }
        }
        
        // 3. MM-DD-YYYY (05-19-1990)
        const mmDDyyyy = cleanValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (mmDDyyyy) {
          const month = mmDDyyyy[1].padStart(2, '0');
          const day = mmDDyyyy[2].padStart(2, '0');
          const year = mmDDyyyy[3];
          const date = new Date(`${year}-${month}-${day}T00:00:00`);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed as MM-DD-YYYY: ${cleanValue} -> ${date.toISOString()}`);
            return date;
          }
        }
        
        // 4. Try with dots (19.05.1990)
        const dotFormat = cleanValue.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dotFormat) {
          const day = dotFormat[1].padStart(2, '0');
          const month = dotFormat[2].padStart(2, '0');
          const year = dotFormat[3];
          const date = new Date(`${year}-${month}-${day}T00:00:00`);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed as DD.MM.YYYY: ${cleanValue} -> ${date.toISOString()}`);
            return date;
          }
        }
        
        // 5. Try direct JavaScript Date parsing
        const directDate = new Date(cleanValue);
        if (!isNaN(directDate.getTime())) {
          console.log(`Direct parsing successful: ${cleanValue} -> ${directDate.toISOString()}`);
          return directDate;
        }
        
        // 6. Try parsing without separators (19051990)
        const noSep = cleanValue.match(/^(\d{2})(\d{2})(\d{4})$/);
        if (noSep) {
          const day = noSep[1];
          const month = noSep[2];
          const year = noSep[3];
          const date = new Date(`${year}-${month}-${day}T00:00:00`);
          if (!isNaN(date.getTime())) {
            console.log(`Parsed as DDMMYYYY: ${cleanValue} -> ${date.toISOString()}`);
            return date;
          }
        }
        
        // 7. Try parsing as Excel serial string
        if (!isNaN(cleanValue)) {
          const excelSerial = new Date((Number(cleanValue) - 25569) * 86400 * 1000);
          if (!isNaN(excelSerial.getTime())) {
            console.log(`Parsed as Excel serial: ${cleanValue} -> ${excelSerial.toISOString()}`);
            return excelSerial;
          }
        }
      }
      
      // Handle numbers (Excel serial dates)
      if (typeof dateValue === 'number') {
        // Excel serial number (days since 1900-01-00)
        const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime())) {
          console.log(`Parsed as Excel number: ${dateValue} -> ${excelDate.toISOString()}`);
          return excelDate;
        }
        
        // Try as timestamp
        const timestampDate = new Date(dateValue);
        if (!isNaN(timestampDate.getTime())) {
          console.log(`Parsed as timestamp: ${dateValue} -> ${timestampDate.toISOString()}`);
          return timestampDate;
        }
      }
      
      console.warn(`❌ Could not parse date: ${dateValue}`);
      return null;
    };

    for (const [index, entry] of data.entries()) {
      try {
        console.log(`\n=== Processing Row ${index + 2} ===`);
        
        // Debug: Log all available fields
        console.log('Available fields:', Object.keys(entry));
        
        // आपके Excel headers के according fields get करें
        const name = getField(entry, 'Name', 'Employee Name', 'name') || '';
        const employeeId = getField(entry, 'Employee ID', 'EmployeeID', 'Emp ID', 'employeeId') || '';
        const role = getField(entry, 'Role', 'role') || 'Staff';
        const department = getField(entry, 'Department', 'department') || '';
        const contact_number = getField(entry, 'Contact Number', 'ContactNumber', 'Phone', 'contact') || '';
        const email = getField(entry, 'Email', 'email') || '';
        
        // DOB को किसी भी header से get करें
        const dobRaw = getField(entry, 'DOB (YYYY-MM-DD)', 'DOB', 'Date of Birth', 'Birth Date', 
                              'dob', 'date_of_birth', 'BirthDate', 'Date', 'DOB');
        
        console.log(`DOB Raw Value: "${dobRaw}" (Type: ${typeof dobRaw})`);
        
        // Parse dob using our universal date parser
        const dob = parseAnyDate(dobRaw);
        
        if (dobRaw && !dob) {
          console.warn(`⚠️  Date parsing failed for: ${dobRaw}`);
          skipped.push({
            row: index + 2,
            reason: 'Invalid DOB format',
            dob: dobRaw,
            suggestion: 'Use format: YYYY-MM-DD, DD-MM-YYYY, or MM/DD/YYYY'
          });
        }
        
        const gender = getField(entry, 'Gender', 'gender', 'Sex') || '';
        const ageRaw = getField(entry, 'Age', 'age');
        const age = ageRaw !== undefined && ageRaw !== null && ageRaw !== '' ? Number(ageRaw) : undefined;
        const address = getField(entry, 'Address', 'address', 'Location') || '';
        const password = getField(entry, 'Password', 'password', 'pass') || '';
        const branch = getField(entry, 'Branch ID (Optional)', 'Branch ID', 'Branch', 
                              'branch_id', 'branch', 'BranchId') || '';

        // Optional: Additional fields if needed
        const walletRaw = getField(entry, 'wallet_balance', 'Wallet', 'wallet') || 0;
        const wallet_balance = Number(walletRaw) || 0;

        // Debug log all extracted values
        console.log('Extracted values:', {
          name,
          employeeId,
          email,
          dob: dob ? dob.toISOString().split('T')[0] : 'null',
          gender,
          age,
          department,
          role,
          contact_number,
          branch
        });

        // Add other optional fields parsing if needed...
        const wallet_logs = parseJsonField(getField(entry, 'wallet_logs', 'Wallet Logs'), []);
        const family_members = parseJsonField(getField(entry, 'family_members', 'Family Members'), []);
        const addresses = parseJsonField(getField(entry, 'addresses', 'Addresses'), []);
        const issues = parseJsonField(getField(entry, 'issues', 'Issues'), []);
        const doctorAppointmentsRaw = getField(entry, 'doctorAppointments', 'Doctor Appointments', 'doctorappointments');
        const doctorAppointments = (doctorAppointmentsRaw ? String(doctorAppointmentsRaw).split(',').map(s => s.trim()).filter(Boolean).map(id => {
          try { return mongoose.Types.ObjectId(id); } catch (e) { return null; }
        }).filter(Boolean) : []);

        // Build payload with available fields
        const staffPayload = {};
        if (employeeId) staffPayload.employeeId = employeeId;
        if (name) staffPayload.name = name;
        if (email) staffPayload.email = email;
        if (password) staffPayload.password = password;
        if (role) staffPayload.role = role;
        if (contact_number) staffPayload.contact_number = contact_number;
        if (address) staffPayload.address = address;
        if (department) staffPayload.department = department;
        if (gender) staffPayload.gender = gender;
        if (dob) {
          staffPayload.dob = dob;
          console.log(`✅ DOB set: ${dob.toISOString()}`);
        }
        if (age !== undefined) staffPayload.age = age;
        if (wallet_balance !== undefined) staffPayload.wallet_balance = wallet_balance;
        if (branch) staffPayload.branch = branch;
        if (doctorAppointments.length) staffPayload.doctorAppointments = doctorAppointments;
        if (wallet_logs && wallet_logs.length) staffPayload.wallet_logs = wallet_logs;
        if (family_members && family_members.length) staffPayload.family_members = family_members;
        if (addresses && addresses.length) staffPayload.addresses = addresses;
        if (issues && issues.length) staffPayload.issues = issues;

        // Validation
        if (!email && !name) {
          skipped.push({ row: index + 2, reason: 'Missing both name and email', raw: entry });
          continue;
        }

        // Branch validation
        if (branch) {
          try {
            const branchExists = company.branches.some(b => b._id.toString() === branch);
            if (!branchExists) {
              skipped.push({ row: index + 2, reason: 'Invalid branch ID - branch not found in company', branch, raw: entry });
              continue;
            }
          } catch (branchErr) {
            skipped.push({ row: index + 2, reason: 'Invalid branch ID format', branch, error: branchErr.message, raw: entry });
            continue;
          }
        }

        // Email uniqueness check
        if (email) {
          const exists = await Staff.findOne({ email }).lean();
          if (exists) {
            skipped.push({ row: index + 2, reason: 'Email already exists', email });
            continue;
          }
        }

        // Create and save staff
        const staff = new Staff(staffPayload);
        const saved = await staff.save();
        savedStaff.push(saved);

        console.log(`✅ Staff saved: ${saved.name} (${saved.email})`);
        console.log(`   DOB in DB: ${saved.dob ? saved.dob.toISOString() : 'null'}`);

        // Add to company staff array
        const staffInfoForCompany = {
          _id: saved._id,
          employeeId: saved.employeeId || '',
          name: saved.name,
          role: saved.role,
          contact_number: saved.contact_number,
          email: saved.email,
          dob: saved.dob,
          gender: saved.gender,
          age: saved.age,
          address: saved.address,
          profileImage: saved.profileImage,
          idImage: saved.idImage,
          wallet_balance: saved.wallet_balance,
          department: saved.department,
          designation: saved.designation || '',
          branch: saved.branch,
        };

        console.log(`Adding staff to company:`, staffInfoForCompany);

        const updatedCompany = await Company.findByIdAndUpdate(companyId, {
          $push: { staff: staffInfoForCompany }
        }, { new: true });

        if (updatedCompany) {
          console.log(`✅ Successfully added staff to company: ${companyId}`);
        } else {
          console.log(`❌ Failed to update company ${companyId} with staff details.`);
        }

        // Send email
        let mailSent = false;
        let mailSentAt = null;
        if (saved.email) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'support@credenthealth.com',
              pass: 'sgiiitsfrtadacaq'
            }
          });

          const mailOptions = {
            from: 'support@credenthealth.com',
            to: saved.email,
            subject: 'Your CredentHealth Login Credentials',
            text: `Dear ${saved.name || 'User'},\n\nYour account on the CredentHealth Portal has been successfully created. Please find your login details below:\n\nWebsite: https://credenthealth.com/\n\nLogin ID: ${saved.email}\nPassword: ${password || saved.password || ''}\n\nYou may now log in using the above credentials to access your account and portal services.\n\nIf you require any assistance, please reach out to our support team at support@credenthealth.com.\n\nThank you for choosing CredentHealth.\n\nWarm regards,\nTeam CredentHealth | CredentHealth | Elthium Healthcare Pvt. Ltd. | support@credenthealth.com`
          };

          try {
            const info = await transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${saved.email}: ${info.response}`);
            mailSent = true;
            mailSentAt = new Date();

            await Staff.findByIdAndUpdate(saved._id, {
              $set: {
                mailSent: mailSent,
                mailSentAt: mailSentAt
              }
            });

            // Update company staff array with mailSent
            await Company.findByIdAndUpdate(companyId, {
              $addToSet: {
                staff: {
                  ...staffInfoForCompany,
                  mailSent: mailSent,
                  mailSentAt: mailSentAt
                }
              }
            });

          } catch (mailErr) {
            console.error(`❌ Failed to send email to ${saved.email}:`, mailErr);
            skipped.push({ row: index + 2, reason: 'Email send failed', email: saved.email, error: mailErr.message });
          }
        }

        console.log(`=== Row ${index + 2} Completed ===\n`);

      } catch (rowErr) {
        console.error('❌ Error processing row:', rowErr);
        skipped.push({ 
          row: index + 2, 
          reason: 'Processing error', 
          error: rowErr.message, 
          raw: entry 
        });
      }
    }

    // Clean up uploaded file
    try { 
      fs.unlinkSync(file.path); 
    } catch (e) { 
      console.warn('Failed to delete uploaded file', e); 
    }

    console.log(`\n✅ Import finished: ${savedStaff.length} staff records saved.`);
    console.log(`⚠️  Skipped rows: ${skipped.length}`);
    
    if (skipped.length > 0) {
      console.log('Skipped details:', skipped);
    }

    return res.status(200).json({
      message: 'Import completed',
      savedCount: savedStaff.length,
      saved: savedStaff.map(s => ({ 
        id: s._id, 
        employeeId: s.employeeId,
        name: s.name, 
        email: s.email,
        dob: s.dob ? s.dob.toISOString().split('T')[0] : null,
        department: s.department,
        branch: s.branch
      })),
      skipped
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    return res.status(500).json({ 
      error: 'Failed to import staff', 
      details: error.message 
    });
  }
};
export const getDashboardCounts = async (req, res) => {
  try {
    // 1. Get total counts in parallel
    const [
      companyCount,
      diagnosticCount,
      appointmentCount,
      bookingCount,
      staffCount,
      doctorCount,
      hraUniqueStaffIds
    ] = await Promise.all([
      Company.countDocuments(),
      Diagnostic.countDocuments(),
      Booking.countDocuments({ isBooked: true, type: "doctor" }),
      Booking.countDocuments({ type: "diagnostic" }),
      Staff.countDocuments(),
      Doctor.countDocuments(),
      HraSubmission.distinct("staffId") // Unique staff who submitted HRA
    ]);

    const hraCount = hraUniqueStaffIds.length;

    // 2. Chart data for last 5 months
    const now = new Date();
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(now.getMonth() - 4);

    // Aggregate bookings for doctor & diagnostic
    const bookingPipeline = [
      {
        $match: {
          createdAt: { $gte: fiveMonthsAgo },
          isBooked: true,
        },
      },
      {
        $project: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          type: 1,
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          doctor: { $sum: { $cond: [{ $eq: ["$type", "doctor"] }, 1, 0] } },
          diagnostic: { $sum: { $cond: [{ $eq: ["$type", "diagnostic"] }, 1, 0] } },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ];

    const bookingChartResults = await Booking.aggregate(bookingPipeline);

    // Aggregate HRA submissions (unique staff per month)
    const hraPipeline = [
      {
        $match: { submittedAt: { $gte: fiveMonthsAgo } },
      },
      {
        $project: {
          month: { $month: "$submittedAt" },
          year: { $year: "$submittedAt" },
          staffId: 1,
        },
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          uniqueStaff: { $addToSet: "$staffId" }, // ensures uniqueness
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          hra: { $size: "$uniqueStaff" }, // count of unique staff
        },
      },
      {
        $sort: { year: 1, month: 1 },
      },
    ];

    const hraChartResults = await HraSubmission.aggregate(hraPipeline);

    // Merge booking and HRA data into chartData
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = [];

    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setMonth(now.getMonth() - 4 + i);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const bookingEntry = bookingChartResults.find(
        e => e._id?.month === month && e._id?.year === year
      );
      const hraEntry = hraChartResults.find(e => e.month === month && e.year === year);

      chartData.push({
        name: monthNames[month],
        doctor: bookingEntry?.doctor || 0,
        diagnostic: bookingEntry?.diagnostic || 0,
        hra: hraEntry?.hra || 0,
      });
    }

    // 3. Return dashboard data
    res.status(200).json({
      success: true,
      data: {
        counts: {
          companies: companyCount,
          diagnostics: diagnosticCount,
          appointments: appointmentCount,
          bookings: bookingCount,
          staff: staffCount,
          doctors: doctorCount,
          hra: hraCount
        },
        chart: chartData
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard data",
      error: error.message
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
    const { ageGroup, diagnostics, applyToAllStaff, companyId } = req.body;

    console.log("===== REQUEST BODY =====");
    console.log("Company ID from request:", companyId);
    console.log("Age Group:", ageGroup);

    // ✅ Step 1: Staff fetch logic WITHOUT companyId check
    let staffMembers = [];

    if (applyToAllStaff) {
      // सभी staff fetch करें (companyId के बिना)
      staffMembers = await Staff.find({});
      console.log(`Fetched ALL staff: ${staffMembers.length}`);
    } else {
      if (!ageGroup) {
        return res.status(400).json({ message: 'Age group is required.' });
      }

      // Support multiple age groups separated by commas
      const ageRanges = ageGroup.split(',').map(range => range.trim());
      console.log("Age ranges parsed:", ageRanges);

      const ageQueryConditions = [];

      for (const range of ageRanges) {
        if (!range.includes('-')) {
          return res.status(400).json({ message: `Invalid age group format: "${range}". Use format like "20-30".` });
        }

        const [minAgeStr, maxAgeStr] = range.split('-');
        const minAge = parseInt(minAgeStr);
        const maxAge = parseInt(maxAgeStr);

        if (isNaN(minAge) || isNaN(maxAge)) {
          return res.status(400).json({ message: `Invalid age range: "${range}".` });
        }

        ageQueryConditions.push({ age: { $gte: minAge, $lte: maxAge } });
      }

      // Query staff matching any of the age ranges (companyId के बिना)
      staffMembers = await Staff.find({ $or: ageQueryConditions });

      if (staffMembers.length === 0) {
        // Debug: Check what ages exist in database
        const allStaffAges = await Staff.find({}, 'age name');
        console.log("Available staff ages:", allStaffAges.map(s => ({ name: s.name, age: s.age })).slice(0, 10));
        
        return res.status(404).json({ 
          message: 'No staff found for the given age group(s).',
          details: {
            ageRanges,
            totalStaffCount: allStaffAges.length,
            availableAges: [...new Set(allStaffAges.map(s => s.age).filter(Boolean).sort((a,b) => a-b))]
          }
        });
      }

      console.log(`Fetched Staff by age group: ${staffMembers.length}`);
      console.log("Sample staff:", staffMembers.slice(0, 3).map(s => ({ name: s.name, age: s.age })));
    }

    // ✅ Step 2: Validate diagnostic + package existence
    const diagnosticIds = diagnostics.map(d => d.diagnosticId);
    const diagnosticDocs = await Diagnostic.find({ _id: { $in: diagnosticIds } });

    if (diagnosticDocs.length === 0) {
      return res.status(404).json({ message: 'No diagnostics found matching the provided IDs.' });
    }

    // ✅ Step 3: Fetch company (if companyId provided)
    let company = null;
    if (companyId) {
      company = await Company.findById(companyId);
      if (company) {
        console.log(`Company found: ${company.companyName}`);
      } else {
        console.log("Company not found, but continuing with staff assignment only");
      }
    }

    // Prepare arrays to collect assigned data
    const companyPackagesToAdd = [];
    const companyDiagnosticsToAdd = []; // New: For diagnostics

    // ✅ Step 4: Loop through each staff member and assign packages
    for (const staff of staffMembers) {
      console.log("\n-------------------------------");
      console.log("STAFF:", staff.name, staff._id, "Age:", staff.age);
      let updated = false;

      for (const diagnostic of diagnostics) {
        const matchedDiagnostic = diagnosticDocs.find(d => d._id.toString() === diagnostic.diagnosticId);
        if (!matchedDiagnostic) continue;

        console.log("Processing Diagnostic:", matchedDiagnostic.name);

        // Add diagnostic to company diagnostics array (if company exists)
        if (company) {
          const diagnosticExistsInCompany = companyDiagnosticsToAdd.some(d => 
            d.diagnosticId.toString() === matchedDiagnostic._id.toString()
          );

          if (!diagnosticExistsInCompany) {
            companyDiagnosticsToAdd.push({
              diagnosticId: matchedDiagnostic._id,
              diagnosticName: matchedDiagnostic.name,
              diagnosticImage: matchedDiagnostic.image,
              assignedAt: new Date()
            });
          }
        }

        const selectedPackageIds = Array.isArray(diagnostic.packageIds) ? diagnostic.packageIds : [];
        console.log("Selected Package IDs:", selectedPackageIds);

        for (const pkgId of selectedPackageIds) {
          const matchedPackage = matchedDiagnostic.packages.find(pkg => pkg._id.toString() === pkgId);
          if (!matchedPackage) {
            console.log("❌ Package NOT FOUND:", pkgId);
            continue;
          }

          console.log("Matched Package:", matchedPackage.packageName);

          // Check if package already exists in staff
          const existsInStaff = staff.myPackages?.some(p =>
            p.diagnosticId?.toString() === matchedDiagnostic._id.toString() &&
            p.packageId?.toString() === matchedPackage._id.toString()
          ) || false;

          if (existsInStaff) {
            console.log("⚠️ Already Assigned to Staff → Skipping");
          } else {
            console.log("✅ Adding Package to Staff:", matchedPackage.packageName);

            // Initialize myPackages if it doesn't exist
            if (!staff.myPackages) {
              staff.myPackages = [];
            }

            const packageData = {
              diagnosticId: matchedDiagnostic._id,
              diagnosticName: matchedDiagnostic.name,
              packageId: matchedPackage._id,
              packageName: matchedPackage.packageName,
              price: matchedPackage.price,
              offerPrice: matchedPackage.offerPrice || matchedPackage.price,
              tests: matchedPackage.tests || [],
              description: matchedPackage.description || '',
              precautions: matchedPackage.precautions || '',
              totalTestsIncluded: matchedPackage.totalTestsIncluded || 0,
              assignedAt: new Date()
            };

            // Add companyId if company exists
            if (company) {
              packageData.companyId = company._id;
            }

            staff.myPackages.push(packageData);
            updated = true;
          }

          // Collect package for company if company exists
          if (company) {
            const packageExistsInCompany = companyPackagesToAdd.some(p =>
              p.diagnosticId?.toString() === matchedDiagnostic._id.toString() &&
              p.packageId?.toString() === matchedPackage._id.toString()
            );

            if (!packageExistsInCompany) {
              companyPackagesToAdd.push({
                diagnosticId: matchedDiagnostic._id,
                diagnosticName: matchedDiagnostic.name,
                packageId: matchedPackage._id,
                packageName: matchedPackage.packageName,
                price: matchedPackage.price,
                offerPrice: matchedPackage.offerPrice || matchedPackage.price,
                tests: matchedPackage.tests || [],
                description: matchedPackage.description || '',
                precautions: matchedPackage.precautions || '',
                totalTestsIncluded: matchedPackage.totalTestsIncluded || 0,
                totalStaffAssigned: staffMembers.length,
                assignedAt: new Date()
              });
            }
          }
        }
      }

      if (updated) {
        console.log("💾 Saving staff:", staff.name);
        await staff.save();
      } else {
        console.log("⚠️ No updates for staff:", staff.name);
      }
    }

    // ✅ Step 5: Add data to company if company exists
    if (company) {
      console.log("\n===== Adding Data to Company =====");
      
      // 5.1 Add diagnostics to company diagnostics array
      if (companyDiagnosticsToAdd.length > 0) {
        console.log(`Adding ${companyDiagnosticsToAdd.length} unique diagnostics to company`);
        
        // Initialize company.diagnostics array if it doesn't exist
        if (!company.diagnostics) {
          company.diagnostics = [];
        }
        
        for (const diagToAdd of companyDiagnosticsToAdd) {
          // Check if diagnostic already exists in company
          const existsInCompany = company.diagnostics.some(d =>
            d.diagnosticId && d.diagnosticId.toString() === diagToAdd.diagnosticId.toString()
          );
          
          if (!existsInCompany) {
            company.diagnostics.push(diagToAdd);
            console.log("✅ Added Diagnostic to Company:", diagToAdd.diagnosticName);
          } else {
            console.log("⚠️ Diagnostic already exists in Company:", diagToAdd.diagnosticName);
          }
        }
      }
      
      // 5.2 Add packages to company packages array
      if (companyPackagesToAdd.length > 0) {
        console.log(`Adding ${companyPackagesToAdd.length} unique packages to company`);

        // Initialize company.packages if it doesn't exist
        if (!company.packages) {
          company.packages = [];
        }

        for (const packageToAdd of companyPackagesToAdd) {
          // Check if package already exists in company
          const existsInCompany = company.packages.some(p =>
            p.diagnosticId?.toString() === packageToAdd.diagnosticId.toString() &&
            p.packageId?.toString() === packageToAdd.packageId.toString()
          );

          if (!existsInCompany) {
            company.packages.push(packageToAdd);
            console.log("✅ Added to Company:", packageToAdd.packageName);
          } else {
            console.log("⚠️ Already exists in Company:", packageToAdd.packageName);
            
            // Update total staff count for existing package
            const existingPackage = company.packages.find(p =>
              p.diagnosticId?.toString() === packageToAdd.diagnosticId.toString() &&
              p.packageId?.toString() === packageToAdd.packageId.toString()
            );
            
            if (existingPackage) {
              existingPackage.totalStaffAssigned = (existingPackage.totalStaffAssigned || 0) + staffMembers.length;
            }
          }
        }
      }

      await company.save();
      console.log("💾 Company data updated (diagnostics and packages)");
    }

    res.status(200).json({
      message: `Packages assigned to ${applyToAllStaff ? 'all staff' : 'staff within specified age group(s)'} successfully.`,
      staffCount: staffMembers.length,
      companyDiagnosticsAdded: companyDiagnosticsToAdd.length,
      companyPackagesAdded: companyPackagesToAdd.length,
      companyName: company ? company.companyName : "No company specified",
      staffNames: staffMembers.slice(0, 5).map(s => s.name) // First 5 names only
    });

  } catch (error) {
    console.error('Error in addTestsToStaffByAgeGroup:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


export const addTestToStaffByAgeGroup = async (req, res) => {
  try {
    const { ageGroup, diagnostics, applyToAllStaff, companyId } = req.body;

    console.log("===== Incoming Payload =====");
    console.log(JSON.stringify(req.body, null, 2));

    let staffMembers = [];
    let company = null;

    // Step 1 → Fetch company if companyId provided
    if (companyId) {
      company = await Company.findById(companyId);
      if (company) {
        console.log(`Company found: ${company.companyName}`);
      } else {
        console.log("Company not found, but continuing with staff assignment");
      }
    }

    // Step 2 → Fetch staff WITHOUT companyId check (temporary fix)
    if (applyToAllStaff) {
      // Fetch all staff (since companyId field doesn't exist)
      staffMembers = await Staff.find({});
      console.log(`Fetched ALL staff: ${staffMembers.length}`);
    } else {
      if (!ageGroup) {
        return res.status(400).json({ message: "Age group is required when not applying to all staff" });
      }

      const ageRanges = ageGroup.split(',').map(r => r.trim());
      console.log("Age Ranges:", ageRanges);

      // Create age conditions WITHOUT companyId
      const conditions = ageRanges.map(range => {
        const [minA, maxA] = range.split('-');
        return { 
          age: { $gte: parseInt(minA), $lte: parseInt(maxA) } 
        };
      });

      // Fetch staff by age only
      staffMembers = await Staff.find({ $or: conditions });
      console.log(`Fetched Staff by age group: ${staffMembers.length}`);
    }

    if (staffMembers.length === 0) {
      console.log("No staff found");
      
      // Debug: Show what ages exist in database
      const sampleStaff = await Staff.find({}, 'name age').limit(10);
      console.log("Sample staff ages in DB:", sampleStaff.map(s => ({ name: s.name, age: s.age })));
      
      return res.status(404).json({ 
        message: "No staff found for the given criteria",
        debug: {
          totalStaffInDB: await Staff.countDocuments(),
          sampleAges: sampleStaff.map(s => s.age),
          ageGroupRequested: ageGroup
        }
      });
    }

    // Step 3 → Validate diagnostics
    const diagnosticIds = diagnostics.map(d => d.diagnosticId);
    console.log("Diagnostic IDs:", diagnosticIds);

    const diagnosticDocs = await Diagnostic.find({ _id: { $in: diagnosticIds } }).populate("tests");

    console.log("Diagnostics Found:", diagnosticDocs.length);

    // Prepare arrays to collect assigned data
    const companyTestsToAdd = [];
    const companyDiagnosticsToAdd = []; // New: For diagnostics

    // Step 4 → Loop through staff and assign tests
    for (const staff of staffMembers) {
      console.log("\n-------------------------------");
      console.log("STAFF:", staff.name, staff._id, "Age:", staff.age);
      let updated = false;

      for (const diag of diagnostics) {
        console.log("Processing Diagnostic:", diag.diagnosticId);

        const diagDoc = diagnosticDocs.find(d => d._id.toString() === diag.diagnosticId);
        if (!diagDoc) {
          console.log("❌ Diagnostic NOT FOUND:", diag.diagnosticId);
          continue;
        }

        console.log("Selected Tests From FE:", diag.testIds);

        // Add diagnostic to company diagnostics array (if company exists)
        if (company) {
          const diagnosticExistsInCompany = companyDiagnosticsToAdd.some(d => 
            d.diagnosticId.toString() === diagDoc._id.toString()
          );

          if (!diagnosticExistsInCompany) {
            companyDiagnosticsToAdd.push({
              diagnosticId: diagDoc._id,
              diagnosticName: diagDoc.name,
              diagnosticImage: diagDoc.image,
              assignedAt: new Date()
            });
          }
        }

        const selectedTests = diag.testIds || [];

        for (const testObj of selectedTests) {
          console.log("Test Object From FE:", testObj);

          const matchedTest = await Test.findById(testObj.testId);

          if (!matchedTest) {
            console.log("❌ Test NOT FOUND in DB:", testObj.testId);
            continue;
          }

          console.log("Matched DB Test:", matchedTest.name);

          // Initialize myTests array if it doesn't exist
          if (!staff.myTests) {
            staff.myTests = [];
          }

          // Check if test already exists in staff
          const existsInStaff = staff.myTests.some(t =>
            t.diagnosticId && t.diagnosticId.toString() === diagDoc._id.toString() &&
            t.testId && t.testId.toString() === matchedTest._id.toString()
          );

          if (existsInStaff) {
            console.log("⚠️ Already Assigned to Staff → Skipping");
          } else {
            console.log("✅ Adding Test to Staff:", matchedTest.name);

            const testData = {
              diagnosticId: diagDoc._id,
              diagnosticName: diagDoc.name,
              testId: matchedTest._id,
              testName: matchedTest.name,
              price: matchedTest.price,
              fastingRequired: matchedTest.fastingRequired,
              homeCollectionAvailable: matchedTest.homeCollectionAvailable,
              reportIn24Hrs: matchedTest.reportIn24Hrs,
              reportHour: matchedTest.reportHour,
              description: matchedTest.description,
              instruction: matchedTest.instruction,
              precaution: matchedTest.precaution,
              image: matchedTest.image,
              subTests: testObj.subTests || [],
              assignedAt: new Date()
            };

            // Add companyId if company exists
            if (company) {
              testData.companyId = company._id;
            }

            staff.myTests.push(testData);
            updated = true;
          }

          // Collect test for company if company exists
          if (company) {
            const testExistsInCompany = companyTestsToAdd.some(t =>
              t.diagnosticId && t.diagnosticId.toString() === diagDoc._id.toString() &&
              t.testId && t.testId.toString() === matchedTest._id.toString()
            );

            if (!testExistsInCompany) {
              companyTestsToAdd.push({
                diagnosticId: diagDoc._id,
                diagnosticName: diagDoc.name,
                testId: matchedTest._id,
                testName: matchedTest.name,
                price: matchedTest.price,
                fastingRequired: matchedTest.fastingRequired,
                homeCollectionAvailable: matchedTest.homeCollectionAvailable,
                reportIn24Hrs: matchedTest.reportIn24Hrs,
                reportHour: matchedTest.reportHour,
                description: matchedTest.description,
                instruction: matchedTest.instruction,
                precaution: matchedTest.precaution,
                image: matchedTest.image,
                subTests: testObj.subTests || [],
                totalStaffAssigned: staffMembers.length,
                assignedAt: new Date()
              });
            }
          }
        }
      }

      if (updated) {
        console.log("💾 Saving staff:", staff.name);
        await staff.save();
      } else {
        console.log("⚠️ No updates for staff:", staff.name);
      }
    }

    // Step 5 → Add data to company if company exists
    if (company) {
      console.log("\n===== Adding Data to Company =====");
      
      // 5.1 Add diagnostics to company diagnostics array
      if (companyDiagnosticsToAdd.length > 0) {
        console.log(`Adding ${companyDiagnosticsToAdd.length} unique diagnostics to company`);
        
        // Initialize company.diagnostics array if it doesn't exist
        if (!company.diagnostics) {
          company.diagnostics = [];
        }
        
        for (const diagToAdd of companyDiagnosticsToAdd) {
          // Check if diagnostic already exists in company
          const existsInCompany = company.diagnostics.some(d =>
            d.diagnosticId && d.diagnosticId.toString() === diagToAdd.diagnosticId.toString()
          );
          
          if (!existsInCompany) {
            company.diagnostics.push(diagToAdd);
            console.log("✅ Added Diagnostic to Company:", diagToAdd.diagnosticName);
          } else {
            console.log("⚠️ Diagnostic already exists in Company:", diagToAdd.diagnosticName);
          }
        }
      }
      
      // 5.2 Add tests to company tests array
      if (companyTestsToAdd.length > 0) {
        console.log(`Adding ${companyTestsToAdd.length} unique tests to company`);

        // Initialize company.tests array if it doesn't exist
        if (!company.tests) {
          company.tests = [];
        }

        for (const testToAdd of companyTestsToAdd) {
          // Check if test already exists in company
          const existsInCompany = company.tests.some(t =>
            t.diagnosticId && t.diagnosticId.toString() === testToAdd.diagnosticId.toString() &&
            t.testId && t.testId.toString() === testToAdd.testId.toString()
          );

          if (!existsInCompany) {
            company.tests.push(testToAdd);
            console.log("✅ Added to Company:", testToAdd.testName);
          } else {
            console.log("⚠️ Already exists in Company:", testToAdd.testName);
            
            // Update total staff count for existing test
            const existingTest = company.tests.find(t =>
              t.diagnosticId && t.diagnosticId.toString() === testToAdd.diagnosticId.toString() &&
              t.testId && t.testId.toString() === testToAdd.testId.toString()
            );
            
            if (existingTest) {
              existingTest.totalStaffAssigned = (existingTest.totalStaffAssigned || 0) + staffMembers.length;
            }
          }
        }
      }

      await company.save();
      console.log("💾 Company data updated (diagnostics and tests)");
    }

    return res.status(200).json({ 
      message: "Tests assigned successfully.",
      staffCount: staffMembers.length,
      companyDiagnosticsAdded: companyDiagnosticsToAdd.length,
      companyTestsAdded: companyTestsToAdd.length,
      companyName: company ? company.companyName : "Not specified",
      assignedStaff: staffMembers.slice(0, 5).map(s => ({ name: s.name, age: s.age }))
    });

  } catch (error) {
    console.error("Error in addTestsToStaffByAgeGroup:", error);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      stack: error.stack 
    });
  }
};

export const addScansToStaffByAgeGroup = async (req, res) => {
  try {
    const { ageGroup, diagnostics, applyToAllStaff, companyId } = req.body;

    console.log("===== Incoming Scan Payload =====");
    console.log(JSON.stringify(req.body, null, 2));

    let staffMembers = [];
    let company = null;

    // Step 1 → Fetch company if companyId provided
    if (companyId) {
      company = await Company.findById(companyId);
      if (company) {
        console.log(`Company found: ${company.companyName}`);
      } else {
        console.log("Company not found, but continuing with staff assignment");
      }
    }

    // Step 2 → Fetch staff WITHOUT companyId check
    if (applyToAllStaff) {
      // Fetch all staff (since companyId field doesn't exist in all staff)
      staffMembers = await Staff.find({});
      console.log(`Fetched ALL staff: ${staffMembers.length}`);
    } else {
      if (!ageGroup) {
        return res.status(400).json({ message: "Age group is required when not applying to all staff" });
      }

      const ageRanges = ageGroup.split(',').map(r => r.trim());
      console.log("Age Ranges:", ageRanges);

      // Create age conditions WITHOUT companyId
      const conditions = ageRanges.map(range => {
        const [minA, maxA] = range.split('-');
        return { 
          age: { $gte: parseInt(minA), $lte: parseInt(maxA) } 
        };
      });

      // Fetch staff by age only
      staffMembers = await Staff.find({ $or: conditions });
      console.log(`Fetched Staff by age: ${staffMembers.length}`);
    }

    if (staffMembers.length === 0) {
      console.log("No staff found");
      
      // Debug information
      const sampleStaff = await Staff.find({}, 'name age').limit(5);
      return res.status(404).json({ 
        message: "No staff found for the given criteria",
        debug: {
          totalStaff: await Staff.countDocuments(),
          sampleStaff: sampleStaff.map(s => ({ name: s.name, age: s.age })),
          requestedAgeGroup: ageGroup
        }
      });
    }

    // Step 3 → Validate diagnostics
    const diagnosticIds = diagnostics.map(d => d.diagnosticId);
    console.log("Diagnostic IDs:", diagnosticIds);

    const diagnosticDocs = await Diagnostic.find({ _id: { $in: diagnosticIds } }).populate("scans");

    console.log("Diagnostics Found:", diagnosticDocs.length);

    // Prepare company scans array to collect all assigned scans
    const companyScansToAdd = [];
    // New: Collect unique diagnostic IDs for company
    const companyDiagnosticsToAdd = [];

    // Step 4 → Loop through staff and assign scans
    for (const staff of staffMembers) {
      console.log("\n-------------------------------");
      console.log("STAFF:", staff.name, staff._id, "Age:", staff.age);

      let updated = false;

      for (const diag of diagnostics) {
        console.log("Processing Diagnostic:", diag.diagnosticId);

        const diagDoc = diagnosticDocs.find(d => d._id.toString() === diag.diagnosticId);
        if (!diagDoc) {
          console.log("❌ Diagnostic NOT FOUND:", diag.diagnosticId);
          continue;
        }

        console.log("Selected Scans From FE:", diag.scanIds);

        const selectedScans = diag.scanIds || [];

        // Add diagnostic to company diagnostics array (if company exists)
        if (company) {
          const diagnosticExistsInCompany = companyDiagnosticsToAdd.some(d => 
            d.diagnosticId.toString() === diagDoc._id.toString()
          );

          if (!diagnosticExistsInCompany) {
            companyDiagnosticsToAdd.push({
              diagnosticId: diagDoc._id,
              diagnosticName: diagDoc.name,
              diagnosticImage: diagDoc.image,
              assignedAt: new Date()
            });
          }
        }

        for (const scanObj of selectedScans) {
          console.log("Scan Object From FE:", scanObj);

          const matchedScan = await Xray.findById(scanObj.scanId);

          if (!matchedScan) {
            console.log("❌ Scan NOT FOUND in DB:", scanObj.scanId);
            continue;
          }

          console.log("Matched DB Scan:", matchedScan.title);

          // Initialize myScans array if it doesn't exist
          if (!staff.myScans) {
            staff.myScans = [];
          }

          // Check if scan already exists in staff
          const existsInStaff = staff.myScans.some(s =>
            s.diagnosticId && s.diagnosticId.toString() === diagDoc._id.toString() &&
            s.scanId && s.scanId.toString() === matchedScan._id.toString()
          );

          if (existsInStaff) {
            console.log("⚠️ Already Assigned to Staff → Skipping");
          } else {
            console.log("✅ Adding Scan to Staff:", matchedScan.title);

            const scanData = {
              diagnosticId: diagDoc._id,
              diagnosticName: diagDoc.name,
              scanId: matchedScan._id,
              title: matchedScan.title,
              price: matchedScan.price,
              preparation: matchedScan.preparation,
              reportTime: matchedScan.reportTime,
              image: matchedScan.image,
              assignedAt: new Date()
            };

            // Add companyId if company exists
            if (company) {
              scanData.companyId = company._id;
            }

            staff.myScans.push(scanData);
            updated = true;
          }

          // Collect scan for company if company exists
          if (company) {
            const scanExistsInCompany = companyScansToAdd.some(s =>
              s.diagnosticId && s.diagnosticId.toString() === diagDoc._id.toString() &&
              s.scanId && s.scanId.toString() === matchedScan._id.toString()
            );

            if (!scanExistsInCompany) {
              companyScansToAdd.push({
                diagnosticId: diagDoc._id,
                diagnosticName: diagDoc.name,
                scanId: matchedScan._id,
                title: matchedScan.title,
                price: matchedScan.price,
                preparation: matchedScan.preparation,
                reportTime: matchedScan.reportTime,
                image: matchedScan.image,
                totalStaffAssigned: staffMembers.length,
                assignedAt: new Date()
              });
            }
          }
        }
      }

      if (updated) {
        console.log("💾 Saving staff:", staff.name);
        await staff.save();
      } else {
        console.log("⚠️ No new scans added for staff:", staff.name);
      }
    }

    // Step 5 → Add scans and diagnostics to company if company exists
    if (company) {
      console.log("\n===== Adding Data to Company =====");
      
      // 5.1 Add diagnostics to company diagnostics array
      if (companyDiagnosticsToAdd.length > 0) {
        console.log(`Adding ${companyDiagnosticsToAdd.length} unique diagnostics to company`);
        
        // Initialize company.diagnostics array if it doesn't exist
        if (!company.diagnostics) {
          company.diagnostics = [];
        }
        
        for (const diagToAdd of companyDiagnosticsToAdd) {
          // Check if diagnostic already exists in company
          const existsInCompany = company.diagnostics.some(d =>
            d.diagnosticId && d.diagnosticId.toString() === diagToAdd.diagnosticId.toString()
          );
          
          if (!existsInCompany) {
            company.diagnostics.push(diagToAdd);
            console.log("✅ Added Diagnostic to Company:", diagToAdd.diagnosticName);
          } else {
            console.log("⚠️ Diagnostic already exists in Company:", diagToAdd.diagnosticName);
          }
        }
      }
      
      // 5.2 Add scans to company scans array
      if (companyScansToAdd.length > 0) {
        console.log(`Adding ${companyScansToAdd.length} unique scans to company`);

        // Initialize company.scans array if it doesn't exist
        if (!company.scans) {
          company.scans = [];
        }

        for (const scanToAdd of companyScansToAdd) {
          // Check if scan already exists in company
          const existsInCompany = company.scans.some(s =>
            s.diagnosticId && s.diagnosticId.toString() === scanToAdd.diagnosticId.toString() &&
            s.scanId && s.scanId.toString() === scanToAdd.scanId.toString()
          );

          if (!existsInCompany) {
            company.scans.push(scanToAdd);
            console.log("✅ Added Scan to Company:", scanToAdd.title);
          } else {
            console.log("⚠️ Already exists in Company:", scanToAdd.title);
            
            // Update total staff count for existing scan
            const existingScan = company.scans.find(s =>
              s.diagnosticId && s.diagnosticId.toString() === scanToAdd.diagnosticId.toString() &&
              s.scanId && s.scanId.toString() === scanToAdd.scanId.toString()
            );
            
            if (existingScan) {
              existingScan.totalStaffAssigned = (existingScan.totalStaffAssigned || 0) + staffMembers.length;
            }
          }
        }
      }

      await company.save();
      console.log("💾 Company data updated (diagnostics and scans)");
    }

    return res.status(200).json({ 
      message: "Scans assigned successfully.",
      staffCount: staffMembers.length,
      companyDiagnosticsAdded: companyDiagnosticsToAdd.length,
      companyScansAdded: companyScansToAdd.length,
      companyName: company ? company.companyName : "Not specified",
      assignedStaffSample: staffMembers.slice(0, 3).map(s => ({ name: s.name, age: s.age }))
    });

  } catch (error) {
    console.error("Error in addScansToStaffByAgeGroup:", error);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      stack: error.stack 
    });
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
    console.log("📥 UPDATE TEST REQUEST RECEIVED");
    console.log("📝 Request Params:", req.params);
    console.log("📦 Request Body:", req.body);
    console.log("🆔 Test ID:", req.params.testId);
    
    const { testId } = req.params;
    const {
      name,
      price,
      gender, // NEW: Added gender
      description,
      instruction,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      reportHour,
      category,
      precaution,
      diagnosticIds
    } = req.body;

    console.log("🔍 Parsed data from request:");
    console.log("- Name:", name);
    console.log("- Price:", price);
    console.log("- Gender:", gender); // NEW: Log gender
    console.log("- Description:", description);
    console.log("- Instruction:", instruction);
    console.log("- Fasting Required:", fastingRequired);
    console.log("- Home Collection:", homeCollectionAvailable);
    console.log("- Report in 24Hrs:", reportIn24Hrs);
    console.log("- Report Hour:", reportHour);
    console.log("- Category:", category);
    console.log("- Precaution:", precaution);
    console.log("- Diagnostic IDs:", diagnosticIds);
    console.log("- Diagnostic IDs Type:", typeof diagnosticIds);

    // Trouver le test existant
    console.log("🔎 Looking for test with ID:", testId);
    const test = await Test.findById(testId);
    
    if (!test) {
      console.log("❌ Test not found with ID:", testId);
      return res.status(404).json({ 
        success: false,
        message: "Test not found" 
      });
    }
    
    console.log("✅ Test found:", test.name);

    // Validate gender if provided
    if (gender !== undefined && !['Male', 'Female', 'Both'].includes(gender)) {
      console.log("❌ Invalid gender value:", gender);
      return res.status(400).json({ 
        success: false,
        message: "Invalid gender value. Must be Male, Female, or Both" 
      });
    }

    // Sauvegarder les anciens diagnostics pour cleanup
    const oldDiagnosticIds = test.diagnostics || [];
    console.log("📊 Old Diagnostic IDs:", oldDiagnosticIds);

    // Mettre à jour les champs de base
    console.log("🔄 Updating basic fields...");
    if (name !== undefined) {
      console.log("Updating name:", test.name, "->", name);
      test.name = name;
    }
    if (price !== undefined) {
      console.log("Updating price:", test.price, "->", price);
      test.price = price;
    }
    if (gender !== undefined) { // NEW: Update gender
      console.log("Updating gender:", test.gender, "->", gender);
      test.gender = gender;
    }
    if (description !== undefined) {
      console.log("Updating description");
      test.description = description;
    }
    if (instruction !== undefined) {
      console.log("Updating instruction");
      test.instruction = instruction;
    }
    if (fastingRequired !== undefined) {
      console.log("Updating fastingRequired:", test.fastingRequired, "->", fastingRequired);
      test.fastingRequired = fastingRequired;
    }
    if (homeCollectionAvailable !== undefined) {
      console.log("Updating homeCollectionAvailable:", test.homeCollectionAvailable, "->", homeCollectionAvailable);
      test.homeCollectionAvailable = homeCollectionAvailable;
    }
    if (reportIn24Hrs !== undefined) {
      console.log("Updating reportIn24Hrs:", test.reportIn24Hrs, "->", reportIn24Hrs);
      test.reportIn24Hrs = reportIn24Hrs;
    }
    if (reportHour !== undefined) {
      console.log("Updating reportHour:", test.reportHour, "->", reportHour);
      test.reportHour = reportHour;
    }
    if (category !== undefined) {
      console.log("Updating category:", test.category, "->", category);
      test.category = category || 'General';
    }
    if (precaution !== undefined) {
      console.log("Updating precaution");
      test.precaution = precaution;
    }

    // Gérer les diagnostics si fournis
    if (diagnosticIds !== undefined) {
      console.log("🩺 Handling diagnostics...");
      // Convertir en tableau si nécessaire
      const newDiagnosticIds = Array.isArray(diagnosticIds) ? diagnosticIds : [];
      console.log("📋 New Diagnostic IDs:", newDiagnosticIds);
      console.log("📋 New Diagnostic IDs length:", newDiagnosticIds.length);

      // 1) Retirer ce test des anciens diagnostics
      if (oldDiagnosticIds.length > 0) {
        console.log("🗑️ Removing test from old diagnostics...");
        console.log("Old IDs to remove from:", oldDiagnosticIds);
        const removeResult = await Diagnostic.updateMany(
          { _id: { $in: oldDiagnosticIds } },
          { $pull: { tests: test._id } }
        );
        console.log("✅ Removed from diagnostics. Result:", removeResult);
      }

      // 2) Ajouter ce test aux nouveaux diagnostics
      if (newDiagnosticIds.length > 0) {
        console.log("➕ Adding test to new diagnostics...");
        console.log("New IDs to add to:", newDiagnosticIds);
        const addResult = await Diagnostic.updateMany(
          { _id: { $in: newDiagnosticIds } },
          { $addToSet: { tests: test._id } }
        );
        console.log("✅ Added to diagnostics. Result:", addResult);
      }

      // 3) Mettre à jour la référence dans le test
      console.log("🔄 Updating test diagnostics reference:", newDiagnosticIds);
      test.diagnostics = newDiagnosticIds;
    } else {
      console.log("ℹ️ No diagnosticIds provided in request");
    }

    console.log("💾 Saving test to database...");
    const updatedTest = await test.save();
    console.log("✅ Test saved successfully");

    // Populer les diagnostics pour la réponse
    console.log("🔍 Populating diagnostics for response...");
    const populatedTest = await Test.findById(updatedTest._id)
      .populate("diagnostics", "name _id");
    
    console.log("✅ Final populated test:", {
      id: populatedTest._id,
      name: populatedTest.name,
      gender: populatedTest.gender, // NEW: Log gender
      diagnosticsCount: populatedTest.diagnostics?.length,
      diagnostics: populatedTest.diagnostics?.map(d => ({ id: d._id, name: d.name }))
    });

    console.log("🎉 Sending success response...");
    return res.status(200).json({
      success: true,
      message: "Test updated successfully",
      test: populatedTest
    });

  } catch (err) {
    console.error("❌ ERROR in updateTests:");
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    console.error("Full Error Object:", err);
    
    return res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  }
};


export const deleteTests = async (req, res) => {
  try {
    const { testId } = req.params;

    // 1️⃣ Check if the test exists in the Test collection
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    // 2️⃣ Delete the test from the Test collection
    await Test.findByIdAndDelete(testId);
    console.log(`Test with ID: ${testId} deleted successfully.`);

    // 3️⃣ Remove the test from the Diagnostic schema's tests array
    const diagnosticUpdateResult = await Diagnostic.updateMany(
      { tests: testId }, // Searching for the ObjectId in the `tests` array
      { $pull: { tests: testId } } // Removing the testId from the `tests` array
    );

    if (diagnosticUpdateResult.modifiedCount > 0) {
      console.log(`Test with ID: ${testId} removed from Diagnostics.`);
    } else {
      console.log(`Test with ID: ${testId} not found in any Diagnostic's tests array.`);
    }

    // 4️⃣ Remove the test from the Staff schema's myTests array
    const staffUpdateResult = await Staff.updateMany(
      { "myTests.testId": testId },
      { $pull: { myTests: { testId } } }
    );

    if (staffUpdateResult.modifiedCount > 0) {
      console.log(`Test with ID: ${testId} removed from Staff myTests.`);
    } else {
      console.log(`Test with ID: ${testId} not found in any Staff's myTests.`);
    }

    // 5️⃣ Return success response
    return res.status(200).json({
      message: "Test deleted successfully and references removed from Diagnostic and Staff schemas."
    });
    
  } catch (err) {
    console.error("❌ Error deleting test:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const deleteScan = async (req, res) => {
  try {
    const { scanId } = req.params;

    // Validate the ID
    if (!scanId || !mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({ message: "Valid scanId is required" });
    }

    const scan = await Xray.findById(scanId);
    if (!scan) {
      return res.status(404).json({ message: "Scan/Xray not found" });
    }

    await Xray.findByIdAndDelete(scanId);

    return res.status(200).json({
      message: "Scan/Xray deleted successfully"
    });
  } catch (err) {
    console.error("❌ Error deleting Scan/Xray:", err);
    return res.status(500).json({ message: "Server error" });
  }
};








export const createPackage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      price,
      gender, // NEW: Get gender from request
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
      diagnosticIds
    } = req.body;

    console.log("📦 Package creation request body:", req.body); // Debug log

    // Validate gender value
    const validGenders = ['Male', 'Female', 'Both'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ 
        message: "Invalid gender value. Must be one of: Male, Female, Both" 
      });
    }

    // Create new package with gender
    const newPackage = new Package({
      name,
      price,
      gender, // NEW: Include gender
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
      diagnostics: diagnosticIds
    });

    console.log("💾 Saving package with data:", {
      name,
      price,
      gender,
      totalTestsIncluded,
      includedTestsCount: includedTests?.length,
      diagnosticIdsCount: diagnosticIds?.length
    });

    const savedPackage = await newPackage.save({ session });

    // Update each diagnostic center with the new package ID
    if (diagnosticIds && diagnosticIds.length > 0) {
      const updateResult = await Diagnostic.updateMany(
        { _id: { $in: diagnosticIds } },
        { $addToSet: { packages: savedPackage._id } }, // Use $addToSet to avoid duplicates
        { session }
      );
      console.log(`✅ Linked package to ${updateResult.modifiedCount} diagnostics`);
    }

    await session.commitTransaction();
    console.log("✅ Transaction committed successfully");

    // Populate the response with diagnostic details
    const populatedPackage = await Package.findById(savedPackage._id)
      .populate("diagnostics", "name email phone address");

    console.log("🎉 Package created successfully:", populatedPackage._id);

    res.status(201).json({
      success: true,
      message: "Test package created successfully",
      package: populatedPackage
    });

  } catch (err) {
    console.error("❌ Error creating package:", err);
    await session.abortTransaction();
    
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  } finally {
    session.endSession();
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
    const {
      name,
      price,
      gender, // NEW: Added gender field
      doctorInfo,
      totalTestsIncluded,
      description,
      precautions,
      includedTests,
      diagnosticIds,
      diagnostics, // handle frontend key
    } = req.body;

    // Combine both (frontend might send either)
    const diagnosticList = diagnosticIds || diagnostics || [];

    // Validate gender if provided
    if (gender && !['Male', 'Female', 'Both'].includes(gender)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid gender value. Must be one of: Male, Female, Both" 
      });
    }

    // Find the package
    const existingPackage = await Package.findById(packageId);
    if (!existingPackage) {
      return res.status(404).json({ 
        success: false,
        message: "Package not found" 
      });
    }

    // Update fields - including gender
    if (name !== undefined) existingPackage.name = name;
    if (price !== undefined) existingPackage.price = price;
    if (gender !== undefined) existingPackage.gender = gender; // NEW: Update gender
    if (doctorInfo !== undefined) existingPackage.doctorInfo = doctorInfo;
    if (totalTestsIncluded !== undefined) existingPackage.totalTestsIncluded = totalTestsIncluded;
    if (description !== undefined) existingPackage.description = description;
    if (precautions !== undefined) existingPackage.precautions = precautions;
    if (includedTests !== undefined) existingPackage.includedTests = includedTests;

    // ✅ Update diagnostic relations
    if (diagnosticList.length > 0) {
      // Remove this package from all old diagnostics
      const oldDiagnosticIds = existingPackage.diagnostics || [];
      if (oldDiagnosticIds.length > 0) {
        await Diagnostic.updateMany(
          { _id: { $in: oldDiagnosticIds } },
          { $pull: { packages: existingPackage._id } }
        );
      }

      // Add this package to all new diagnostics
      await Diagnostic.updateMany(
        { _id: { $in: diagnosticList } },
        { $push: { packages: existingPackage._id } }
      );

      existingPackage.diagnostics = diagnosticList;
    } else if (diagnosticList.length === 0 && existingPackage.diagnostics?.length > 0) {
      // If empty array provided, remove from all diagnostics
      await Diagnostic.updateMany(
        { _id: { $in: existingPackage.diagnostics } },
        { $pull: { packages: existingPackage._id } }
      );
      existingPackage.diagnostics = [];
    }

    // Save updated package
    const updatedPackage = await existingPackage.save();

    // Populate diagnostic details for response
    const populatedPackage = await Package.findById(updatedPackage._id)
      .populate("diagnostics", "name email phone address");

    res.status(200).json({
      success: true,
      message: "Package updated successfully",
      package: populatedPackage,
    });
  } catch (error) {
    console.error("❌ Error updating package:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: error.message 
    });
  }
};


export const deletePackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    // 1️⃣ Find and delete the package from the Package collection
    const deletedPackage = await Package.findByIdAndDelete(packageId);

    if (!deletedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    // 2️⃣ Remove references to this package in Staff's myPackages array (Package is stored as ObjectId)
    await Staff.updateMany(
      { "myPackages.packageId": packageId },  // Searching for the ObjectId in the `myPackages` array
      { $pull: { myPackages: { packageId: packageId } } }  // Removing the specific package from the array
    );
    console.log(`Package with ID: ${packageId} removed from Staff.`);

    // 3️⃣ Remove references to this package in Diagnostic's packages array (Package is stored as ObjectId)
    await Diagnostic.updateMany(
      { "packages": packageId },  // Searching for the ObjectId in the `packages` array
      { $pull: { packages: packageId } }  // Removing the specific package from the array
    );
    console.log(`Package with ID: ${packageId} removed from Diagnostics.`);

    // 4️⃣ Send success response
    res.status(200).json({
      message: "Package deleted successfully and references removed from Staff and Diagnostics.",
      package: deletedPackage
    });

  } catch (error) {
    console.error("❌ Error deleting package:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find()
      .populate({
        path: 'diagnostics',
        select: 'name address contact email', // ✅ Jo fields chahiye woh specify karo
        options: { strictPopulate: false } // ✅ Agar koi diagnostic nahi hai toh error na de
      })
      .sort({ createdAt: -1 });

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
    const { id } = req.params;
    const {
      title,
      price,
      preparation,
      reportTime,
      diagnosticIds,
      gender
    } = req.body;

    console.log("Received data:", req.body);

    const existingXray = await Xray.findById(id);
    if (!existingXray) {
      return res.status(404).json({ success: false, message: "X-ray not found." });
    }

    // Update basic fields
    if (title !== undefined) existingXray.title = title;
    if (price !== undefined) existingXray.price = price;
     if (gender !== undefined) existingXray.gender = gender; // NEW: Update gend
    if (preparation !== undefined) existingXray.preparation = preparation;
    if (reportTime !== undefined) existingXray.reportTime = reportTime;

    // Handle diagnostics
    let diagnosticList = diagnosticIds || [];

    console.log("Processed diagnosticList:", diagnosticList);

    // Update relations if diagnosticList is valid
    if (Array.isArray(diagnosticList) && diagnosticList.length > 0) {
      // Remove old references
      await Diagnostic.updateMany(
        { scans: existingXray._id },
        { $pull: { scans: existingXray._id } }
      );

      // Add new references
      await Diagnostic.updateMany(
        { _id: { $in: diagnosticList } },
        { $addToSet: { scans: existingXray._id } }
      );

      // Update Xray document
      existingXray.diagnostics = diagnosticList;
    } else if (Array.isArray(diagnosticList) && diagnosticList.length === 0) {
      // Clear all diagnostics
      await Diagnostic.updateMany(
        { scans: existingXray._id },
        { $pull: { scans: existingXray._id } }
      );
      existingXray.diagnostics = [];
    }

    const updatedXray = await existingXray.save();

    const populatedXray = await Xray.findById(updatedXray._id)
      .populate("diagnostics", "name _id");

    console.log("Updated Xray:", populatedXray);

    res.status(200).json({
      success: true,
      message: "X-ray updated successfully",
      xray: populatedXray
    });
  } catch (error) {
    console.error("Error updating X-ray:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



export const deleteXray = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the id is provided
    if (!id) {
      return res.status(400).json({ message: "X-ray ID is required." });
    }

    // 1️⃣ Find and delete the X-ray from the Xray collection
    const deletedXray = await Xray.findByIdAndDelete(id);

    if (!deletedXray) {
      return res.status(404).json({ message: "X-ray not found." });
    }

    // 2️⃣ Remove the X-ray from all Staff's myScans array where scanId matches
    await Staff.updateMany(
      { "myScans.scanId": id }, // Looking for scanId in the `myScans` array
      { $pull: { myScans: { scanId: id } } } // Remove the entry where scanId matches
    );
    console.log(`X-ray with ID: ${id} removed from Staff's myScans.`);

    // 3️⃣ Remove the X-ray from all Diagnostic's scans array where scanId matches
    await Diagnostic.updateMany(
      { "scans": id }, // Looking for the ObjectId in the `scans` array
      { $pull: { scans: id } } // Remove the X-ray reference from the `scans` array
    );
    console.log(`X-ray with ID: ${id} removed from Diagnostics' scans.`);

    // 4️⃣ Send success response
    return res.status(200).json({
      message: "X-ray deleted successfully and references removed from Staff and Diagnostics."
    });

  } catch (err) {
    console.error("❌ Error deleting X-ray:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
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

// ✅ Create Diagnostic Center Controller
export const createDiagnostic = async (req, res) => {
  try {
    // Log incoming request body
    console.log("✅ Incoming request to create diagnostic center:", req.body);

    const {
      name, email, password, phone, address, centerType, methodology,
      pathologyAccredited, gstNumber, centerStrength,
      location, country, state, city, pincode,
      visitType, homeCollectionSlots, centerVisitSlots,
      contactPersons, tests, packages, scans, network,
      description, branches // ✅ Added branches
    } = req.body;

    console.log("✅ Diagnostic Center Details:", {
      name,
      email,
      phone,
      address,
      centerType,
      visitType,
      description,
      branchesCount: branches ? branches.length : 0
    });

    // ✅ Parse diagnostic fields or use default slots for diagnostic center
    const parsedContacts = parseJsonFieldDiagnostic(contactPersons, "contactPersons");
    const parsedTests = parseJsonFieldDiagnostic(tests, "tests");
    const parsedPackages = parseJsonFieldDiagnostic(packages, "packages");
    const parsedScans = parseJsonFieldDiagnostic(scans, "scans");
    const parsedBranches = parseJsonFieldDiagnostic(branches, "branches"); // ✅ Parse branches

    const parsedHomeSlots = homeCollectionSlots
      ? parseJsonFieldDiagnostic(homeCollectionSlots, "homeCollectionSlots")
      : generateDefaultSlotsDiagnostic();

    const parsedCenterSlots = centerVisitSlots
      ? parseJsonFieldDiagnostic(centerVisitSlots, "centerVisitSlots")
      : generateDefaultSlotsDiagnostic();

    // 📸 Handle uploaded images for diagnostic center
    const files = req.files || [];
    const diagnosticImage = files[0] ? `/uploads/diagnostic-images/${files[0].filename}` : null;
    const xrayImage = files[1] ? `/uploads/xray-images/${files[1].filename}` : null;

    // ✅ Insert Tests for Diagnostic Center
    let testIds = [];
    if (parsedTests.length > 0) {
      const insertedTests = await Test.insertMany(parsedTests);
      testIds = insertedTests.map(t => t._id);
      console.log("✅ Tests inserted:", insertedTests.length);
    }

    // ✅ Insert Packages for Diagnostic Center
    let packageIds = [];
    if (parsedPackages.length > 0) {
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
      console.log("✅ Packages inserted:", insertedPackages.length);
    }

    // ✅ Insert Scans for Diagnostic Center
    let scanIds = [];
    if (parsedScans.length > 0) {
      if (xrayImage) {
        parsedScans.forEach(scan => {
          scan.image = xrayImage;
        });
      }

      const insertedScans = await Xray.insertMany(parsedScans);
      scanIds = insertedScans.map(s => s._id);
      console.log("✅ Scans inserted:", insertedScans.length);
    }

    // 🏥 Create Diagnostic Center Document with Branches
    const diagnostic = new Diagnostic({
      name, 
      email, 
      password, 
      phone, 
      address,
      image: diagnosticImage,
      centerType, 
      methodology, 
      pathologyAccredited, 
      gstNumber,
      centerStrength, 
      location, 
      country, 
      state, 
      city, 
      pincode,
      visitType,
      homeCollectionSlots: parsedHomeSlots,
      centerVisitSlots: parsedCenterSlots,
      contactPersons: parsedContacts,
      tests: testIds,
      packages: packageIds,
      scans: scanIds,
      network,
      description,
      branches: parsedBranches, // ✅ Add branches to diagnostic
      isHeadquarter: true // ✅ Mark as headquarter
    });

    const savedDiagnostic = await diagnostic.save();

    console.log(`✅ Diagnostic Center saved with ID: ${savedDiagnostic._id}`);
    console.log(`✅ Branches saved: ${savedDiagnostic.branches.length}`);

    // Update related models with the diagnostic center ID
    await Promise.all([
      Test.updateMany({ _id: { $in: testIds } }, { diagnosticId: savedDiagnostic._id }),
      Package.updateMany({ _id: { $in: packageIds } }, { diagnosticId: savedDiagnostic._id }),
      Xray.updateMany({ _id: { $in: scanIds } }, { diagnosticId: savedDiagnostic._id }),
    ]);

    // Populate the diagnostic data
    const populatedDiagnostic = await Diagnostic.findById(savedDiagnostic._id)
      .populate("tests")
      .populate("packages")
      .populate("scans");

    console.log("✅ Diagnostic Center populated with all related data.");

    return res.status(201).json({
      message: "Diagnostic center created successfully",
      diagnostic: populatedDiagnostic,
    });

  } catch (error) {
    console.error("❌ Error creating diagnostic center:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Add new branch to diagnostic center
export const addBranch = async (req, res) => {
  try {
    const { diagnosticId, branchName, email, phone, address, country, state, city, pincode, contactPersons } = req.body;

    console.log("✅ Adding branch to diagnostic:", diagnosticId);

    if (!diagnosticId) {
      return res.status(400).json({ message: "Diagnostic ID is required" });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found" });
    }

    // Create new branch object
    const newBranch = {
      branchName,
      email,
      phone,
      address,
      country,
      state,
      city,
      pincode,
      contactPersons: contactPersons.map(person => ({
        ...person,
        _id: new mongoose.Types.ObjectId()
      }))
    };

    // Add branch to diagnostic
    diagnostic.branches.push(newBranch);
    await diagnostic.save();

    console.log("✅ Branch added successfully");

    res.status(201).json({
      message: "Branch added successfully",
      branch: newBranch,
      diagnostic
    });

  } catch (error) {
    console.error("❌ Error adding branch:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update branch
export const updateBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { branchName, email, phone, address, country, state, city, pincode, contactPersons } = req.body;

    console.log("✅ Updating branch:", branchId);

    const diagnostic = await Diagnostic.findOne({ "branches._id": branchId });
    if (!diagnostic) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Find and update the branch
    const branch = diagnostic.branches.id(branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Update branch fields
    branch.branchName = branchName || branch.branchName;
    branch.email = email || branch.email;
    branch.phone = phone || branch.phone;
    branch.address = address || branch.address;
    branch.country = country || branch.country;
    branch.state = state || branch.state;
    branch.city = city || branch.city;
    branch.pincode = pincode || branch.pincode;

    // Update contact persons
    if (contactPersons && Array.isArray(contactPersons)) {
      branch.contactPersons = contactPersons.map(person => ({
        ...person,
        _id: person._id || new mongoose.Types.ObjectId()
      }));
    }

    await diagnostic.save();

    console.log("✅ Branch updated successfully");

    res.status(200).json({
      message: "Branch updated successfully",
      branch,
      diagnostic
    });

  } catch (error) {
    console.error("❌ Error updating branch:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete branch
export const deleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    console.log("✅ Deleting branch:", branchId);

    const diagnostic = await Diagnostic.findOne({ "branches._id": branchId });
    if (!diagnostic) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Remove the branch
    diagnostic.branches = diagnostic.branches.filter(
      branch => branch._id.toString() !== branchId
    );

    await diagnostic.save();

    console.log("✅ Branch deleted successfully");

    res.status(200).json({
      message: "Branch deleted successfully",
      diagnostic
    });

  } catch (error) {
    console.error("❌ Error deleting branch:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




// Helper functions
// ✅ Parse stringified JSON fields (for diagnostics)
const parseJsonFieldDiagnostic = (field, fieldName) => {
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

const generateDefaultSlotsDiagnostic = () => {
  const slots = [];
  
  for (let i = 0; i < 7; i++) {
    const dateObj = moment().add(i, "days");
    const day = dateObj.format("dddd");
    const date = dateObj.format("YYYY-MM-DD");

    let startTime = moment(date + " 07:00", "YYYY-MM-DD HH:mm");
    const endTime = moment(date + " 21:00", "YYYY-MM-DD HH:mm"); // 9 PM

    while (startTime.isBefore(endTime)) {
      slots.push({
        day,
        date,
        timeSlot: startTime.format("HH:mm"),
        isBooked: false,
      });

      startTime.add(30, "minutes"); // 30 min gap
    }
  }

  return slots;
};



// ✅ Countdown Cron Job: Remind users daily about the upcoming diagnostic slot generation
const countdownCronJobforDiag = () => {
  setInterval(() => {
    const nextSunday = getNextSundayDiagnostic();
    const daysLeft = nextSunday.diff(moment(), 'days');
    console.log(`⏳ ${daysLeft} days left until new diagnostic center slots are generated on Sunday!`);
  }, 86400000);  // Runs every 24 hours (86400000 ms)
};

// ✅ Function to calculate next Sunday for diagnostic slot generation
const getNextSundayDiagnostic = () => {
  const today = moment();
  const daysUntilSunday = (7 - today.day()) % 7; // Calculate how many days until Sunday
  const nextSunday = today.add(daysUntilSunday, 'days').startOf('day').add(1, 'day'); // Next Sunday at 12 AM
  console.log(`✅ Next Sunday for diagnostic slots: ${nextSunday.format('YYYY-MM-DD')}`);
  return nextSunday;
};

// Call countdownCronJob to remind every day
countdownCronJobforDiag();




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


// Add multiple slots at once
export const addDiagnosticMultipleSlots = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slots } = req.body;

    if (!diagnosticId || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "diagnosticId and slots array are required"
      });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ 
        success: false,
        message: "Diagnostic center not found" 
      });
    }

    let addedCount = 0;
    let duplicateCount = 0;
    let errors = [];

    // Process each slot
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      
      if (!slot.slotType || !slot.day || !slot.date || !slot.timeSlot) {
        errors.push({
          index: i,
          error: "Missing required fields (slotType, day, date, timeSlot)"
        });
        continue;
      }

      const field = slot.slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
      
      // Check if slot already exists
      const exists = diagnostic[field].some(s => 
        s.day === slot.day && 
        s.date === slot.date && 
        s.timeSlot === slot.timeSlot
      );

      if (exists) {
        duplicateCount++;
        continue;
      }

      // Add new slot
      diagnostic[field].push({
        day: slot.day,
        date: slot.date,
        timeSlot: slot.timeSlot,
        isBooked: slot.isBooked || false,
        gender: slot.gender || "Both"
      });
      
      addedCount++;
    }

    // Save if any slots were added
    if (addedCount > 0) {
      await diagnostic.save();
    }

    return res.status(200).json({
      success: true,
      message: `Added ${addedCount} slots, ${duplicateCount} duplicates skipped`,
      summary: {
        totalSlots: slots.length,
        added: addedCount,
        duplicates: duplicateCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined,
      diagnostic
    });

  } catch (error) {
    console.error("❌ Error adding multiple slots:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};



export const updateDiagnosticSlot = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slotType, slotId, newSlot, bulkOperation, bulkData } = req.body;
    const { newDay, newDate, newTimeSlot, isBooked } = newSlot || {};

    // ==================== BULK REPLACE SLOTS ====================
    if (bulkOperation === 'replace') {
      const { startDate, endDate, startTime, endTime, timeGap } = bulkData || {};

      // Validation for bulk replace
      if (!diagnosticId || !slotType || !startDate || !endDate || !startTime || !endTime || !timeGap) {
        return res.status(400).json({
          message: "For bulk replace: diagnosticId, slotType, startDate, endDate, startTime, endTime, timeGap are required."
        });
      }

      // Find diagnostic
      const diagnostic = await Diagnostic.findById(diagnosticId);
      if (!diagnostic) {
        return res.status(404).json({ message: "Diagnostic center not found." });
      }

      const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
      
      // Generate time slots based on gap
      const generateTimeSlots = () => {
        const slots = [];
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;
        
        while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
          const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          slots.push(timeStr);
          
          currentMinute += parseInt(timeGap);
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
        }
        
        return slots;
      };

      const newTimeSlots = generateTimeSlots();
      
      if (newTimeSlots.length === 0) {
        return res.status(400).json({
          message: "No time slots generated. Please check start and end time."
        });
      }

      // Get all dates in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dateRange = [];
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        dateRange.push({ date: dateStr, day: dayOfWeek });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Keep only slots outside date range
      const existingSlots = diagnostic[field] || [];
      const slotsToKeep = existingSlots.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate < start || slotDate > end;
      });

      // Create new slots for date range
      const newSlots = [];
      dateRange.forEach(({ date, day }) => {
        newTimeSlots.forEach(timeSlot => {
          newSlots.push({
            day: day,
            date: date,
            timeSlot: timeSlot,
            type: slotType === 'home' ? 'Home Collection' : 'Center Visit',
            isBooked: false
          });
        });
      });

      // Update diagnostic with new slots
      diagnostic[field] = [...slotsToKeep, ...newSlots];
      diagnostic.markModified(field);
      
      await diagnostic.save();

      return res.status(200).json({
        message: "Bulk slots replaced successfully.",
        summary: {
          dateRange: `${startDate} to ${endDate}`,
          timeRange: `${startTime} to ${endTime}`,
          timeGap: `${timeGap} minutes`,
          datesUpdated: dateRange.length,
          slotsRemoved: existingSlots.length - slotsToKeep.length,
          slotsAdded: newSlots.length,
          totalSlotsNow: diagnostic[field].length,
          newTimePattern: newTimeSlots
        },
        diagnostic
      });
    }

    // ==================== SINGLE SLOT UPDATE ====================
    
    // Validation for single slot update
    if (!diagnosticId || !slotType || !slotId || !newSlot) {
      return res.status(400).json({
        message: "diagnosticId, slotType, slotId, and newSlot are required."
      });
    }

    // newSlot के fields check करें
    if (!newDay || !newDate || !newTimeSlot) {
      return res.status(400).json({
        message: "newDay, newDate, and newTimeSlot are required in newSlot object."
      });
    }

    // Use Mongoose's atomic operation to avoid version error
    const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
    
    // First check if diagnostic exists and slot exists
    const diagnostic = await Diagnostic.findOne({
      _id: diagnosticId,
      [`${field}._id`]: slotId
    });

    if (!diagnostic) {
      return res.status(404).json({ 
        message: "Diagnostic center not found or slot not found." 
      });
    }

    // Update using atomic operation
    const updatedDiagnostic = await Diagnostic.findOneAndUpdate(
      { 
        _id: diagnosticId,
        [`${field}._id`]: slotId 
      },
      {
        $set: {
          [`${field}.$.day`]: newDay,
          [`${field}.$.date`]: newDate,
          [`${field}.$.timeSlot`]: newTimeSlot,
          [`${field}.$.isBooked`]: isBooked !== undefined ? isBooked : false
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!updatedDiagnostic) {
      return res.status(400).json({
        message: "Failed to update slot. Please try again."
      });
    }

    return res.status(200).json({
      message: "Slot updated successfully.",
      diagnostic: updatedDiagnostic
    });

  } catch (error) {
    console.error("❌ Error updating diagnostic slot:", error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'VersionError') {
      // Try alternative approach
      try {
        const { diagnosticId, slotType, slotId, newSlot, bulkOperation, bulkData } = req.body;
        
        // Handle bulk operation retry
        if (bulkOperation === 'replace') {
          const { startDate, endDate, startTime, endTime, timeGap } = bulkData || {};
          const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
          
          const diagnostic = await Diagnostic.findById(diagnosticId);
          if (!diagnostic) {
            return res.status(404).json({ message: "Diagnostic center not found." });
          }
          
          // Simply try to save again
          await diagnostic.save();
          
          const updatedDiagnostic = await Diagnostic.findById(diagnosticId);
          return res.status(200).json({
            message: "Bulk slots replaced successfully (after retry).",
            diagnostic: updatedDiagnostic
          });
        }
        
        // Handle single slot retry
        const { newDay, newDate, newTimeSlot, isBooked } = newSlot || {};
        const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
        
        // Use updateOne directly
        const result = await Diagnostic.updateOne(
          { 
            _id: diagnosticId,
            [`${field}._id`]: slotId 
          },
          {
            $set: {
              [`${field}.$.day`]: newDay,
              [`${field}.$.date`]: newDate,
              [`${field}.$.timeSlot`]: newTimeSlot,
              [`${field}.$.isBooked`]: isBooked !== undefined ? isBooked : false
            }
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({
            message: "Failed to update slot after retry."
          });
        }

        // Fetch updated diagnostic
        const updatedDiagnostic = await Diagnostic.findById(diagnosticId);
        
        return res.status(200).json({
          message: "Slot updated successfully (after retry).",
          diagnostic: updatedDiagnostic
        });
      } catch (retryError) {
        return res.status(500).json({
          message: "Failed after retry",
          error: retryError.message
        });
      }
    }
    
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

export const deleteDiagnosticSlot = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { slotType, day, date, timeSlot } = req.body;

    // Validate input
    if (!slotType || !day || !date || !timeSlot) {
      return res.status(400).json({ 
        message: "Missing required fields." 
      });
    }

    if (!['home', 'center'].includes(slotType)) {
      return res.status(400).json({ 
        message: "Invalid slotType." 
      });
    }

    const field = slotType === 'home' ? 'homeCollectionSlots' : 'centerVisitSlots';
    
    // Use findOneAndUpdate to handle the operation atomically
    const result = await Diagnostic.findOneAndUpdate(
      { 
        _id: diagnosticId,
        [field]: { 
          $elemMatch: { 
            day: day, 
            date: date, 
            timeSlot: timeSlot 
          } 
        }
      },
      {
        $pull: {
          [field]: { 
            day: day, 
            date: date, 
            timeSlot: timeSlot 
          }
        }
      },
      {
        new: true, // Return the updated document
        runValidators: true
      }
    );

    if (!result) {
      return res.status(404).json({ 
        message: "Diagnostic center not found or no matching slot exists.",
        diagnosticId,
        slotDetails: { day, date, timeSlot }
      });
    }

    return res.status(200).json({
      message: "Slot deleted successfully.",
      diagnostic: result
    });

  } catch (error) {
    console.error("❌ Error deleting diagnostic slot:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid ID format." 
      });
    }
    
    return res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    // NO FILTERING - सभी slots return करें
    const diagnosticData = {
      ...diagnostic.toObject(),
      // Original slots ही return करें
      homeCollectionSlots: diagnostic.homeCollectionSlots || [],
      centerVisitSlots: diagnostic.centerVisitSlots || []
    };

    return res.status(200).json({
      message: "Diagnostic fetched successfully with ALL slots",
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
      const { hraName, prescribed, gender } = req.body;

      if (!hraName) {
        return res.status(400).json({ message: 'HRA name is required' });
      }

      // Add validation for gender if necessary, for example:
      const validGenders = ['male', 'female', 'other', 'both'];
      if (gender && !validGenders.includes(gender.toLowerCase())) {
        return res.status(400).json({ message: 'Invalid gender. Valid options are: male, female, other.' });
      }

      const hraImage = req.file ? `/uploads/category-images/${req.file.filename}` : null;

      const newHra = new Hra({
        hraName,
        hraImage,
        prescribed: prescribed || '', // set to empty string if not provided
        gender: gender || '', // set gender to empty string if not provided
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
      const { hraName, prescribed, gender } = req.body;  // Added gender field

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

      // Update gender if provided
      if (gender) hra.gender = gender;  // Update the gender field

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
      }).select('hraCategoryId hraCategoryName gender question options');

      if (!hraQuestions.length) {
        return res.status(404).json({
          message: 'No HRA questions found for the given category',
        });
      }

      // Include the gender of the category in each question response
      hraQuestions = hraQuestions.map((question) => ({
        ...question.toObject(),
        gender: hraCategory.gender,  // Add the category gender to each question
      }));
    } else {
      // Fetch all HRA questions without category filtering
      hraQuestions = await HraQuestion.find().select('hraCategoryId hraCategoryName question options');

      if (!hraQuestions.length) {
        return res.status(404).json({
          message: 'No HRA questions found',
        });
      }

      // Fetch all categories to add gender info
      const categories = await Hra.find().select('hraName gender');
      const categoryMap = categories.reduce((acc, category) => {
        acc[category.hraName.toLowerCase()] = category.gender;
        return acc;
      }, {});

      // Map each question with the gender of the category
      hraQuestions = hraQuestions.map((question) => {
        const categoryGender = categoryMap[question.hraCategoryName.toLowerCase()];
        return {
          ...question.toObject(),
          gender: categoryGender || 'Unknown',  // Add gender based on the category
        };
      });
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


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
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



    // 📧 Send Confirmation Email
    const mailOptions = {
      from: `"Credent Health" <${process.env.EMAIL}>`,
      to: staff.email,
      subject: "Doctor Consultation Booking Confirmed",
      html: `
        <h2>Doctor Consultation Confirmed</h2>
        <p>Hello ${staff.name},</p>
        <p>Your doctor consultation has been successfully booked.</p>
        <p><strong>Booking ID:</strong> ${formattedBookingId}</p>
        <p><strong>Doctor:</strong> ${doctor.name}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time Slot:</strong> ${timeSlot}</p>
        <p><strong>Type:</strong> ${type}</p>
        ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
        <p><strong>Paid Amount:</strong> ₹${consultationFee}</p>
        <br>
        <p>Thank you,<br>Team CredentHealth</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent to:", staff.email);
    } catch (err) {
      console.error("❌ Email sending failed:", err);
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



    // Send email like Doctor Booking
    const mailOptions = {
      from: `"Credent Health" <${process.env.EMAIL}>`,
      to: staff.email,
      subject: "Package Booking Confirmed",
      html: `
        <h2>Package Booking Confirmed</h2>
        <p>Hello ${staff.name},</p>
        <p>Your package booking has been successfully confirmed.</p>
        <p><strong>Booking ID:</strong> ${diagnosticBookingId}</p>
        <p><strong>Package:</strong> ${packageData.name}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
        <p><strong>Time Slot:</strong> ${timeSlot}</p>
        <p><strong>Service Type:</strong> ${serviceType}</p>
        <p><strong>Paid Amount:</strong> ₹${payableAmount}</p>
        <br>
        <p>Thank you,<br>Team CredentHealth</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent to:", staff.email);
    } catch (err) {
      console.error("❌ Email sending failed:", err);
    }

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


export const getAllStaffMedicalUploads = async (req, res) => {
  try {
    // Find only staff who have at least one uploaded file
    const staffList = await Staff.find({
      userUploadedFiles: { $exists: true, $ne: [] }
    });

    const response = staffList.map(staff => ({
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      uploadedFiles: staff.userUploadedFiles
    }));

    res.status(200).json({
      message: 'Staff with uploaded medical files fetched successfully',
      data: response
    });
  } catch (error) {
    console.error('Error fetching staff uploads:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const createEmployee = async (req, res) => {
  const {
    name,
    email,
    password,
    mobile,
    location, // "location" will map to "address" in DB
    gender,
    designation,
    department,
    employeeId,
    pagesAccess,
    grade
  } = req.body;

  try {
    const newEmployee = new Employee({
      name,
      email,
      password,
      mobile,
      address: location, // Mapping location from frontend to address in the DB
      gender,
      designation,
      department,
      employeeId,
      pagesAccess,
      grade,
      role: 'employee' // Default role set to "Employee"
    });

    // Save the employee to the database
    await newEmployee.save();
    res.status(201).json({
      message: 'Employee created successfully',
      employee: newEmployee
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }
};

// Fetch all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({ employees });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};



export const loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find employee by email
    const employee = await Employee.findOne({ email });

    if (!employee) {
      return res.status(400).json({ message: 'Employee not found' });
    }

    // Check if the password matches directly (without bcrypt)
    if (password !== employee.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Return full employee data including pagesAccess
    return res.status(200).json({
      message: 'Login successful',
      employee: employee, // Return the entire employee object
      role: employee.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update Employee
export const updateEmployee = async (req, res) => {
  const {
    name,
    email,
    mobile,
    location,  // location to address mapping
    gender,
    designation,
    department,
    employeeId: newEmployeeId, // Rename to avoid conflict
    pagesAccess,
    grade
  } = req.body;

  const { id } = req.params; // Get employee ID from params

  try {
    // Find the employee by ID and update their details
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,  // Use id from params
      {
        name,
        email,
        mobile,
        address: location, // Mapping location to address
        gender,
        designation,
        department,
        employeeId: newEmployeeId, // Use the renamed employeeId (newEmployeeId)
        pagesAccess,
        grade
      },
      { new: true }  // Return the updated document
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
};



// Delete Employee
export const deleteEmployee = async (req, res) => {
  const id = req.params.id; // Get employee ID from params

  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json({
      message: 'Employee deleted successfully',
      employee: deletedEmployee
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};




// Controller to upload banner images (single or multiple)
export const uploadBannerController = (req, res) => {
  // We will check if the request has multiple files or just a single one.
  uploadBannerImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: `Error uploading banner images: ${err.message}` });
    }

    // If no files are uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No banner images uploaded' });
    }

    try {
      // Create an array of image URLs to save in the database
      const imageUrls = req.files.map(file =>
        path.join('uploads', 'banner-images', file.filename)  // Constructing the image URL
      );

      // Save the banner images to the database (Banner collection)
      const newBanner = new Banner({
        imageUrls: imageUrls,  // Save all image URLs in an array
      });

      await newBanner.save();  // Save the banner with image URLs

      return res.status(200).json({
        message: `${req.files.length > 1 ? 'Multiple' : 'Single'} banner image(s) uploaded and saved successfully`,
        imageUrls, // Return the array of image URLs
      });

    } catch (err) {
      console.error('Error saving banner image(s):', err);
      return res.status(500).json({
        message: 'Error saving banner image(s) to database',
        error: err.message,
      });
    }
  });
};


export const getAllBannerImagesController = async (req, res) => {
  try {
    // Fetch all banners from the database
    const banners = await Banner.find();

    // If no banners exist
    if (banners.length === 0) {
      return res.status(404).json({ message: 'No banner images found' });
    }

    // Extract the image URLs and IDs for all the banners
    const imageUrlsWithId = banners.map(banner => ({
      _id: banner._id,  // Include the banner ID in the response
      imageUrls: banner.imageUrls.map(imageUrl => imageUrl.replace(/\\/g, '/')), // Fix backslashes in image URLs
    }));

    return res.status(200).json({
      message: 'Banner images fetched successfully',
      imageUrls: imageUrlsWithId,  // Return both IDs and array of image URLs
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching banner images', error: err.message });
  }
};



export const deleteBannerImageController = async (req, res) => {
  const { bannerId } = req.params; // Get the banner ID from the URL parameter

  try {
    // Find the banner by its ID
    const banner = await Banner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Delete the banner from the database
    await Banner.findByIdAndDelete(bannerId);

    return res.status(200).json({
      message: 'Banner deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting banner:', err);
    return res.status(500).json({
      message: 'Error deleting banner',
      error: err.message,
    });
  }
};

// Controller to update a banner image
export const updateBannerImageController = async (req, res) => {
  const { bannerId } = req.params;
  const { imageUrl } = req.body; // If you're only updating the image URL

  try {
    // Find the banner by its ID
    const banner = await Banner.findById(bannerId);

    if (!banner) {
      return res.status(404).json({ message: 'Banner image not found' });
    }

    // Optionally, you can delete the previous image if needed
    const oldImagePath = path.join(__dirname, '..', banner.imageUrl);
    fs.unlink(oldImagePath, (err) => {
      if (err) {
        console.error('Error deleting old image file:', err);
      }
    });

    // Update the banner image URL in the database
    banner.imageUrl = imageUrl; // Update with new image URL

    await banner.save(); // Save the updated banner

    return res.status(200).json({
      message: 'Banner image updated successfully',
      banner,
    });
  } catch (err) {
    console.error('Error updating banner image:', err);
    return res.status(500).json({
      message: 'Error updating banner image',
      error: err.message,
    });
  }
};



export const getAllHraSubmissions = async (req, res) => {
  try {
    // 🔹 Fetch all submissions and populate staff info & question details
    const submissions = await HraSubmission.find()
      .populate({
        path: "staffId",
        select: "name email phone department branch age gender contact_number employeeId",
      })
      .populate({
        path: "answers.questionId",
        select: "question hraCategoryName options",
      })
      .sort({ submittedAt: -1 });

    // 🔹 Pre-fetch all companies to map staffId -> companyName
    const companies = await Company.find({}, { name: 1, staff: 1 });

    const staffIdToCompanyName = {};
    companies.forEach((company) => {
      company.staff.forEach((staffObj) => {
        staffIdToCompanyName[staffObj._id.toString()] = company.name;
      });
    });

    // 🔹 Format clean JSON response
    const formattedSubmissions = submissions.map((sub) => {
      const staff = sub.staffId;
      const companyName = staff ? staffIdToCompanyName[staff._id.toString()] || "" : "";

      return {
        submissionId: sub._id,
        submittedAt: sub.submittedAt,
        staff: staff
          ? {
              _id: staff._id,
              name: staff.name,
              email: staff.email,
              employeeId: staff.employeeId, 
              phone: staff.phone,
              department: staff.department || "",
              branch: staff.branch || "",
              age: staff.age || null,
              gender: staff.gender || "",
              mobile: staff.contact_number || "",
              company: companyName, // ✅ Fixed: now company shows correctly
            }
          : null,
        totalPoints: sub.totalPoints,
        riskLevel: sub.riskLevel,
        riskMessage: sub.riskMessage,
        categoryPoints: Object.fromEntries(sub.categoryPoints || []),
        prescribedForCategories: Object.fromEntries(sub.prescribedForCategories || []),
        answers: sub.answers.map((ans) => {
          const q = ans.questionId;
          const selectedOption = q?.options?.find(
            (opt) => opt._id.toString() === ans.selectedOption.toString()
          );

          return {
            questionId: q?._id || null,
            questionText: q?.question || "",
            category: q?.hraCategoryName || ans.hraCategoryName || "",
            selectedOption: selectedOption
              ? {
                  _id: selectedOption._id,
                  text: selectedOption.text || "",
                  point: selectedOption.point || 0,
                }
              : null,
            scoredPoints: ans.points,
          };
        }),
      };
    });

    // ✅ Send response
    return res.status(200).json({
      success: true,
      count: formattedSubmissions.length,
      data: formattedSubmissions,
    });
  } catch (error) {
    console.error("❌ Error fetching HRA submissions:", error);
    return res.status(500).json({
      success: false,
      message: "💥 Failed to fetch HRA submissions.",
      error: error.message,
    });
  }
};




// Create a new question
export const createQuestion = async (req, res) => {
  try {
    const { question } = req.body;  // Expecting a single question

    if (!question) {
      return res.status(400).json({ message: 'Please provide a question.' });
    }

    // Create a new question
    const newQuestion = new SimpleQuestion({
      question,  // Store the question text
    });

    // Save the question in the database
    const savedQuestion = await newQuestion.save();

    return res.status(201).json({
      message: 'Question created successfully',
      data: savedQuestion,
    });
  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Edit an existing question
export const editQuestion = async (req, res) => {
  try {
    const { questionId } = req.params; // Extract questionId from params
    const { question } = req.body;    // Extract new question text from body

    if (!question) {
      return res.status(400).json({ message: 'Please provide a question to update.' });
    }

    // Find the question by its ID and update it
    const updatedQuestion = await SimpleQuestion.findByIdAndUpdate(
      questionId,
      { question }, // Update only the question field
      { new: true } // Return the updated document
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    return res.status(200).json({
      message: 'Question updated successfully',
      data: updatedQuestion,
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Delete a question
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;  // Extract questionId from params

    // Find and delete the question by its ID
    const deletedQuestion = await SimpleQuestion.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    return res.status(200).json({
      message: 'Question deleted successfully',
      data: deletedQuestion,
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Get all questions
export const getAllQuestions = async (req, res) => {
  try {
    const questions = await SimpleQuestion.find();

    if (questions.length === 0) {
      return res.status(404).json({ message: 'No questions found.' });
    }

    return res.status(200).json({
      message: 'Questions retrieved successfully',
      data: questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Get all questions with their answers
export const getAllAnswersQuestions = async (req, res) => {
  try {
    // Fetch all questions, including the submitted answers
    const questions = await SimpleQuestion.find().populate('submittedAnswers.userId', 'name email'); // Populate the user data with name and email

    // Check if there are any questions
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No questions found.' });
    }

    return res.status(200).json({
      message: 'Questions fetched successfully',
      data: questions,  // Return all questions with answers
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Create new test
export const createTestt = async (req, res) => {
  try {
    const {
      name,
      price,
      gender, // NEW: Added gender
      description,
      instruction,
      fastingRequired,
      homeCollectionAvailable,
      reportIn24Hrs,
      reportHour,
      category,
      precaution,
      diagnosticIds
    } = req.body;

    // Validate gender
    if (!gender || !['Male', 'Female', 'Both'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Gender is required and must be Male, Female, or Both"
      });
    }

    // Create new test with gender
    const newTest = new Test({
      name,
      price,
      gender, // NEW: Include gender
      description,
      instruction,
      fastingRequired: fastingRequired || false,
      homeCollectionAvailable: homeCollectionAvailable || false,
      reportIn24Hrs: reportIn24Hrs || false,
      reportHour,
      category: category || 'General',
      precaution
    });

    const savedTest = await newTest.save();

    // Link test to diagnostics
    if (diagnosticIds && diagnosticIds.length > 0) {
      await Diagnostic.updateMany(
        { _id: { $in: diagnosticIds } },
        { $push: { tests: savedTest._id } }
      );
      
      // Update test diagnostics array
      savedTest.diagnostics = diagnosticIds;
      await savedTest.save();
    }

    res.status(201).json({
      success: true,
      message: 'Test created successfully',
      test: savedTest
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test',
      error: error.message
    });
  }
};

// Create new scan - FIXED VERSION
export const createScann = async (req, res) => {
  try {
    const {
      title,
      price,
      preparation,
      reportTime,
      category,
      diagnosticIds,
      gender
    } = req.body;

    console.log("Received diagnosticIds:", diagnosticIds);
    console.log("Type of diagnosticIds:", typeof diagnosticIds);

    // Handle image upload
    let image = '';
    if (req.file) {
      image = `/uploads/scans/${req.file.filename}`;
    }

    const newScan = new Xray({
      title,
      price,
      preparation,
      reportTime,
      category,
      image,
      gender
    });

    const savedScan = await newScan.save();

    // Parse diagnosticIds from JSON string to array
    let parsedDiagnosticIds = [];
    try {
      if (diagnosticIds) {
        if (typeof diagnosticIds === 'string') {
          parsedDiagnosticIds = JSON.parse(diagnosticIds);
        } else if (Array.isArray(diagnosticIds)) {
          parsedDiagnosticIds = diagnosticIds;
        }
      }
    } catch (parseError) {
      console.error("Error parsing diagnosticIds:", parseError);
      // Continue without linking if parsing fails
    }

    console.log("Parsed diagnosticIds:", parsedDiagnosticIds);

    // Link scan to diagnostics
    if (parsedDiagnosticIds && parsedDiagnosticIds.length > 0) {
      await Diagnostic.updateMany(
        { _id: { $in: parsedDiagnosticIds } },
        { $push: { scans: savedScan._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Scan created successfully',
      scan: savedScan
    });
  } catch (error) {
    console.error('Create scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scan',
      error: error.message
    });
  }
};



export const updateStaffBranches = async (req, res) => {
  try {
    const { staffIds, companyId, branch } = req.body;

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({ message: "staffIds must be a non-empty array" });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid company ID" });
    }

    // ✅ Validate all staffIds
    const invalidIds = staffIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: "Invalid staff IDs", invalidIds });
    }

    // 1️⃣ Update all staff documents
    const updateResult = await Staff.updateMany(
      { _id: { $in: staffIds } },
      { branch: branch || null }
    );

    // 2️⃣ Update branch inside company.staff array
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.staff = company.staff.map((s) => {
      if (staffIds.includes(s._id.toString())) {
        return { ...s.toObject(), branch: branch || null };
      }
      return s;
    });

    await company.save();

    res.status(200).json({
      message: "Branches updated successfully for all selected staff",
      updatedCount: updateResult.modifiedCount,
      companyStaff: company.staff,
    });
  } catch (error) {
    console.error("❌ Error updating staff branches:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const getCompanyStaff = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate({
        path: 'staff._id',   // populate _id inside staff[]
        model: 'Staff'
      });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Extract only populated Staff model data
    const fullStaffDetails = company.staff.map((s) => s._id); 

    res.status(200).json({
      message: 'Company staff fetched successfully',
      staff: fullStaffDetails
    });

  } catch (error) {
    console.error('Error fetching company staff:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};



export const bulkUpdateEmployeeId = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csvParser({
        mapHeaders: ({ header }) => header.trim(),
      }))
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const updateResults = [];

        for (const row of results) {
          // Extract all possible fields from CSV
          const name = (row.name || "").trim();
          const employeeId = (row.employeeId || row.employeeid || "").trim();
          const email = (row.email || "").trim();
          const contact_number = (row.contact_number || row.contact || row.phone || row.mobile || "").trim();
          const department = (row.department || "").trim();
          const role = (row.role || row.designation || "").trim();
          const gender = (row.gender || "").trim();
          
          // Date parsing
          let dob = null;
          const dobStr = (row.dob || row.dateOfBirth || row.birthdate || row.birthDate || "").trim();
          
          if (dobStr) {
            dob = parseAnyDate(dobStr);
            if (dob) {
              console.log(`✅ Parsed DOB for ${name}: ${dobStr} → ${dob.toISOString()}`);
            } else {
              console.log(`❌ Could not parse DOB for ${name}: ${dobStr}`);
            }
          }
          
          const address = (row.address || "").trim();
          const age = parseNumber(row.age);
          const height = parseNumber(row.height);
          const weight = parseNumber(row.weight);
          const BP = (row.BP || row.blood_pressure || row.bloodPressure || "").trim();
          const BMI = parseNumber(row.BMI);
          const eyeSight = (row.eyeSight || row.eyesight || row.eye_sight || "").trim();

          // Validate name is required
          if (!name) {
            updateResults.push({ 
              name: name || null, 
              employeeId: employeeId || null, 
              status: "Skipped: Name is required" 
            });
            continue;
          }

          // Build update object with only non-empty values
          const updateFields = {};
          if (employeeId) updateFields.employeeId = employeeId;
          if (email) updateFields.email = email;
          if (contact_number) updateFields.contact_number = contact_number;
          if (department) updateFields.department = department;
          if (role) updateFields.role = role;
          if (gender) updateFields.gender = gender;
          if (dob) updateFields.dob = dob;
          if (address) updateFields.address = address;
          if (age !== null && !isNaN(age)) updateFields.age = age;
          if (height !== null && !isNaN(height)) updateFields.height = height;
          if (weight !== null && !isNaN(weight)) updateFields.weight = weight;
          if (BP) updateFields.BP = BP;
          if (BMI !== null && !isNaN(BMI)) updateFields.BMI = BMI;
          if (eyeSight) updateFields.eyeSight = eyeSight;

          // Check if we have any fields to update
          if (Object.keys(updateFields).length === 0) {
            updateResults.push({ 
              name, 
              employeeId: employeeId || null, 
              status: "Skipped: No valid fields to update" 
            });
            continue;
          }

          try {
            // 1. Pehle Staff collection mein update karo
            const staff = await Staff.findOne({ name: new RegExp(`^${name}$`, "i") });

            if (staff) {
              console.log(`📝 Updating staff ${name} in Staff collection with fields:`, updateFields);
              
              // Update staff document
              Object.assign(staff, updateFields);
              await staff.save();

              console.log(`✅ Successfully updated staff ${name} in Staff collection`);

              // 2. Ab Company find karo jisme yeh staff hai
              // Company schema mein staff array hai, usme find karo
              const companies = await Company.find({
                "staff.name": new RegExp(`^${name}$`, "i")
              });

              if (companies.length > 0) {
                console.log(`Found staff ${name} in ${companies.length} companies`);
                
                for (const company of companies) {
                  // Find the staff in company's staff array
                  const staffIndex = company.staff.findIndex(s => 
                    s && s.name && s.name.toLowerCase() === name.toLowerCase()
                  );
                  
                  if (staffIndex !== -1) {
                    // Update fields in company's staff array
                    const staffInCompany = company.staff[staffIndex];
                    
                    // Update only fields that exist in updateFields
                    if (employeeId) staffInCompany.employeeId = employeeId;
                    if (dob) staffInCompany.dob = dob;
                    if (email) staffInCompany.email = email;
                    if (contact_number) staffInCompany.contact_number = contact_number;
                    if (department) staffInCompany.department = department;
                    if (role) staffInCompany.role = role;
                    if (gender) staffInCompany.gender = gender;
                    if (address) staffInCompany.address = address;
                    if (age !== null && !isNaN(age)) staffInCompany.age = age;
                    if (height !== null && !isNaN(height)) staffInCompany.height = height;
                    if (weight !== null && !isNaN(weight)) staffInCompany.weight = weight;
                    if (BP) staffInCompany.BP = BP;
                    if (BMI !== null && !isNaN(BMI)) staffInCompany.BMI = BMI;
                    if (eyeSight) staffInCompany.eyeSight = eyeSight;
                    
                    // Mark the array as modified
                    company.markModified('staff');
                    
                    await company.save();
                    console.log(`✅ Updated staff ${name} in company: ${company.name}`);
                  }
                }
              } else {
                console.log(`⚠️ Staff ${name} not found in any company's staff array`);
              }

              updateResults.push({ 
                name, 
                employeeId: employeeId || staff.employeeId, 
                fieldsUpdated: Object.keys(updateFields),
                status: "Updated successfully" 
              });
            } else {
              updateResults.push({ 
                name, 
                employeeId: employeeId || null, 
                status: "Staff Not Found in Staff collection" 
              });
            }
          } catch (error) {
            console.error(`❌ Error updating staff ${name}:`, error);
            updateResults.push({ 
              name, 
              employeeId: employeeId || null, 
              status: `Error: ${error.message}` 
            });
          }
        }

        // Clean up uploaded file
        try { 
          fs.unlinkSync(req.file.path); 
        } catch (e) {
          console.warn("Failed to delete uploaded CSV file:", e.message);
        }

        return res.status(200).json({
          message: "Bulk staff update completed",
          totalRecords: results.length,
          results: updateResults,
        });
      })
      .on("error", (error) => {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(400).json({ 
          message: "Error processing CSV file", 
          error: error.message 
        });
      });

  } catch (error) {
    console.error("❌ Bulk staff upload error:", error);
    return res.status(500).json({
      message: "Server error during bulk staff upload",
      error: error.message,
    });
  }
};

// Universal date parser function
function parseAnyDate(dateStr) {
  if (!dateStr) return null;
  
  dateStr = dateStr.toString().trim();
  
  // Try common formats
  const formats = [
    // DD-MM-YYYY
    () => {
      const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    },
    // MM-DD-YYYY
    () => {
      const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (match) {
        const month = parseInt(match[1], 10) - 1;
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    },
    // YYYY-MM-DD
    () => {
      const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    },
    // DD/MM/YYYY
    () => {
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    },
    // MM/DD/YYYY
    () => {
      const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const month = parseInt(match[1], 10) - 1;
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    },
    // Direct Date parsing
    () => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) ? date : null;
    }
  ];
  
  for (const format of formats) {
    const date = format();
    if (date) return date;
  }
  
  console.log(`⚠️ Could not parse date: ${dateStr}`);
  return null;
}

// Helper function to parse numbers
function parseNumber(value) {
  if (!value && value !== 0) return null;
  
  const str = value.toString().trim();
  if (str === '') return null;
  
  const cleaned = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
// Remove package from staff
export const removePackageFromStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { packageId } = req.body;

        // Validate input
        if (!packageId || !staffId) {
            return res.status(400).json({
                success: false,
                message: "Package ID and Staff ID are required"
            });
        }

        // Find staff
        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff not found"
            });
        }

        // // Find package - variable name change from 'package' to 'pkgData'
        // const pkgData = await Package.findById(packageId);
        // if (!pkgData) {
        //     return res.status(404).json({
        //         success: false,
        //         message: "Package not found"
        //     });
        // }

        // Check if package is assigned to staff
        const isPackageAssigned = staff.myPackages.some(pkg => 
            pkg._id.toString() === packageId || 
            pkg.packageId?.toString() === packageId
        );

        if (!isPackageAssigned) {
            return res.status(400).json({
                success: false,
                message: "Package is not assigned to this staff"
            });
        }

        // Remove package from staff's myPackages array
        staff.myPackages = staff.myPackages.filter(pkg => 
            pkg._id.toString() !== packageId && 
            pkg.packageId?.toString() !== packageId
        );

        // Save updated staff
        await staff.save();

        res.status(200).json({
            success: true,
            message: "Package removed from staff successfully",
            data: staff
        });

    } catch (error) {
        console.error("Error removing package from staff:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Remove test from staff
export const removeTestFromStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { testId } = req.body;

        // Validate input
        if (!testId || !staffId) {
            return res.status(400).json({
                success: false,
                message: "Test ID and Staff ID are required"
            });
        }

        // Find staff
        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff not found"
            });
        }

        // Check if test is assigned to staff
        const isTestAssigned = staff.myTests.some(t => 
            t._id.toString() === testId || 
            t.testId?.toString() === testId
        );

        if (!isTestAssigned) {
            return res.status(400).json({
                success: false,
                message: "Test is not assigned to this staff"
            });
        }

        // Remove test from staff's myTests array
        staff.myTests = staff.myTests.filter(t => 
            t._id.toString() !== testId && 
            t.testId?.toString() !== testId
        );

        // Save updated staff
        await staff.save();

        res.status(200).json({
            success: true,
            message: "Test removed from staff successfully",
            data: staff
        });

    } catch (error) {
        console.error("Error removing test from staff:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Remove scan from staff
export const removeScanFromStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { scanId } = req.body;

        // Validate input
        if (!scanId || !staffId) {
            return res.status(400).json({
                success: false,
                message: "Scan ID and Staff ID are required"
            });
        }

        // Find staff
        const staff = await Staff.findById(staffId);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff not found"
            });
        }

        // Check if scan is assigned to staff
        const isScanAssigned = staff.myScans.some(s => 
            s._id.toString() === scanId || 
            s.scanId?.toString() === scanId
        );

        if (!isScanAssigned) {
            return res.status(400).json({
                success: false,
                message: "Scan is not assigned to this staff"
            });
        }

        // Remove scan from staff's myScans array
        staff.myScans = staff.myScans.filter(s => 
            s._id.toString() !== scanId && 
            s.scanId?.toString() !== scanId
        );

        // Save updated staff
        await staff.save();

        res.status(200).json({
            success: true,
            message: "Scan removed from staff successfully",
            data: staff
        });

    } catch (error) {
        console.error("Error removing scan from staff:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};



export const getAllCompanyDiagnostics = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        message: "companyId is required"
      });
    }

    // STEP 1: Find Company
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        data: []
      });
    }

    // Total diagnostics assigned to this company
    const companyDiagnosticsCount = company.diagnostics.length;

    // STEP 2: Extract diagnosticIds from company.diagnostics (mixed structure handled)
    const diagnosticIds = company.diagnostics.map(d => {
      // Case 1: Direct ObjectId or string
      if (typeof d === "string" || (d && d._bsontype === "ObjectID")) {
        return d;
      }

      // Case 2: Object -> { diagnosticId, diagnosticName, ... }
      return d.diagnosticId;
    });

    if (diagnosticIds.length === 0) {
      return res.status(200).json({
        message: "No diagnostics assigned to this company",
        data: [],
        count: 0,
        companyDiagnosticsCount,
        companyName: company.companyName
      });
    }

    console.log("Diagnostic IDs:", diagnosticIds);

    // STEP 3: Fetch only company's diagnostics
    let diagnostics = await Diagnostic.find({ _id: { $in: diagnosticIds } })
      .populate("tests")
      .populate("packages")
      .populate("scans");

    // STEP 4: Filter future slots
    const now = moment();

    const filterFutureSlots = (slots) => {
      return (slots || []).filter(slot => {
        const slotDateTime = moment(
          `${slot.date} ${slot.timeSlot}`,
          ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'YYYY-MM-DD h:mm A']
        );
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    const filteredDiagnostics = diagnostics.map(doc => {
      const dObj = doc.toObject();
      return {
        ...dObj,
        homeCollectionSlots: filterFutureSlots(dObj.homeCollectionSlots),
        centerVisitSlots: filterFutureSlots(dObj.centerVisitSlots),
      };
    });

    // STEP 5: Return Response
    return res.status(200).json({
      message: "Company diagnostics fetched successfully",
      data: filteredDiagnostics,
      count: filteredDiagnostics.length,
      companyDiagnosticsCount, // <-- new field added
      companyInfo: {
        companyId,
        companyName: company.companyName,
        email: company.email
      }
    });

  } catch (error) {
    console.error("❌ Error fetching company diagnostics:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};



export const getAllCompanyDiagnosticsByUser = async (req, res) => {
  try {
    const { companyId, staffId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        message: "companyId is required"
      });
    }

    if (!staffId) {
      return res.status(400).json({
        message: "staffId is required"
      });
    }

    // STEP 1: Find Company
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        data: []
      });
    }

    // STEP 2: Staff details fetch karein
    const staff = await Staff.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        data: []
      });
    }

    const staffGender = staff.gender; // Male, Female, or Other

    console.log(`👤 Staff Gender: ${staffGender}`);

    // STEP 3: Staff ka cart fetch karein
    const cart = await Cart.findOne({ userId: staffId });
    let cartItemIds = [];

    if (cart && cart.items.length > 0) {
      cartItemIds = cart.items
        .filter(item => item && item.itemId)
        .map(item => item.itemId.toString());
    }

    console.log("📦 Staff Cart Item IDs:", cartItemIds);

    // Total diagnostics assigned to this company
    const companyDiagnosticsCount = company.diagnostics.length;

    // STEP 4: Extract diagnosticIds from company.diagnostics
    const diagnosticIds = company.diagnostics.map(d => {
      if (typeof d === "string" || (d && d._bsontype === "ObjectID")) {
        return d;
      }
      return d.diagnosticId;
    });

    if (diagnosticIds.length === 0) {
      return res.status(200).json({
        message: "No diagnostics assigned to this company",
        data: [],
        count: 0,
        companyDiagnosticsCount,
        companyName: company.companyName
      });
    }

    // STEP 5: Fetch company's diagnostics
    let diagnostics = await Diagnostic.find({ _id: { $in: diagnosticIds } })
      .populate("tests")
      .populate("packages")
      .populate("scans");

    // STEP 6: Gender-based filtering for tests and scans (WITH "Both" support)
    const diagnosticsWithGenderFilter = diagnostics.map(diagnostic => {
      const diagnosticObj = diagnostic.toObject();
      
      // Filter tests based on gender (with Both support)
      const filteredTests = diagnosticObj.tests.filter(test => {
        // Agar test ka gender defined nahi hai to show karo
        if (!test.gender) return true;
        
        // Agar staff gender "Other" hai to sab dikhao
        if (staffGender === 'Other') return true;
        
        // Gender match logic (case-insensitive)
        const testGender = test.gender.toLowerCase();
        const userGender = staffGender.toLowerCase();
        
        // Show if:
        // 1. test.gender === 'unisex' (sabke liye)
        // 2. test.gender === 'both' (Male aur Female dono ke liye)
        // 3. test.gender === userGender (exact match)
        return testGender === 'unisex' || 
               testGender === 'both' || 
               testGender === userGender;
      });

      // Filter scans based on gender (with Both support)
      const filteredScans = diagnosticObj.scans.filter(scan => {
        // Agar scan ka gender defined nahi hai to show karo
        if (!scan.gender) return true;
        
        // Agar staff gender "Other" hai to sab dikhao
        if (staffGender === 'Other') return true;
        
        // Gender match logic (case-insensitive)
        const scanGender = scan.gender.toLowerCase();
        const userGender = staffGender.toLowerCase();
        
        return scanGender === 'unisex' || 
               scanGender === 'both' || 
               scanGender === userGender;
      });

      return {
        ...diagnosticObj,
        tests: filteredTests,
        scans: filteredScans,
        originalTestsCount: diagnosticObj.tests.length,
        originalScansCount: diagnosticObj.scans.length,
        filteredTestsCount: filteredTests.length,
        filteredScansCount: filteredScans.length
      };
    });

    // STEP 7: Filter diagnostics based on cart items (gender filtered ke baad)
    const filteredDiagnostics = diagnosticsWithGenderFilter.filter(diagnostic => {
      // Agar cart empty hai to sab diagnostics dikhao
      if (cartItemIds.length === 0) {
        return true;
      }

      // Gender filtered tests ke IDs collect karein
      const diagnosticTestIds = diagnostic.tests.map(test => 
        test._id ? test._id.toString() : test.toString()
      );
      
      // Gender filtered scans ke IDs collect karein
      const diagnosticScanIds = diagnostic.scans.map(scan => 
        scan._id ? scan._id.toString() : scan.toString()
      );

      // Combine all diagnostic item IDs (gender filtered)
      const allDiagnosticItemIds = [...diagnosticTestIds, ...diagnosticScanIds];

      // Check if any cart item exists in diagnostic items
      const hasMatchingItem = cartItemIds.some(cartItemId => 
        allDiagnosticItemIds.includes(cartItemId)
      );

      return hasMatchingItem;
    });

    // STEP 8: Filter future slots
    const now = moment();

    const filterFutureSlots = (slots) => {
      return (slots || []).filter(slot => {
        const slotDateTime = moment(
          `${slot.date} ${slot.timeSlot}`,
          ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'YYYY-MM-DD h:mm A']
        );
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    const diagnosticsWithFilteredSlots = filteredDiagnostics.map(doc => {
      return {
        ...doc,
        homeCollectionSlots: filterFutureSlots(doc.homeCollectionSlots),
        centerVisitSlots: filterFutureSlots(doc.centerVisitSlots),
        // Additional info
        matchesCart: cartItemIds.length > 0,
        matchedItemCount: cartItemIds.filter(cartItemId => {
          const diagnosticTestIds = doc.tests.map(test => 
            test._id ? test._id.toString() : test.toString()
          );
          const diagnosticScanIds = doc.scans.map(scan => 
            scan._id ? scan._id.toString() : scan.toString()
          );
          return [...diagnosticTestIds, ...diagnosticScanIds].includes(cartItemId);
        }).length
      };
    });

    // STEP 9: Filter out diagnostics jinke tests aur scans dono empty ho gaye ho gender filtering ke baad
    const finalDiagnostics = diagnosticsWithFilteredSlots.filter(diagnostic => 
      diagnostic.tests.length > 0 || diagnostic.scans.length > 0
    );

    // STEP 10: Return Response
    return res.status(200).json({
      message: "Company diagnostics fetched successfully",
      data: finalDiagnostics,
      count: finalDiagnostics.length,
      companyDiagnosticsCount,
      staffInfo: {
        staffId,
        name: staff.name,
        gender: staff.gender,
        email: staff.email
      },
      cartInfo: {
        hasCart: cartItemIds.length > 0,
        cartItemCount: cartItemIds.length,
        cartItems: cartItemIds
      },
      companyInfo: {
        companyId,
        companyName: company.companyName,
        email: company.email
      },
      genderFilterInfo: {
        applied: true,
        logic: "Shows: Unisex, Both, and matching gender items",
        note: "'Both' gender items are shown to both Male and Female staff"
      }
    });

  } catch (error) {
    console.error("❌ Error fetching company diagnostics:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};


export const getAllCompanyDiagnosticsByStaffPackages = async (req, res) => {
  try {
    const { companyId, staffId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        message: "companyId is required"
      });
    }

    if (!staffId) {
      return res.status(400).json({
        message: "staffId is required"
      });
    }

    // STEP 1: Find Company
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        data: []
      });
    }

    // STEP 2: Find Staff and get myPackages
    const staff = await Staff.findById(staffId).select('myPackages');
    
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        data: []
      });
    }

    // STEP 3: Extract package IDs from staff's myPackages
    const staffPackageIds = [];
    
    if (staff.myPackages && Array.isArray(staff.myPackages) && staff.myPackages.length > 0) {
      staff.myPackages.forEach(pkg => {
        if (pkg.packageId) {
          staffPackageIds.push(pkg.packageId.toString());
        }
      });
    }

    console.log("📦 Staff myPackages IDs:", staffPackageIds);

    // STEP 4: Extract diagnosticIds from company.diagnostics
    const diagnosticIds = company.diagnostics.map(d => {
      if (typeof d === "string" || (d && d._bsontype === "ObjectID")) {
        return d;
      }
      return d.diagnosticId;
    });

    if (diagnosticIds.length === 0) {
      return res.status(200).json({
        message: "No diagnostics assigned to this company",
        data: [],
        count: 0,
        companyDiagnosticsCount: company.diagnostics.length,
        companyName: company.companyName
      });
    }

    // STEP 5: Fetch company's diagnostics with populated data
    let diagnostics = await Diagnostic.find({ _id: { $in: diagnosticIds } })
      .populate("tests")
      .populate("packages")
      .populate("scans");

    // STEP 6: Filter diagnostics based on staff's myPackages
    const filteredDiagnostics = diagnostics.filter(diagnostic => {
      // Agar staff ke paas koi packages nahi hai to sab diagnostics dikhao
      if (staffPackageIds.length === 0) {
        return true; // All diagnostics
      }

      // Check diagnostic ke packages mein se koi match karta hai
      const diagnosticPackageIds = diagnostic.packages.map(pkg => 
        pkg._id ? pkg._id.toString() : pkg.toString()
      );

      // Check if any staff package matches diagnostic packages
      const hasPackageMatch = staffPackageIds.some(pkgId => 
        diagnosticPackageIds.includes(pkgId)
      );

      return hasPackageMatch;
    });

    console.log(`🔍 Filtered ${filteredDiagnostics.length} out of ${diagnostics.length} diagnostics`);

    // STEP 7: Filter future slots
    const now = moment();

    const filterFutureSlots = (slots) => {
      return (slots || []).filter(slot => {
        const slotDateTime = moment(
          `${slot.date} ${slot.timeSlot}`,
          ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'YYYY-MM-DD h:mm A']
        );
        return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
      });
    };

    // STEP 8: Enrich diagnostics with matching package details
    const enrichedDiagnostics = filteredDiagnostics.map(doc => {
      const dObj = doc.toObject();
      
      // Find matching packages and their details
      const matchingPackages = [];
      
      if (staffPackageIds.length > 0 && staff.myPackages) {
        const diagnosticPackageIds = dObj.packages.map(pkg => 
          pkg._id ? pkg._id.toString() : pkg.toString()
        );
        
        // Staff ke packages mein se filter karein jo is diagnostic mein available hain
        staff.myPackages.forEach(staffPackage => {
          if (staffPackage.packageId && 
              diagnosticPackageIds.includes(staffPackage.packageId.toString())) {
            
            // Find complete package details from diagnostic's packages
            const packageDetails = dObj.packages.find(pkg => 
              pkg._id.toString() === staffPackage.packageId.toString()
            );
            
            matchingPackages.push({
              packageId: staffPackage.packageId,
              packageName: staffPackage.packageName || (packageDetails?.name || packageDetails?.packageName),
              price: staffPackage.price,
              offerPrice: staffPackage.offerPrice,
              tests: staffPackage.tests || [],
              diagnosticId: staffPackage.diagnosticId,
              // Additional info if available
              ...(packageDetails ? {
                originalPackage: {
                  name: packageDetails.name,
                  description: packageDetails.description,
                  price: packageDetails.price,
                  offerPrice: packageDetails.offerPrice,
                  category: packageDetails.category
                }
              } : {})
            });
          }
        });
      }

      return {
        ...dObj,
        homeCollectionSlots: filterFutureSlots(dObj.homeCollectionSlots),
        centerVisitSlots: filterFutureSlots(dObj.centerVisitSlots),
        // Matching packages information
        hasMyPackages: matchingPackages.length > 0,
        myPackages: matchingPackages,
        matchingPackageCount: matchingPackages.length,
        // Flag to show if this diagnostic has user's packages
        isMyPackageDiagnostic: matchingPackages.length > 0
      };
    });

    // STEP 9: Sort results - pehle woh diagnostics jisme user ke packages hain
    const sortedDiagnostics = enrichedDiagnostics.sort((a, b) => {
      // Pehle woh jisme packages hain
      if (a.hasMyPackages && !b.hasMyPackages) return -1;
      if (!a.hasMyPackages && b.hasMyPackages) return 1;
      
      // Phir jisme zyada matching packages hain
      if (a.matchingPackageCount > b.matchingPackageCount) return -1;
      if (a.matchingPackageCount < b.matchingPackageCount) return 1;
      
      return 0;
    });

    // STEP 10: Return Response
    return res.status(200).json({
      message: "Company diagnostics filtered by staff's myPackages fetched successfully",
      data: sortedDiagnostics,
      count: sortedDiagnostics.length,
      totalDiagnostics: diagnostics.length,
      staffPackageInfo: {
        staffId,
        totalMyPackages: staffPackageIds.length,
        packageIds: staffPackageIds,
        hasPackages: staffPackageIds.length > 0
      },
      filterInfo: {
        appliedFilter: staffPackageIds.length > 0 ? "myPackages" : "none",
        matchedDiagnostics: sortedDiagnostics.filter(d => d.hasMyPackages).length,
        unmatchedDiagnostics: sortedDiagnostics.filter(d => !d.hasMyPackages).length
      },
      companyInfo: {
        companyId,
        companyName: company.companyName,
        email: company.email
      }
    });

  } catch (error) {
    console.error("❌ Error fetching company diagnostics by staff packages:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};