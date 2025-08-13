import Staff from "../Models/staffModel.js";
import generateToken from "../config/jwtToken.js";
import Appointment from "../Models/Appointment.js";
import Doctor from "../Models/doctorModel.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { chatFunction, uploadSupportFile } from "../config/multerConfig.js";
import PDFDocument from 'pdfkit';
import Diagnostic from "../Models/diagnosticModel.js";
import HealthAssessment from "../Models/HealthAssessment.js";
import Test from "../Models/Test.js";
import Xray from "../Models/Xray.js";
import Cart from "../Models/Cart.js";
import Booking from "../Models/bookingModel.js";
import Package from "../Models/Package.js";
import HraQuestion from "../Models/HraQuestion.js";
import Chat from "../Models/Chat.js";
import ejs from 'ejs';
import puppeteer from 'puppeteer';  // Import Puppeteer
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import Hra from "../Models/HRA.js";
import dotenv from 'dotenv'
import nodemailer from "nodemailer";
import Counter from "../Models/Counter.js";
import moment from "moment-timezone";
import crypto from "crypto"; // ✅ Add this import at the top


dotenv.config();

// Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);






// Staff login function (Authentication)
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find staff by email
    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(400).json({ message: 'Staff not found' });
    }

    // Check if password matches (Note: You should hash the password in a real app)
    if (staff.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Log the staff _id (staffId)
    console.log("Staff ID: ", staff._id.toString()); // Log the staffId here

    // Generate token (Assuming `generateToken` function is defined elsewhere)
    const token = generateToken(staff._id);

    // Send complete staff object along with token and staffId as string
    res.status(200).json({
      message: 'Login successful',
      token, // Token included here
      staff: staff // Send complete staff object here
    });
  } catch (error) {
    // Log the error for debugging
    console.error('Error during staff login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// controllers/staffController.js

export const staffLogout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: 'Token missing' });
    }

    // Blacklist the token (DB or in-memory, depending on your setup)
    await BlacklistedToken.create({ token }); // pseudo - implement this model

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during staff logout:', error);
    res.status(500).json({ message: 'Server error during logout', error: error.message });
  }
};



export const getWalletBalance = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    let totalCredit = 0;
    let totalDebit = 0;

    const history = (staff.wallet_logs || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((txn) => {
        const {
          type,
          forTests = 0,
          forDoctors = 0,
          forPackages = 0,
          totalAmount = 0,
          from = "-",
          to = "-",
          date,
        } = txn;

        if (type === "credit") {
          totalCredit += totalAmount;
        } else if (type === "debit") {
          totalDebit += totalAmount;
        }

        return {
          type,
          forTests,
          forDoctors,
          forPackages,
          totalAmount,
          from,
          to,
          date,
          time_ago: getTimeAgo(date),
          description:
            type === "credit"
              ? `Credited by ${from}`
              : `Debited to ${to || "unknown"}`,
        };
      });

    const calculatedWalletBalance = totalCredit - totalDebit;

    res.status(200).json({
      message: "Wallet balance and transaction history fetched successfully",
      wallet_balance: staff.wallet_balance,
      total_credit: totalCredit,
      total_debit: totalDebit,
      forTests: staff.forTests || 0,
      forDoctors: staff.forDoctors || 0,
      forPackages: staff.forPackages || 0,
      totalAmount: staff.totalAmount || 0,
      transaction_history: history,
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHr < 24) return `${diffHr} hours ago`;
  return `${diffDay} days ago`;
}



export const bookAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      staffId,
      patient_name,
      patient_relation,
      appointment_date,
      appointment_time,
      age,
      gender,
      visit,
    } = req.body;

    console.log('Received Appointment Data:', req.body);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(400).json({ message: 'Doctor not found' });
    }

    let staff;
    if (staffId) {
      staff = await Staff.findById(staffId);
    }

    if (!staff && req.body.name) {
      staff = await Staff.findOne({ name: req.body.name });
    }

    if (!staff) {
      return res.status(400).json({ message: 'Staff not found' });
    }

    const subtotal = doctor.consultation_fee || 0;
    const total = subtotal;

    const newAppointment = new Appointment({
      doctor: doctor._id,
      staff: staff._id,
      status: 'Pending',
      patient_name: patient_name || staff.name,
      patient_relation: patient_relation || 'Self',
      appointment_date,
      appointment_time,
      age,
      gender,
      visit: visit || 'Direct',
      subtotal,
      total,
    });

    await newAppointment.save();

    if (!staff.doctorAppointments) {
      staff.doctorAppointments = [];
    }

    staff.doctorAppointments.push({
      appointmentId: newAppointment._id,
      doctor: doctor._id,
      status: newAppointment.status,
      patient_name: newAppointment.patient_name,
      patient_relation: newAppointment.patient_relation,
      subtotal,
      total,
    });

    await staff.save();

    if (!doctor.appointments) {
      doctor.appointments = [];
    }

    doctor.appointments.push({
      appointmentId: newAppointment._id,
      staff: staff._id,
      status: newAppointment.status,
      patient_name: newAppointment.patient_name,
      patient_relation: newAppointment.patient_relation,
    });

    await doctor.save();

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        appointmentId: newAppointment._id,
        doctor_details: doctor,
        staff_details: staff,
        patient_name: newAppointment.patient_name,
        patient_relation: newAppointment.patient_relation,
        age: newAppointment.age,
        gender: newAppointment.gender,
        visit: newAppointment.visit,
        status: newAppointment.status,
        subtotal,
        total,
        appointment_date: newAppointment.appointment_date,
        appointment_time: newAppointment.appointment_time,
      },
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};






export const getAppointment = async (req, res) => {
  try {
    const { staffId, appointmentId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.staff.toString() !== staff._id.toString()) {
      return res.status(403).json({ message: 'This appointment does not belong to the specified staff' });
    }

    const doctor = await Doctor.findById(appointment.doctor);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.status(200).json({
      message: 'Appointment details retrieved successfully',
      appointment: {
        appointmentId: appointment._id,
        doctor_details: doctor,  // sending full doctor object
        staff_name: staff.name,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        patient_name: appointment.patient_name,
        patient_relation: appointment.patient_relation,
        status: appointment.status,
        subtotal: appointment.subtotal,
        total: appointment.total
      },
    });
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};







// Controller to process payment for an appointment
export const processPayment = async (req, res) => {
  try {
    const { staffId, appointmentId } = req.params;

    // 1. Find staff
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(400).json({ message: 'Staff member not found' });

    // 2. Find appointment and populate doctor
    const appointment = await Appointment.findById(appointmentId).populate('doctor');
    if (!appointment) return res.status(400).json({ message: 'Appointment not found' });


    console.log('Doctor info:', appointment.doctor);

    // 3. Get payment details
    const subtotal = appointment.subtotal || 0;
    const total = appointment.total || subtotal;

    // 4. Check wallet
    if (staff.wallet_balance < total) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // 5. Deduct from wallet
    staff.wallet_balance -= total;

    // 6. Push wallet log
    const paymentTransaction = {
      type: 'debit',
      amount: total,
      from: 'Staff Wallet',
      to: appointment.doctor?.name || 'Doctor',  // now this will work ✅
      date: new Date(),
    };

    staff.wallet_logs.push(paymentTransaction);

    // 7. Update appointment status
    appointment.status = 'Confirmed';

    await staff.save();
    await appointment.save();

    // 8. Send response
    res.status(200).json({
      message: 'Payment successful and appointment confirmed',
      appointment: {
        doctor_name: appointment.doctor.name,
        doctor_specialization: appointment.doctor.specialization,
        appointment_date: appointment.appointment_date,
        patient_name: appointment.patient_name,
        patient_relation: appointment.patient_relation,
        status: appointment.status,
        subtotal,
        total,
        wallet_balance: staff.wallet_balance,
      },
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};





export const createFamilyMember = async (req, res) => {
  try {
    const { staffId } = req.params;
    const {
      fullName,
      mobileNumber,
      age,
      gender,
      DOB,
      height,
      weight,
      eyeSight,
      BMI,
      BP,
      sugar,
      relation,
    } = req.body;

    // Find the staff member by their ID
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Ensure the family_members array is initialized if not present
    if (!staff.family_members) {
      staff.family_members = []; // Initialize the array if it's undefined
    }

    // Create a new family member object
    const newFamilyMember = {
      fullName,
      mobileNumber,
      age,
      gender,
      DOB,
      height,
      weight,
      eyeSight,
      BMI,
      BP,
      sugar,
      relation,
    };

    // Add the new family member to the staff's family_members array
    staff.family_members.push(newFamilyMember);

    // Save the staff document with the new family member
    await staff.save();

    // Return success message, newly added family member, and complete staff details
    res.status(200).json({
      message: 'Family member added successfully',
      family_member: newFamilyMember,
      staff: {
        name: staff.name,
        email: staff.email,
        contact_number: staff.contact_number,
        address: staff.address,
        role: staff.role,
        wallet_balance: staff.wallet_balance,
        family_members: staff.family_members,
        doctorAppointments: staff.doctorAppointments,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getAllFamilyMembers = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Find the staff member by their ID
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Return all family members associated with the staff member
    res.status(200).json({
      message: 'All family members fetched successfully',
      family_members: staff.family_members,
    });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getFamilyMember = async (req, res) => {
  try {
    const { staffId, familyMemberId } = req.params;

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Find the specific family member by familyMemberId
    const familyMember = staff.family_members.id(familyMemberId);
    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.status(200).json({
      message: 'Family member fetched successfully',
      family_member: familyMember,
    });
  } catch (error) {
    console.error('Error fetching family member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const updateFamilyMember = async (req, res) => {
  try {
    const { staffId, familyMemberId } = req.params;
    const {
      fullName,
      mobileNumber,
      age,
      gender,
      DOB,
      height,
      weight,
      eyeSight,
      BMI,
      BP,
      sugar,
      relation,
    } = req.body;

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Find the specific family member
    const familyMember = staff.family_members.id(familyMemberId);
    if (!familyMember) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    // Update the family member details
    familyMember.fullName = fullName || familyMember.fullName;
    familyMember.mobileNumber = mobileNumber || familyMember.mobileNumber;
    familyMember.age = age || familyMember.age;
    familyMember.gender = gender || familyMember.gender;
    familyMember.DOB = DOB || familyMember.DOB;
    familyMember.height = height || familyMember.height;
    familyMember.weight = weight || familyMember.weight;
    familyMember.eyeSight = eyeSight || familyMember.eyeSight;
    familyMember.BMI = BMI || familyMember.BMI;
    familyMember.BP = BP || familyMember.BP;
    familyMember.sugar = sugar || familyMember.sugar;
    familyMember.relation = relation || familyMember.relation;

    // Save the updated staff document
    await staff.save();

    res.status(200).json({
      message: 'Family member updated successfully',
      family_member: familyMember,
    });
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const removeFamilyMember = async (req, res) => {
  try {
    const { staffId, familyMemberId } = req.params;

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if the family member exists
    const exists = staff.family_members.some(member => member._id.toString() === familyMemberId);
    if (!exists) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    // Remove the family member using filter
    staff.family_members = staff.family_members.filter(
      member => member._id.toString() !== familyMemberId
    );

    // Save the updated staff document
    await staff.save();

    res.status(200).json({
      message: 'Family member removed successfully',
    });
  } catch (error) {
    console.error('Error removing family member:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};






// Define the staff profile directory

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(staffProfileDir, { recursive: true });
    cb(null, staffProfileDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('profileImage');

// Controller
export const uploadProfileImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    }

    try {
      const { staffId } = req.params;
      const staff = await Staff.findById(staffId);

      if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
      }

      // Delete old image if exists
      if (staff.profileImage) {
        const oldFilePath = path.join(staffProfileDir, staff.profileImage);
        fs.promises.unlink(oldFilePath).catch((err) => {
          console.error('Error deleting old image:', err);
        });
      }

      // Update and save new image
      staff.profileImage = req.file.filename;
      await staff.save();

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/staffprofile/${req.file.filename}`;

      res.status(200).json({
        message: 'Profile image uploaded successfully',
        staff: {
          name: staff.name,
          email: staff.email,
          contact_number: staff.contact_number,
          address: staff.address,
          role: staff.role,
          profileImage: imageUrl,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};



export const updateProfileImage = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    }

    try {
      const { staffId } = req.params;
      const staff = await Staff.findById(staffId);

      if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
      }

      // If a new file is uploaded
      if (req.file) {
        // Delete old image if exists
        if (staff.profileImage) {
          const oldFilePath = path.join(staffProfileDir, staff.profileImage);
          fs.promises.unlink(oldFilePath).catch((err) => {
            console.error('Error deleting old image:', err);
          });
        }

        // Update with new image
        staff.profileImage = req.file.filename;
      }

      // Save staff (whether image was updated or not)
      await staff.save();

      const imageUrl = staff.profileImage
        ? `${req.protocol}://${req.get('host')}/uploads/staffprofile/${staff.profileImage}`
        : null;

      res.status(200).json({
        message: req.file ? 'Profile image updated successfully' : 'No image uploaded, existing image retained',
        staff: {
          name: staff.name,
          email: staff.email,
          contact_number: staff.contact_number,
          address: staff.address,
          role: staff.role,
          profileImage: imageUrl,
          createdAt: staff.createdAt,
          updatedAt: staff.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};



export const getMyProfile = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Find the staff by ID
    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Send profileImage as is, without modifying the path
    const profileImage = staff.profileImage || null;

    // Return full staff details
    res.status(200).json({
      message: 'Staff fetched successfully',
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        contact_number: staff.contact_number,
        address: staff.address,
        role: staff.role,
        profileImage: profileImage,
        wallet_balance: staff.wallet_balance,
        family_members: staff.family_members,
        doctorAppointments: staff.doctorAppointments,
        myBookings: staff.myBookings,
        wallet_logs: staff.wallet_logs,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};





export const createStaffAddress = async (req, res) => {
  try {
    const { staffId } = req.params;
    const {
      street,
      city,
      state,
      country,
      postalCode,
      addressType, // e.g. 'Home', 'Office'
    } = req.body;

    // Find staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Initialize addresses array if undefined
    if (!staff.addresses) {
      staff.addresses = [];
    }

    // Create new address object
    const newAddress = {
      street,
      city,
      state,
      country,
      postalCode,
      addressType,
    };

    // Push into addresses array
    staff.addresses.push(newAddress);
    await staff.save();

    res.status(200).json({
      message: 'Address added successfully',
      address: newAddress,
      addresses: staff.addresses,
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getStaffAddresses = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Find the staff by ID
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    res.status(200).json({
      message: 'Addresses fetched successfully',
      addresses: staff.addresses || [],
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const removeStaffAddress = async (req, res) => {
  try {
    const { staffId, addressId } = req.params;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const addressObjectId = new mongoose.Types.ObjectId(addressId);

    const addressIndex = staff.addresses.findIndex(
      (addr) => addr._id.toString() === addressObjectId.toString()
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const removed = staff.addresses.splice(addressIndex, 1);
    await staff.save();

    res.status(200).json({
      message: 'Address removed successfully',
      removedAddress: removed[0],
      remainingAddresses: staff.addresses,
    });
  } catch (error) {
    console.error('Error removing address:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const updateStaffAddress = async (req, res) => {
  try {
    const { staffId, addressId } = req.params;
    const {
      street,
      city,
      state,
      country,
      postalCode,
      addressType,
    } = req.body;

    // Find staff by ID
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if addresses exist
    const addressIndex = staff.addresses.findIndex(
      (addr) => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Update the address fields
    const updatedAddress = {
      ...staff.addresses[addressIndex]._doc,
      street: street ?? staff.addresses[addressIndex].street,
      city: city ?? staff.addresses[addressIndex].city,
      state: state ?? staff.addresses[addressIndex].state,
      country: country ?? staff.addresses[addressIndex].country,
      postalCode: postalCode ?? staff.addresses[addressIndex].postalCode,
      addressType: addressType ?? staff.addresses[addressIndex].addressType,
    };

    staff.addresses[addressIndex] = updatedAddress;
    await staff.save();

    res.status(200).json({
      message: 'Address updated successfully',
      updatedAddress,
    });

  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const submitIssue = (req, res) => {
  uploadSupportFile(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }

    try {
      const { staffId } = req.params;
      const { reason, description } = req.body;

      const staff = await Staff.findById(staffId);
      if (!staff) return res.status(404).json({ message: 'Staff not found' });

      // Initialize issues array if it's undefined or null
      if (!staff.issues) {
        staff.issues = [];
      }

      const newIssue = {
        reason,
        description,
        file: req.file ? req.file.filename : null,
        status: 'Processing',
        createdAt: new Date(),
      };

      // Push new issue to issues array
      staff.issues.push(newIssue);
      await staff.save();

      res.status(200).json({
        message: 'Issue submitted successfully',
        issue: newIssue,
      });
    } catch (error) {
      console.error('Submit issue error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
};


// 📤 Admin updates issue
export const updateIssueStatus = async (req, res) => {
  try {
    const { staffId, issueId } = req.params;
    const { response, status } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const issue = staff.issues.id(issueId);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    issue.response = response || '';
    issue.status = status || 'Processing';
    issue.updatedAt = new Date();

    await staff.save();

    res.status(200).json({
      message: 'Issue updated successfully',
      updatedIssue: issue,
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 📄 Get all issues of a staff
export const getStaffIssues = async (req, res) => {
  try {
    const { staffId } = req.params;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    res.status(200).json({
      message: 'Issues fetched successfully',
      issues: staff.issues || [],
    });
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const getDoctorAppointmentsForStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.body; // Get the status filter from the request body, if any

    // Find staff by ID and populate doctorAppointments and related doctor details
    const staff = await Staff.findById(staffId)
      .populate({
        path: 'doctorAppointments.appointmentId', // Populate the appointment details
        select:
          'patient_name patient_relation age gender visit subtotal total appointment_date appointment_time status payment_status schedule',
      })
      .populate({
        path: 'doctorAppointments.doctor', // Populate the doctor details inside each appointment
        select: 'name specialization image',
      });

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Filter by status if it is provided in the request body
    const filteredAppointments = status
      ? staff.doctorAppointments.filter(
        (appointment) => appointment.appointmentId?.status === status
      )
      : staff.doctorAppointments;

    // Safeguard: Check for null or undefined doctor or appointmentId before mapping
    const appointments = filteredAppointments
      .map((appointment) => {
        if (!appointment.appointmentId || !appointment.doctor) {
          return null; // Skip invalid entries
        }

        return {
          appointmentId: appointment.appointmentId._id,
          doctor_name: appointment.doctor.name,
          doctor_specialization: appointment.doctor.specialization,
          doctor_image: appointment.doctor.image,
          appointment_date: appointment.appointmentId.appointment_date,
          appointment_time: appointment.appointmentId.appointment_time,
          status: appointment.appointmentId.status,
          patient_name: appointment.appointmentId.patient_name,
          patient_relation: appointment.appointmentId.patient_relation,
          age: appointment.appointmentId.age,
          gender: appointment.appointmentId.gender,
          visit: appointment.appointmentId.visit,
          subtotal: appointment.appointmentId.subtotal,
          total: appointment.appointmentId.total,
          payment_status: appointment.appointmentId.payment_status,
          schedule: appointment.appointmentId.schedule,
        };
      })
      .filter(Boolean); // Filter out null entries if any invalid appointment is found

    // Returning the staff details and their doctor appointments along with doctor details and schedule
    res.status(200).json({
      message: 'Doctor appointments fetched successfully',
      staff: {
        staffId: staff._id,
        name: staff.name,
        email: staff.email,
        contact_number: staff.contact_number,
        profileImage: staff.profileImage,
        role: staff.role,
        wallet_balance: staff.wallet_balance,
        address: staff.address,
        myBookings: staff.myBookings,
      },
      appointments: appointments, // Only include valid appointments
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getAllDiagnosticBookingForStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;

    // 1. Find the staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(400).json({ message: 'Staff not found' });
    }

    // 2. Get all diagnostic bookings for the staff
    const bookings = await Booking.find({ staff: staffId })
      .populate('staff')
      .populate('diagnostic')
      .populate({
        path: 'diagnostic.tests',
        select: 'test_name price offerPrice description image'
      });

    if (!bookings || bookings.length === 0) {
      return res.status(400).json({ message: 'No bookings found for this staff member' });
    }

    // 3. Filter bookings by status if provided
    const filteredBookings = status
      ? bookings.filter((booking) => booking.status === status)
      : bookings;

    // 4. Map and format the booking details
    const bookingDetails = filteredBookings.map((booking) => {
      // Format appointment_date to "YYYY-MM-DD" if it's a Date object
      const formattedDate = booking.appointment_date
        ? new Date(booking.appointment_date).toISOString().split('T')[0]
        : '';

      return {
        bookingId: booking._id,
        patient_name: booking.patient_name,
        patient_age: booking.age,
        patient_gender: booking.gender,
        staff_name: booking.staff ? booking.staff.name : 'N/A',
        diagnostic_name: booking.diagnostic ? booking.diagnostic.name : 'N/A',
        diagnostic_image: booking.diagnostic ? booking.diagnostic.image : '',
        diagnostic_address: booking.diagnostic ? booking.diagnostic.address : '',
        consultation_fee: booking.consultation_fee || 0,
        tests: booking.diagnostic?.tests?.map(test => ({
          test_name: test.test_name,
          price: test.price,
          offerPrice: test.offerPrice || test.price,
          description: test.description,
          image: test.image
        })) || [],
        appointment_date: formattedDate,
        gender: booking.gender,
        age: booking.age,
        subtotal: booking.subtotal,
        gst_on_tests: booking.gst_on_tests,
        gst_on_consultation: booking.gst_on_consultation,
        total: booking.total,
        status: booking.status
      };
    });

    // 5. Return the response
    res.status(200).json({
      message: 'Bookings fetched successfully',
      bookings: bookingDetails
    });
  } catch (error) {
    console.error('Error fetching bookings for staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getStaffTestPackageById = async (req, res) => {
  const { staffId } = req.params;

  try {
    const staffMember = await Staff.findById(staffId)
      .populate({
        path: 'myPackages.diagnosticId',
        model: 'Diagnostic',
        select: 'name address centerType email phone',
      })
      .populate({
        path: 'myPackages.packageId',
        model: 'Package',
      })
      .lean();

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const expandedPackages = staffMember.myPackages.map((pkg) => {
      const diagnostic = pkg.diagnosticId || {};
      const fullPackage = pkg.packageId || {};

      return {
        _id: pkg._id,
        packageId: fullPackage._id || pkg.packageId,
        packageName: fullPackage.name || pkg.packageName || '',
        price: pkg.price || fullPackage.price || 0,
        offerPrice: pkg.offerPrice || 0,
        doctorInfo: fullPackage.doctorInfo || '',
        totalTestsIncluded: fullPackage.totalTestsIncluded || 0,
        description: fullPackage.description || '',
        precautions: fullPackage.precautions || '',
        includedTests: fullPackage.includedTests || [],
        tests: pkg.tests || [],
        diagnosticCenter: {
          name: diagnostic?.name || '',
          address: diagnostic?.address || '',
          email: diagnostic?.email || '',
          phone: diagnostic?.phone || '',
          centerType: diagnostic?.centerType || '',
        }
      };
    });

    res.status(200).json({
      message: '✅ Packages fetched successfully.',
      myPackages: expandedPackages
    });

  } catch (error) {
    console.error('❌ Error fetching packages:', error);
    res.status(500).json({ message: 'Server error while fetching packages.' });
  }
};


export const getSingleStaffTestPackage = async (req, res) => {
  const { staffId, packageId } = req.params;

  try {
    const staffMember = await Staff.findById(staffId)
      .populate({
        path: 'myPackages.diagnosticId',
        model: 'Diagnostic',
        select: 'name address centerType email phone',
      })
      .populate({
        path: 'myPackages.packageId',
        model: 'Package',
      })
      .lean();

    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    const pkg = staffMember.myPackages.find(
      (p) => String(p.packageId?._id || p.packageId) === packageId
    );

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found for this staff member.' });
    }

    const diagnostic = pkg.diagnosticId || {};
    const fullPackage = pkg.packageId || {};

    const expandedPackage = {
      _id: pkg._id,
      packageId: fullPackage._id || pkg.packageId,
      packageName: fullPackage.name || pkg.packageName || '',
      price: pkg.price || fullPackage.price || 0,
      offerPrice: pkg.offerPrice || 0,
      doctorInfo: fullPackage.doctorInfo || '',
      totalTestsIncluded: fullPackage.totalTestsIncluded || 0,
      description: fullPackage.description || '',
      precautions: fullPackage.precautions || '',
      includedTests: fullPackage.includedTests || [],
      tests: pkg.tests || [],
      diagnosticCenter: {
        name: diagnostic?.name || '',
        address: diagnostic?.address || '',
        email: diagnostic?.email || '',
        phone: diagnostic?.phone || '',
        centerType: diagnostic?.centerType || '',
      }
    };

    res.status(200).json({
      message: '✅ Single package fetched successfully.',
      package: expandedPackage
    });

  } catch (error) {
    console.error('❌ Error fetching package:', error);
    res.status(500).json({ message: 'Server error while fetching package.' });
  }
};



const pdfsDirectory = path.join(process.cwd(), 'pdfs');

// Ensure PDF directory exists
if (!fs.existsSync(pdfsDirectory)) {
  fs.mkdirSync(pdfsDirectory);
}


// Ensure PDF directory exists
if (!fs.existsSync(pdfsDirectory)) {
  fs.mkdirSync(pdfsDirectory, { recursive: true });
}

// PDF Generator
const generateStaffPrescriptionPDF = (staff, doctor, filePath) => {
  try {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text(`Staff: ${staff.name}`, { underline: true });
    doc.fontSize(16).text(`Doctor: ${doctor.name}`, { underline: true });
    doc.moveDown();

    if (staff.prescription?.length) {
      doc.fontSize(16).text('Prescriptions:', { underline: true });
      staff.prescription.forEach((pres, index) => {
        doc.moveDown(0.5);
        doc.text(`${index + 1}. ${pres.medicineName || 'Medicine'} - ${pres.dosage || ''}`);
        doc.text(`   Instructions: ${pres.instructions || 'N/A'}`);
        doc.text(`   Date: ${pres.createdAt ? new Date(pres.createdAt).toLocaleDateString() : 'N/A'}`);
      });
    } else {
      doc.text('No prescriptions available.');
    }

    doc.end();
    console.log(`✅ PDF generated for staffId: ${staff._id}`);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  }
};

// Main controller
export const getPrescription = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { status } = req.body;

    console.log(`🔍 Fetching appointments for staffId: ${staffId}`);

    const appointments = await Appointment.find({ staff: staffId })
      .populate('staff')
      .populate('doctor'); // populate doctor info

    if (!appointments.length) {
      return res.status(404).json({ message: 'No appointments found for this staff member' });
    }

    const filteredAppointments = status
      ? appointments.filter(app => app.status === status)
      : appointments;

    const appointmentDetails = filteredAppointments.map(app => {
      const prescriptionPdfFileName = `prescription-${app._id}.pdf`;
      const prescriptionPdfFilePath = path.join(pdfsDirectory, prescriptionPdfFileName);
      const prescriptionPdfUrl = `/pdfs/${prescriptionPdfFileName}`;

      const hasPrescription = app.staff?.prescription?.length > 0;

      if (hasPrescription) {
        generateStaffPrescriptionPDF(app.staff, app.doctor, prescriptionPdfFilePath);
      }

      return {
        appointmentId: app._id,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        patient_name: app.patient_name,
        patient_relation: app.patient_relation,
        status: app.status,
        total: app.total,
        payment_status: app.payment_status,
        staff: {
          id: app.staff?._id,
          name: app.staff?.name,
          email: app.staff?.email,
          mobile: app.staff?.mobile,
        },
        doctor: {
          id: app.doctor?._id,
          name: app.doctor?.name,
          specialization: app.doctor?.specialization,
          qualification: app.doctor?.qualification,
          consultation_fee: app.doctor?.consultation_fee,
          image: app.doctor?.image,
          email: app.doctor?.email,
          mobile: app.doctor?.mobile,
        },
        prescriptionPdfUrl: hasPrescription ? prescriptionPdfUrl : null,
      };
    });

    res.status(200).json({
      message: 'Appointments and prescriptions fetched successfully',
      appointments: appointmentDetails,
    });

  } catch (error) {
    console.error('❌ Error fetching prescriptions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const addDiagnosticTestsToStaff = async (req, res) => {
  const { staffId, diagnosticId, packageId } = req.body;

  // Find staff
  const staff = await Staff.findById(staffId);
  if (!staff) return res.status(404).json({ message: "Staff not found" });

  // Find diagnostic and package
  const diagnostic = await Diagnostic.findById(diagnosticId);
  if (!diagnostic) return res.status(404).json({ message: "Diagnostic not found" });

  const selectedPackage = diagnostic.packages.id(packageId);
  if (!selectedPackage) return res.status(404).json({ message: "Package not found" });

  // Map tests
  const tests = selectedPackage.tests.map(test => ({
    testId: test._id,
    testName: test.test_name,
    description: test.description,
    image: test.image
  }));

  // Push into myPackage
  staff.myPackage.push({
    diagnosticId,
    packageId,
    packageName: selectedPackage.packageName,
    price: selectedPackage.price,
    offerPrice: selectedPackage.offerPrice,
    tests
  });

  await staff.save();

  res.status(200).json({ message: "Package added to staff successfully", staff });
};



export const getStaffPackages = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: "staffId is required in params." });
    }

    // Staff find karo aur myPackage aur myTest fetch karo
    const staff = await Staff.findById(staffId)
      .select("name myPackage myTest")  // Fetch both myPackage and myTest
      .populate('myTest')  // Populate myTest array (if it's a reference to another collection)

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    return res.status(200).json({
      message: "Staff packages and tests fetched successfully",
      data: staff
    });

  } catch (error) {
    console.error("Error fetching staff packages and tests:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



export const submitAnswer = async (req, res) => {
  try {
    const { staffId } = req.params;
    const answers = req.body.answers;

    console.log("Received request to submit answers");
    console.log("Staff ID:", staffId);
    console.log("Answers payload:", JSON.stringify(answers, null, 2));

    if (!Array.isArray(answers) || answers.length === 0) {
      console.log("Invalid input: answers not provided or not an array");
      return res.status(400).json({ message: "Invalid input. Answers must be provided in an array." });
    }

    const sectionIds = answers.map(answer => answer.sectionId);
    console.log("Looking for sections in HealthAssessment with IDs:", sectionIds);

    const healthAssessment = await HealthAssessment.findOne({
      "sections.sectionId": { $in: sectionIds }
    });

    if (!healthAssessment) {
      console.log("No health assessment found containing the provided section IDs.");
      return res.status(404).json({ message: "Assessment or sections not found" });
    }

    let totalPoints = 0;

    for (const { sectionId, questionId, selectedAnswer } of answers) {
      console.log(`Processing answer for Section: ${sectionId}, Question: ${questionId}`);
      console.log("Selected Answer:", selectedAnswer);

      const section = healthAssessment.sections.find(s => s.sectionId.toString() === sectionId);
      if (!section) {
        console.log(`Section with ID ${sectionId} not found in assessment.`);
        return res.status(404).json({ message: `Section with ID ${sectionId} not found` });
      }

      const question = section.questions.find(q => q.questionId.toString() === questionId);
      if (!question) {
        console.log(`Question with ID ${questionId} not found in section ${sectionId}`);
        return res.status(404).json({ message: `Question with ID ${questionId} not found` });
      }

      console.log("Question Points:", question.points);

      // Check if points is a Map and convert to object if necessary
      const pointsObject = question.points instanceof Map ? Object.fromEntries(question.points) : question.points;

      // Trim both selectedAnswer and the options to avoid extra spaces or formatting issues
      const cleanedSelectedAnswer = selectedAnswer.trim();
      const cleanedOptions = Object.keys(pointsObject).map(option => option.trim());

      console.log("Cleaned Selected Answer:", cleanedSelectedAnswer);
      console.log("Cleaned Options:", cleanedOptions);

      // Check if the selected answer is in the options
      let points = 0;
      if (cleanedOptions.includes(cleanedSelectedAnswer)) {
        points = pointsObject[cleanedSelectedAnswer];
        console.log(`Points for answer "${cleanedSelectedAnswer}":`, points);
      } else {
        console.log(`Selected answer "${cleanedSelectedAnswer}" not found in options.`);
      }

      totalPoints += points;

      // Push submission
      const submission = {
        staffId,
        selectedAnswer,
        submittedAt: Date.now()
      };

      console.log("Adding submission:", submission);
      if (!question.submissions) {
        question.submissions = [];
      }
      question.submissions.push(submission);
    }

    console.log("Total Points Accumulated:", totalPoints);
    await healthAssessment.save();
    console.log("Health assessment saved successfully");

    // Risk category determination
    let riskCategory = "Above 65 – Low Risk";
    if (totalPoints < 50) {
      riskCategory = "Below 50 – High Risk";
    } else if (totalPoints < 65) {
      riskCategory = "Below 65 – Medium Risk";
    }

    console.log("Final Risk Category:", riskCategory);

    const responsePayload = {
      message: "Answers submitted successfully",
      totalPoints,
      riskCategory,
      data: answers.map(answer => ({
        staffId,
        sectionId: answer.sectionId,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer
      }))
    };

    console.log("Response Payload:", JSON.stringify(responsePayload, null, 2));
    res.status(200).json(responsePayload);

  } catch (error) {
    console.error("Error occurred during answer submission:", error);
    res.status(500).json({ message: "Error submitting answers", error: error.message });
  }
};



// Controller to add or update staff's steps
export const addOrUpdateStaffSteps = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { steps } = req.body;

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    // Add or update today's step entry
    const todaySteps = staff.steps.find(
      (step) => new Date(step.date).getTime() === today.getTime()
    );

    if (todaySteps) {
      todaySteps.stepsCount += steps;
    } else {
      staff.steps.push({
        date: today,
        day: dayOfWeek,
        stepsCount: steps,
      });
    }

    // 🔁 Recalculate totalCoins based on all steps
    const totalCoins = staff.steps.reduce((acc, step) => {
      return acc + Math.floor((step.stepsCount / 10000) * 100);
    }, 0);

    staff.totalCoins = totalCoins;

    await staff.save();

    res.status(200).json({
      message: 'Steps recorded successfully',
      steps: staff.steps,
      totalCoins: staff.totalCoins,
    });
  } catch (error) {
    console.error('Error recording staff steps:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const getStaffStepsHistory = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Find the staff record by staffId
    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Prepare today's and yesterday's date strings
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const formatDate = (dateObj) => dateObj.toLocaleDateString('en-GB'); // "dd/mm/yyyy"

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    // Initialize totals
    let totalSteps = 0;
    let totalCoins = 0;
    let todayTotalSteps = 0;
    let todayTotalCoins = 0;
    let yesterdayTotalSteps = 0;
    let yesterdayTotalCoins = 0;

    // Build steps + coins summary
    const stepsSummary = staff.steps.map((step) => {
      const stepDate = new Date(step.date);
      const stepDateStr = formatDate(stepDate);
      const coinsEarned = Math.floor((step.stepsCount / 10000) * 100); // 100 coins per 10k steps

      totalSteps += step.stepsCount;
      totalCoins += coinsEarned;

      let label = stepDateStr;
      if (stepDateStr === todayStr) {
        label = "Today";
        todayTotalSteps += step.stepsCount;
        todayTotalCoins += coinsEarned;
      } else if (stepDateStr === yesterdayStr) {
        label = "Yesterday";
        yesterdayTotalSteps += step.stepsCount;
        yesterdayTotalCoins += coinsEarned;
      }

      return {
        date: label,
        day: step.day,
        stepsCount: step.stepsCount,
        coinsEarned: coinsEarned,
      };
    });

    // Send response
    // Inside getStaffStepsHistory response
    res.status(200).json({
      staffId: staff._id,
      name: staff.name,
      stepsSummary,
      totalSteps,
      totalCoins,
      todayTotalSteps,
      todayTotalCoins,
      yesterdayTotalSteps,
      yesterdayTotalCoins
    });

  } catch (error) {
    console.error('Error fetching staff steps:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Utility to get item type
const getItemType = async (itemId) => {
  if (await Test.findById(itemId)) return 'test';
  if (await Xray.findById(itemId)) return 'xray';
  return null;
};


const getItemDetails = async (itemId) => {
  let item = await Test.findById(itemId);
  if (item) {
    const offer = item.offerPrice || 0;
    const totalPayable = item.price - offer;
    return {
      type: 'test',
      title: item.name,
      price: item.price,
      offerPrice: offer,
      totalPayable
    };
  }

  item = await Xray.findById(itemId);
  if (item) {
    return {
      type: 'xray',
      title: item.title,
      price: item.price,
      offerPrice: 0,
      totalPayable: item.price
    };
  }

  return null;
};

export const addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemId, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid userId or itemId" });
    }

    if (!['inc', 'dec'].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const itemDetails = await getItemDetails(itemId);
    if (!itemDetails) {
      return res.status(404).json({ message: "Item not found in Test or Xray collections" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      item => item.itemId.toString() === itemId && item.type === itemDetails.type
    );

    if (existingIndex > -1) {
      // Update quantity
      const item = cart.items[existingIndex];

      item.quantity = action === 'inc'
        ? item.quantity + 1
        : Math.max(1, item.quantity - 1);

      item.totalPrice = item.totalPayable * item.quantity;

    } else {
      // Add new item
      cart.items.push({
        itemId,
        type: itemDetails.type,
        title: itemDetails.title,
        quantity: 1,
        price: itemDetails.price,
        offerPrice: itemDetails.offerPrice,
        totalPayable: itemDetails.totalPayable,
        totalPrice: itemDetails.totalPayable
      });
    }

    await cart.save();
    return res.status(200).json({ message: "Cart updated successfully", cart });

  } catch (err) {
    console.error("❌ Error updating cart:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        message: "Cart is empty",
        items: [],
        grandTotal: 0
      });
    }

    // Enrich items with full details from Test/Xray
    const enrichedItems = await Promise.all(cart.items.map(async (item) => {
      let product = null;

      if (item.type === "test") {
        product = await Test.findById(item.itemId).lean();
        if (!product) return null;

        const offerPrice = product.offerPrice || 0;
        const totalPayable = product.price - offerPrice;

        return {
          itemId: item.itemId,
          type: "test",
          title: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          offerPrice,
          totalPayable,
          quantity: item.quantity,
          totalPrice: totalPayable * item.quantity,
          fastingRequired: product.fastingRequired,
          homeCollectionAvailable: product.homeCollectionAvailable,
          reportIn24Hrs: product.reportIn24Hrs,
        };
      }

      if (item.type === "xray") {
        product = await Xray.findById(item.itemId).lean();
        if (!product) return null;

        return {
          itemId: item.itemId,
          type: "xray",
          title: product.title,
          preparation: product.preparation,
          reportTime: product.reportTime,
          image: product.image,
          price: product.price,
          offerPrice: 0,
          totalPayable: product.price,
          quantity: item.quantity,
          totalPrice: product.price * item.quantity,
        };
      }

      return null;
    }));

    const items = enrichedItems.filter(Boolean);
    const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    res.status(200).json({
      message: "Cart fetched successfully",
      items,
      grandTotal
    });

  } catch (err) {
    console.error("❌ Error fetching cart:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



export const removeFromCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid userId or itemId" });
    }

    const type = await getItemType(itemId);
    if (!type) {
      return res.status(404).json({ message: "Item not found in Test or Xray collections" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const initialLength = cart.items.length;

    cart.items = cart.items.filter(
      (item) => !(item.itemId.toString() === itemId && item.type === type)
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await cart.save();

    // 🔁 Recalculate grandTotal and return enriched updated cart
    const enrichedItems = await Promise.all(cart.items.map(async (item) => {
      let product = null;

      if (item.type === "test") {
        product = await Test.findById(item.itemId).lean();
        if (!product) return null;

        const offerPrice = product.offerPrice || 0;
        const totalPayable = product.price - offerPrice;

        return {
          itemId: item.itemId,
          type: "test",
          title: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          offerPrice,
          totalPayable,
          quantity: item.quantity,
          totalPrice: totalPayable * item.quantity,
          fastingRequired: product.fastingRequired,
          homeCollectionAvailable: product.homeCollectionAvailable,
          reportIn24Hrs: product.reportIn24Hrs,
        };
      }

      if (item.type === "xray") {
        product = await Xray.findById(item.itemId).lean();
        if (!product) return null;

        return {
          itemId: item.itemId,
          type: "xray",
          title: product.title,
          preparation: product.preparation,
          reportTime: product.reportTime,
          image: product.image,
          price: product.price,
          offerPrice: 0,
          totalPayable: product.price,
          quantity: item.quantity,
          totalPrice: product.price * item.quantity,
        };
      }

      return null;
    }));

    const items = enrichedItems.filter(Boolean);
    const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    return res.status(200).json({
      message: "Item removed from cart",
      items,
      grandTotal,
    });

  } catch (err) {
    console.error("❌ Error removing item from cart:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// =======================
// Booking ID Generators
// =======================
const generateDiagnosticBookingId = async () => {
  const lastBooking = await Booking.findOne({
    diagnosticBookingId: { $ne: null }
  })
    .sort({ diagnosticBookingId: -1 }) // Sort by ID value
    .select("diagnosticBookingId");

  if (!lastBooking) {
    return "DIA-0001";
  }

  const lastId = parseInt(lastBooking.diagnosticBookingId.split("-")[1], 10);
  const newId = (lastId + 1).toString().padStart(4, "0");
  return `DIA-${newId}`;
};

const generatePackageBookingId = async () => {
  const lastBooking = await Booking.findOne({
    packageBookingId: { $ne: null }
  })
    .sort({ packageBookingId: -1 }) // Sort by ID value
    .select("packageBookingId");

  if (!lastBooking) {
    return "PKG-0001";
  }

  const lastId = parseInt(lastBooking.packageBookingId.split("-")[1], 10);
  const newId = (lastId + 1).toString().padStart(4, "0");
  return `PKG-${newId}`;
};


// =======================
// Create Booking from Staff Cart
// =======================
export const createBookingFromStaffCart = async (req, res) => {
  try {
    const { staffId } = req.params;
    const {
      familyMemberId,
      diagnosticId,
      serviceType,
      date,
      timeSlot,
      transactionId,
      addressId
    } = req.body;

    // Validate service type
    if (!["Home Collection", "Center Visit"].includes(serviceType)) {
      return res.status(400).json({
        message: "Invalid service type",
        isSuccessfull: false
      });
    }

    // Find staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        isSuccessfull: false
      });
    }

    // Find cart
    const staffCart = await Cart.findOne({ userId: staffId });
    if (!staffCart || !staffCart.items.length) {
      return res.status(404).json({
        message: "Cart is empty or not found for staff",
        isSuccessfull: false
      });
    }

    // Calculate price
    const totalPrice =
      staffCart.totalPrice ??
      staffCart.items.reduce(
        (sum, item) => sum + (item.totalPrice || item.price || 0),
        0
      );
    const payableAmount = staffCart.payableAmount ?? totalPrice;

    // Wallet + Payment logic
    let walletUsed = 0;
    let onlinePaymentUsed = 0;
    let paymentStatus = null;
    let paymentDetails = null;
    const availableBalance = staff.forTests || 0;

    if (availableBalance >= payableAmount) {
      walletUsed = payableAmount;
      staff.wallet_balance -= walletUsed;
      staff.forTests -= walletUsed;
    } else {
      walletUsed = availableBalance;
      onlinePaymentUsed = payableAmount - availableBalance;
      staff.wallet_balance -= walletUsed;
      staff.forTests = 0;

      if (!transactionId) {
        return res.status(402).json({
          message:
            "Insufficient wallet balance. Please provide transactionId for online payment.",
          isSuccessfull: false,
          walletAvailable: availableBalance,
          requiredOnline: onlinePaymentUsed,
        });
      }

      // Razorpay capture
      let paymentInfo;
      try {
        paymentInfo = await razorpay.payments.fetch(transactionId);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid transaction ID",
          isSuccessfull: false
        });
      }

      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(
            transactionId,
            paymentInfo.amount,
            "INR"
          );
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          return res.status(500).json({
            message: "Payment capture failed",
            isSuccessfull: false
          });
        }
      }

      if (paymentInfo.status !== "captured") {
        return res.status(400).json({
          message: `Payment not captured. Status: ${paymentInfo.status}`,
          isSuccessfull: false
        });
      }

      paymentStatus = paymentInfo.status;
      paymentDetails = paymentInfo;
    }

    // Wallet log
    if (walletUsed > 0) {
      staff.wallet_logs.push({
        type: "debit",
        forTests: walletUsed,
        forDoctors: 0,
        forPackages: 0,
        totalAmount: walletUsed,
        from: "Diagnostics Booking",
        date: new Date(),
      });
    }

    await staff.save();

    // Generate unique booking ID
    const diagnosticBookingId = await generateDiagnosticBookingId();

    // Safe date formatting
    const bookingDate = moment(date, [
      "YYYY-MM-DD",
      "DD/MM/YYYY",
      "MM/DD/YYYY"
    ]).isValid()
      ? moment(date, [
          "YYYY-MM-DD",
          "DD/MM/YYYY",
          "MM/DD/YYYY"
        ]).format("YYYY-MM-DD")
      : null;

    if (!bookingDate) {
      return res.status(400).json({
        message: "Invalid date format",
        isSuccessfull: false
      });
    }

    // Create booking
    const booking = new Booking({
      staffId,
      familyMemberId,
      diagnosticId,
      serviceType,
      date: bookingDate,
      timeSlot,
      cartId: staffCart._id,
      totalPrice,
      couponCode: staffCart.couponCode || null,
      discount: staffCart.discount || 0,
      payableAmount,
      status: "Confirmed",
      diagnosticBookingId,
      transactionId: transactionId || null,
      paymentStatus,
      paymentDetails,
      isSuccessfull: true,
      addressId: serviceType === "Home Collection" ? addressId : null // Add addressId condition
    });

    const savedBooking = await booking.save();

    // Mark diagnostic slot as booked
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (diagnostic) {
      let updated = false;

      const updateSlots = (slots) =>
        slots.map(slot => {
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

      if (serviceType === "Home Collection") {
        diagnostic.homeCollectionSlots = updateSlots(diagnostic.homeCollectionSlots);
      } else if (serviceType === "Center Visit") {
        diagnostic.centerVisitSlots = updateSlots(diagnostic.centerVisitSlots);
      }

      if (updated) await diagnostic.save();
    }

    // Notification
    staff.notifications.push({
      title: "Diagnostics Booking Confirmed",
      message: `Your diagnostic booking for ${bookingDate} at ${timeSlot} has been confirmed.`,
      timestamp: new Date(),
      bookingId: savedBooking._id,
    });
    await staff.save();

    // Email
    const mailOptions = {
      from: `"Credent Health" <${process.env.EMAIL}>`,
      to: staff.email,
      subject: "Your Diagnostics Booking is Confirmed",
      html: `
        <h2>Diagnostics Booking Confirmed</h2>
        <p>Hello ${staff.name},</p>
        <p>Your diagnostic booking has been successfully confirmed.</p>
        <p><strong>Booking ID:</strong> ${diagnosticBookingId}</p>
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
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    return res.status(201).json({
      message: "Booking created successfully.",
      isSuccessfull: true,
      diagnosticBookingId,
      walletUsed,
      onlinePaymentUsed,
      walletBalance: staff.wallet_balance,
      forTestsBalance: staff.forTests,
      booking: savedBooking,
    });

  } catch (err) {
    console.error("Error creating booking:", err);
    res.status(500).json({
      message: "Server error",
      isSuccessfull: false,
      error: err.message
    });
  }
};

export const myBookings = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    const bookings = await Booking.find({ staffId })
      .populate("diagnosticId", "name distance image address homeCollection centerVisit description doctorConsultationBookingId diagnosticBookingId")
      .populate("cartId")
      .populate("packageId", "name price description totalTestsIncluded")
      .populate("doctorId", "name email image specialization qualification address")
      .lean();

    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        // ✅ Validate and format date
        let formattedDate = null;
        let bookingDateTime = null;

        if (booking.date) {
          const dateObj = new Date(booking.date);
          if (!isNaN(dateObj)) {
            formattedDate = dateObj.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            bookingDateTime = new Date(dateObj); // Start with valid date
          }
        }

        // ✅ Parse timeSlot if valid
        if (bookingDateTime && booking.timeSlot) {
          try {
            const [time, modifier] = booking.timeSlot.split(" ");
            let [hours, minutes] = time.split(":").map(Number);

            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;

            bookingDateTime.setHours(hours);
            bookingDateTime.setMinutes(minutes);
            bookingDateTime.setSeconds(0);
          } catch (err) {
            console.warn("⚠️ Invalid timeSlot format:", booking.timeSlot);
          }
        }

        // ✅ Reminder logic only if bookingDateTime is valid
        const now = new Date();
        let notifyMsg = null;

        if (bookingDateTime && !isNaN(bookingDateTime)) {
          const diffInMs = bookingDateTime - now;
          const diffInHours = diffInMs / (1000 * 60 * 60);
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

          if (diffInDays <= 1 && diffInDays > 0.9) {
            notifyMsg = `Reminder: You have a booking tomorrow at ${booking.timeSlot}`;
          } else if (diffInHours <= 2 && diffInHours > 1.5) {
            notifyMsg = `Reminder: You have a booking in 2 hours at ${booking.timeSlot}`;
          } else if (diffInHours <= 1 && diffInHours > 0.5) {
            notifyMsg = `Reminder: You have a booking in 1 hour at ${booking.timeSlot}`;
          }
        }

        const alreadyNotified = staff.notifications?.some(
          (n) =>
            n.bookingId?.toString() === booking._id.toString() &&
            n.message === notifyMsg
        );

        if (notifyMsg && !alreadyNotified) {
          staff.notifications.push({
            title: "Booking Reminder",
            message: notifyMsg,
            timestamp: new Date(),
            bookingId: booking._id,
          });
        }

        // ✅ Family member
        const familyMember = staff.family_members?.find(
          (member) =>
            member._id.toString() === booking.familyMemberId?.toString()
        );

        // ✅ Populate cart items
        const populatedItems = booking.cartId?.items?.length
          ? await Promise.all(
            booking.cartId.items.map(async (item) => {
              let details = null;
              if (item.type === "xray") {
                details = await Xray.findById(item.itemId).lean();
              } else if (item.type === "test") {
                details = await Test.findById(item.itemId).lean();
              }
              return { ...item, itemDetails: details || null };
            })
          )
          : [];

        return {
          bookingId: booking._id,
          serviceType: booking.serviceType || "",
          type: booking.type || "",
          meetingLink: booking.meetingLink || null,
          bookedSlot: booking.bookedSlot
            ? {
              ...booking.bookedSlot,
              date: booking.bookedSlot.date
                ? new Date(booking.bookedSlot.date).toISOString().split('T')[0]
                : null,
            }
            : null,
          status: booking.status,
          date: formattedDate || null,
          timeSlot: booking.timeSlot,
          totalPrice: booking.totalPrice,
          discount: booking.discount,
          payableAmount: booking.payableAmount,
          doctorConsultationBookingId: booking.doctorConsultationBookingId || null,
          diagnosticBookingId: booking.diagnosticBookingId || null,

          diagnostic: booking.diagnosticId
            ? {
              name: booking.diagnosticId.name,
              description: booking.diagnosticId.description,
              image: booking.diagnosticId.image,
              distance: booking.diagnosticId.distance,
              homeCollection: booking.diagnosticId.homeCollection,
              centerVisit: booking.diagnosticId.centerVisit,
              address: booking.diagnosticId.address,
            }
            : null,

          package: booking.packageId || null,

          patient: familyMember
            ? {
              name: familyMember.fullName,
              age: familyMember.age,
              gender: familyMember.gender,
              relation: familyMember.relation,
            }
            : null,

          doctor: booking.doctorId
            ? {
              name: booking.doctorId.name,
              email: booking.doctorId.email,
              image: booking.doctorId.image,
              specialization: booking.doctorId.specialization,
              qualification: booking.doctorId.qualification,
              address: booking.doctorId.address,
            }
            : null,

          staff: {
            name: staff.name,
            email: staff.email,
            contact_number: staff.contact_number,
          },

          cartItems: populatedItems,
          reportFile: booking.report_file || null,
          diagPrescription: booking.diagPrescription || null,
          doctorReports: booking.doctorReports || [],
          doctorPrescriptions: booking.doctorPrescriptions || [],
        };
      })
    );

    // Save staff if new notifications added
    await staff.save();

    res.status(200).json({
      success: true,
      bookings: populatedBookings,
    });
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};




export const getStaffNotifications = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId).select("notifications");

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    res.status(200).json({ success: true, notifications: staff.notifications });
  } catch (error) {
    console.error("❌ Error in getStaffNotifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};






export const downloadReport = async (req, res) => {
  try {
    const { staffId, bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, staffId })
      .populate("diagnosticId", "name distance image address")
      .populate("familyMemberId", "name relation age gender DOB")
      .populate("cartId")
      .populate("packageId")
      .populate("doctorId", "name specialization qualification address")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.cartId?.items?.length) {
      booking.cartId.items = await Promise.all(
        booking.cartId.items.map(async (item) => {
          let details = null;
          if (item.type === "xray") {
            details = await Xray.findById(item.itemId).lean();
          } else if (item.type === "test") {
            details = await Test.findById(item.itemId).lean();
          }
          return { ...item, itemDetails: details };
        })
      );
    }


    const staff = await Staff.findById(staffId).lean();




    const packageDetails = booking.packageId
      ? await Package.findById(booking.packageId._id).lean()
      : null;

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=booking_report_${bookingId}.pdf`,
        "Content-Length": pdfData.length,
      });
      res.send(pdfData);
    });

    // ----------- PDF Content Starts -----------

    doc.fontSize(20).fillColor("#007860").text("Medical Report", { align: "center" });
    doc.moveDown(1.5);

    // Booking Info
    doc.fontSize(14).fillColor("black").text("Booking Information", { underline: true });
    doc.fontSize(12).text(`Booking ID: ${booking._id}`);
    doc.text(`Date: ${booking.date}`);
    doc.text(`Time Slot: ${booking.timeSlot}`);
    doc.text(`Service Type: ${booking.serviceType || "N/A"}`);
    doc.text(`Status: ${booking.status}`);
    doc.moveDown();

    // If Online booking
    if (booking.type === "Online" && booking.meetingLink) {
      doc.fontSize(14).text("Online Consultation", { underline: true });
      doc.fontSize(12).text(`Meeting Link: ${booking.meetingLink}`);
      if (booking.doctorId) {
        doc.text(`Doctor Name: ${booking.doctorId.name}`);
        doc.text(`Specialization: ${booking.doctorId.specialization}`);
        doc.text(`Qualification: ${booking.doctorId.qualification}`);
        doc.text(`Address: ${booking.doctorId.address}`);
      }
      doc.moveDown();
    }

    // Staff Info
    if (staff) {
      doc.fontSize(14).text("Staff Information", { underline: true });
      doc.fontSize(12).text(`Name: ${staff.name || "N/A"}`);
      doc.text(`Email: ${staff.email || "N/A"}`);
      doc.text(`Contact Number: ${staff.contact_number || "N/A"}`);
      doc.text(`Staff ID: ${staff._id}`);
      doc.moveDown();
    }


    // Family Member Info
    doc.fontSize(14).text("Patient Details", { underline: true });
    doc.fontSize(12).text(`Name: ${booking.familyMemberId?.fullName || "N/A"}`);
    doc.text(`DOB: ${moment(booking.familyMemberId?.DOB).format("DD MMM YYYY")}`);
    doc.moveDown();

    // Diagnostic Info
    if (booking.diagnosticId) {
      doc.fontSize(14).text("Diagnostic Center", { underline: true });
      doc.fontSize(12).text(`Name: ${booking.diagnosticId?.name || "N/A"}`);
      doc.text(`Distance: ${booking.diagnosticId?.distance || "N/A"} km`);
      doc.text(`Address: ${booking.diagnosticId?.address || "N/A"}`);
      doc.moveDown();
    }

    // Package Info
    if (packageDetails) {
      doc.fontSize(14).text("Package Details", { underline: true });
      doc.fontSize(12).text(`Package Name: ${packageDetails.name}`);
      doc.text(`Description: ${packageDetails.description}`);
      doc.text(`Doctor Info: ${packageDetails.doctorInfo || "N/A"}`);
      doc.text(`Price: ₹${packageDetails.price}`);
      doc.text(`Offer Price: ₹${packageDetails.offerPrice || packageDetails.price}`);
      doc.text(`Total Tests Included: ${packageDetails.totalTestsIncluded}`);
      doc.moveDown();

      doc.fontSize(13).text("Included Tests:", { underline: true });
      packageDetails.includedTests.forEach((test, idx) => {
        doc.fontSize(12).text(`${idx + 1}. ${test.name} (${test.subTestCount} tests)`);
        test.subTests.forEach((sub) => {
          doc.fontSize(11).fillColor("gray").text(`   • ${sub}`);
        });
        doc.moveDown(0.5);
      });
    }

    // Tests / X-rays Info
    if (booking.cartId?.items?.length) {
      doc.moveDown();
      doc.fontSize(14).fillColor("black").text("Tests/X-rays Added", { underline: true });
      booking.cartId.items.forEach((item, i) => {
        doc.fontSize(12).fillColor("black").text(`${i + 1}. ${item.itemDetails?.name || "N/A"} (${item.type})`);
      });
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor("gray").text("© Creden Health System", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("❌ Error generating PDF:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};




// 📧 Email transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL, // "credenthealth@gmail.com"
//     pass: process.env.PASS   // "wgsvkqhgidzgnpna" (App password)
//   }
// });

export const createPackageBooking = async (req, res) => {
  try {
    const { staffId } = req.params;
    let {
      familyMemberId,
      diagnosticId,
      packageId,
      serviceType,
      date,
      timeSlot,
      transactionId,
      addressId // Added addressId field
    } = req.body;

    // 🛠 Convert "null" string to actual null
    if (timeSlot === "null") timeSlot = null;
    if (transactionId === "null") transactionId = null;

    // 🛠 Validate service type
    if (!["Home Collection", "Center Visit"].includes(serviceType)) {
      return res.status(400).json({ message: "Invalid service type", isSuccessfull: false });
    }

    // 🛠 Fetch staff and package
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({ message: "Staff not found", isSuccessfull: false });

    const packageData = await Package.findById(packageId);
    if (!packageData) return res.status(404).json({ message: "Package not found", isSuccessfull: false });

    // 💰 Payment calculation
    const payableAmount = packageData.offerPrice || packageData.price;
    const availablePackageBalance = staff.forPackages || 0;

    let walletUsed = 0;
    let onlinePaymentUsed = 0;
    let paymentStatus = null;
    let paymentDetails = null;

    if (availablePackageBalance >= payableAmount) {
      walletUsed = payableAmount;
      staff.wallet_balance -= walletUsed;
      staff.forPackages -= walletUsed;
    } else {
      walletUsed = availablePackageBalance;
      onlinePaymentUsed = payableAmount - walletUsed;
      staff.wallet_balance -= walletUsed;
      staff.forPackages = 0;

      if (!transactionId) {
        return res.status(402).json({
          message: "Insufficient wallet balance. Please provide transactionId for online payment.",
          isSuccessfull: false,
          walletAvailable: availablePackageBalance,
          requiredOnline: onlinePaymentUsed,
        });
      }

      let paymentInfo = await razorpay.payments.fetch(transactionId);
      if (!paymentInfo) return res.status(404).json({ message: "Payment not found", isSuccessfull: false });

      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(transactionId, onlinePaymentUsed * 100, "INR");
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          return res.status(500).json({
            message: "Payment capture failed",
            isSuccessfull: false,
            error: err.message,
          });
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

    // 🛠 Wallet log
    if (walletUsed > 0) {
      staff.wallet_logs.push({
        type: "debit",
        forDoctors: 0,
        forTests: 0,
        forPackages: walletUsed,
        totalAmount: walletUsed,
        from: "Package Booking",
        date: new Date(),
      });
    }
    await staff.save();

    // 📅 Flexible Date Handling
    let formattedDate;
    if (date.includes("/")) {
      const parts = date.split("/");
      if (parts[0].length === 4) {
        formattedDate = moment(`${parts[0]}-${parts[1]}-${parts[2]}`).format("YYYY-MM-DD");
      } else {
        formattedDate = moment(`${parts[2]}-${parts[1]}-${parts[0]}`).format("YYYY-MM-DD");
      }
    } else {
      formattedDate = moment(date).format("YYYY-MM-DD");
    }

    // 🔢 Unique Booking IDs
    const packageBookingId = await generatePackageBookingId();
    const diagnosticBookingId = await generateDiagnosticBookingId();

    // 💾 Save booking
    const booking = new Booking({
      staffId,
      familyMemberId,
      diagnosticId,
      packageId,
      serviceType,
      date: formattedDate,
      timeSlot,
      totalPrice: payableAmount,
      discount: 0,
      payableAmount,
      status: "Confirmed",
      transactionId,
      paymentStatus,
      paymentDetails,
      isSuccessfull: true,
      packageBookingId,
      diagnosticBookingId,
       addressId: serviceType === "Home Collection" ? addressId : null // Add addressId condition
    });

    const savedBooking = await booking.save();

    // 🕒 Update slot booking
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (diagnostic) {
      let updated = false;
      if (serviceType === "Home Collection") {
        diagnostic.homeCollectionSlots = diagnostic.homeCollectionSlots.map(slot => {
          if (slot.date === formattedDate && slot.timeSlot === timeSlot && !slot.isBooked) {
            slot.isBooked = true;
            updated = true;
          }
          return slot;
        });
      } else {
        diagnostic.centerVisitSlots = diagnostic.centerVisitSlots.map(slot => {
          if (slot.date === formattedDate && slot.timeSlot === timeSlot && !slot.isBooked) {
            slot.isBooked = true;
            updated = true;
          }
          return slot;
        });
      }
      if (updated) await diagnostic.save();
    }

    // 🔔 Notify staff
    staff.notifications.push({
      title: "Package Booking Confirmed",
      message: `Your package booking for ${formattedDate} at ${timeSlot || "N/A"} has been confirmed.`,
      timestamp: new Date(),
      bookingId: savedBooking._id,
    });
    await staff.save();

    // 📧 Send Email
    transporter.sendMail({
      from: `"Credent Health" <${process.env.EMAIL}>`,
      to: staff.email,
      subject: "Your Package Booking is Confirmed",
      html: `
        <h2>Package Booking Confirmed</h2>
        <p>Hello ${staff.name},</p>
        <p>Your booking for <strong>${packageData.name}</strong> is confirmed.</p>
        <p><strong>Booking ID:</strong> ${packageBookingId}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${timeSlot || "N/A"}</p>
        <p><strong>Service Type:</strong> ${serviceType}</p>
        <p><strong>Amount Paid:</strong> ₹${payableAmount}</p>
      `
    }, (error) => {
      if (error) console.error("Email send failed:", error);
    });

    // ✅ Success Response
    return res.status(201).json({
      message: "Package booking created successfully.",
      isSuccessfull: true,
      walletUsed,
      onlinePaymentUsed,
      remainingWalletBalance: staff.wallet_balance,
      forPackagesBalance: staff.forPackages,
      packageBookingId,
      booking: savedBooking,
    });

  } catch (err) {
    console.error("Error creating package booking:", err);
    res.status(500).json({ message: "Server error", isSuccessfull: false, error: err.message });
  }
};

export const getSingleBooking = async (req, res) => {
  try {
    const { staffId, bookingId } = req.params;

    // Step 1: Get staff with family members
    const staff = await Staff.findById(staffId).lean();
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    // Step 2: Find the booking
    const booking = await Booking.findOne({ staffId, _id: bookingId })
      .populate("diagnosticId", "name distance image")
      .populate("cartId")
      .populate("packageId", "name price description totalTestsIncluded")
      .populate("doctorId", "name specialization qualification address")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Step 3: Resolve family member from embedded array
    const familyMember = staff.family_members.find(member =>
      member._id.toString() === booking.familyMemberId?.toString()
    );
    booking.familyMember = familyMember || null;

    // Step 4: Manually populate cart item details
    if (booking.cartId?.items?.length) {
      booking.cartId.items = await Promise.all(
        booking.cartId.items.map(async (item) => {
          let itemDetails = null;
          if (item.type === "xray") {
            itemDetails = await Xray.findById(item.itemId).lean();
          } else if (item.type === "test") {
            itemDetails = await Test.findById(item.itemId).lean();
          }
          return { ...item, itemDetails };
        })
      );
    }

    // ✅ Include doctorReports and doctorPrescriptions for frontend
    booking.doctor_reports = booking.doctorReports || [];
    booking.doctor_prescriptions = booking.doctorPrescriptions || [];

    // ✅ Include diagPrescription for frontend
    booking.diagPrescription = booking.diagPrescription || null;

    // Optional: Keep legacy field for compatibility
    booking.reportFile = booking.report_file || null;

    res.status(200).json({ success: true, booking });

  } catch (err) {
    console.error("❌ Error fetching booking:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { staffId, bookingId } = req.params;
    const { status } = req.body;

    // Ensure the provided status is 'Cancelled'
    if (status !== "Cancelled") {
      return res.status(400).json({ message: "Invalid status. Only 'Cancelled' status is allowed." });
    }

    // Find the booking by staffId and bookingId
    const booking = await Booking.findOne({ staffId, _id: bookingId });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update the status of the booking to 'Cancelled'
    booking.status = "Cancelled";

    // Save the updated booking
    const updatedBooking = await booking.save();

    res.status(200).json({
      message: "Booking successfully cancelled.",
      booking: updatedBooking
    });
  } catch (err) {
    console.error("❌ Error cancelling booking:", err);
    res.status(500).json({ message: "Server error" });
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




// 🟢 Daily.co Room Creation Function
const createDailyMeetingRoom = async () => {
  try {
    const response = await axios.post(
      "https://api.daily.co/v1/rooms",
      {
        properties: {
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.url;
  } catch (error) {
    console.error("❌ Failed to create Daily.co room:", error.message);
    return null;
  }
};




const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});


export const createDoctorConsultationBooking = async (req, res) => {
  try {
    const { staffId } = req.params;
    const {
      doctorId,
      day,
      date, // Expecting "YYYY-MM-DD" from frontend
      timeSlot,
      familyMemberId,
      type,
      transactionId
    } = req.body;

    if (!["Online", "Offline"].includes(type)) {
      return res.status(400).json({
        message: "Consultation type must be 'Online' or 'Offline'",
        isSuccessfull: false,
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD.",
        isSuccessfull: false,
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
        isSuccessfull: false,
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found",
        isSuccessfull: false,
      });
    }

    const consultationFee = doctor.consultation_fee;
    if (!consultationFee || consultationFee <= 0) {
      return res.status(400).json({
        message: "Invalid consultation fee",
        isSuccessfull: false,
      });
    }

    const availableDoctorBalance = staff.forDoctors || 0;

    let walletUsed = 0;
    let onlinePaymentUsed = 0;
    let paymentStatus = null;
    let paymentDetails = null;

    // ✅ Use wallet first
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
          isSuccessfull: false,
          walletAvailable: availableDoctorBalance,
          requiredOnline: onlinePaymentUsed,
        });
      }

      // ✅ Razorpay payment capture
      let paymentInfo = await razorpay.payments.fetch(transactionId);
      if (!paymentInfo) {
        return res.status(404).json({
          message: "Payment not found",
          isSuccessfull: false,
        });
      }

      if (paymentInfo.status === "authorized") {
        try {
          await razorpay.payments.capture(transactionId, onlinePaymentUsed * 100, "INR");
          paymentInfo = await razorpay.payments.fetch(transactionId);
        } catch (err) {
          console.error("❌ Razorpay capture failed:", err);
          return res.status(500).json({
            message: "Payment capture failed",
            isSuccessfull: false,
          });
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

    // ✅ Wallet logs
    if (walletUsed > 0) {
      staff.wallet_logs.push({
        type: "debit",
        forDoctors: walletUsed,
        forTests: 0,
        forPackages: 0,
        totalAmount: walletUsed,
        from: "Doctor Consultation",
        date: new Date(),
      });
    }

    await staff.save();

    // ✅ Generate Google Meet link (dummy for now)
    let meetingLink = null;
    if (type === "Online") {
      meetingLink = "";  // <-- Set empty string instead of generating link
    }

    // Persistent Booking ID
    let counter = await Counter.findOneAndUpdate(
      { name: "doctorConsultationBooking" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const formattedBookingId = `DoctorBookingId_${String(counter.value).padStart(4, '0')}`;

    // ✅ Create booking
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
      isSuccessfull: true
    });

    const savedBooking = await booking.save();

    // ✅ Add notification to staff
    staff.notifications.push({
      title: "Doctor Consultation Booked",
      message: `Your consultation with Dr. ${doctor.name} is confirmed for ${date} at ${timeSlot}.`,
      timestamp: new Date(),
      bookingId: savedBooking._id,
    });

    await staff.save();

    // ✅ Mark the booked slot as isBooked: true
    let updated = false;

    if (type === "Online") {
      doctor.onlineSlots = doctor.onlineSlots.map(slot => {
        if (slot.day === day && slot.date === date && slot.timeSlot === timeSlot && !slot.isBooked) {
          slot.isBooked = true;
          updated = true;
        }
        return slot;
      });
    } else if (type === "Offline") {
      doctor.offlineSlots = doctor.offlineSlots.map(slot => {
        if (slot.day === day && slot.date === date && slot.timeSlot === timeSlot && !slot.isBooked) {
          slot.isBooked = true;
          updated = true;
        }
        return slot;
      });
    }

    if (updated) {
      await doctor.save();
    }



    // ✅ Send email to staff
    const mailOptions = {
      from: `"Credent Health" <${process.env.EMAIL}>`,
      to: staff.email,
      subject: "Your Doctor Consultation is Confirmed",
      html: `
        <h2>Consultation Booking Confirmed</h2>
        <p>Hello ${staff.name},</p>
        <p>Your consultation with <strong>Dr. ${doctor.name}</strong> has been successfully booked.</p>
        <p><strong>Booking ID:</strong> ${formattedBookingId}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time Slot:</strong> ${timeSlot}</p>
        <p><strong>Consultation Type:</strong> ${type}</p>
        <p><strong>Meeting Link:</strong> ${meetingLink || "N/A"}</p>
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


    // ✅ Send response with clean date format
    res.status(201).json({
      success: true,
      message: "Doctor consultation booked successfully.",
      isSuccessfull: true,
      doctorConsultationBookingId: formattedBookingId,
      walletUsed,
      onlinePaymentUsed,
      remainingForDoctorsBalance: staff.forDoctors,
      walletBalance: staff.wallet_balance,
      booking: {
        ...savedBooking._doc,
        date: parsedDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
        bookedSlot: {
          ...savedBooking.bookedSlot,
          date: parsedDate.toISOString().split("T")[0]
        }
      },
      meetingLink,
    });

  } catch (error) {
    console.error("❌ Error in booking:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      isSuccessfull: false,
    });
  }
};




export const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const staff = await Staff.findOne({ email });

    if (!staff) {
      return res.status(404).json({ message: 'No staff found with this email' });
    }

    // Respond with basic info (not sensitive), or just success message
    res.status(200).json({
      message: 'Email verified successfully',
      staffId: staff._id, // send to frontend to use in next step
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};




export const resetPassword = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Save password as plain text (not secure)
    staff.password = newPassword;
    await staff.save();

    res.status(200).json({ message: 'Password reset successfully (no hashing used)' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



export const submitHraAnswers = async (req, res) => {
  try {
    const { staffId, answers } = req.body;

    if (!staffId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "❗ Staff ID and answers are required." });
    }

    // Fetch all HRA categories once
    const hraCategories = await Hra.find();

    // Map category name -> prescribed message
    const prescribedMap = {};
    hraCategories.forEach(cat => {
      prescribedMap[cat.hraName] = cat.prescribed || '';
    });

    // Accumulate points per category
    const categoryPoints = {};

    let totalPoints = 0;

    for (const { questionId, selectedOption } of answers) {
      const question = await HraQuestion.findById(questionId);
      if (!question) continue;

      const selected = question.options.find(opt => opt._id.toString() === selectedOption);
      if (!selected) continue;

      const points = selected.point || 0;
      totalPoints += points;

      const categoryName = question.hraCategoryName || "Uncategorized";

      if (!categoryPoints[categoryName]) {
        categoryPoints[categoryName] = 0;
      }
      categoryPoints[categoryName] += points;
    }

    // Determine overall risk level with new ranges
    let riskLevel = "Low";
    let riskMessage = "🎉 Congratulations! You are maintaining a healthy lifestyle. Keep it up!";

    if (totalPoints >= 50 && totalPoints <= 75) {
      riskLevel = "Moderate";
      riskMessage = "👍 Good job! But there’s room for improvement. Pay attention to your habits.";
    } else if (totalPoints < 50) {
      riskLevel = "High";
      riskMessage = "⚠️ Your score indicates a high heart risk. Please consult a health professional.";
    }

    // Prepare prescribed messages for categories with score <= 5
    const prescribedForCategories = {};
    for (const [category, points] of Object.entries(categoryPoints)) {
      if (points <= 5 && prescribedMap[category]) {
        prescribedForCategories[category] = prescribedMap[category];
        break;  // Only first one added, then exit
      }
    }

    return res.status(200).json({
      message: `🎯 Hurrah! You scored ${totalPoints} points.`,
      totalPoints,
      riskLevel,
      riskMessage,
      categoryPoints,
      prescribedForCategories
    });

  } catch (error) {
    console.error("❌ Error submitting HRA answers:", error);
    return res.status(500).json({
      message: "💥 Server error while processing answers.",
      error: error.message
    });
  }
};





export const sendMessage = async (req, res) => {
  chatFunction(req, res, async function (err) {
    if (err) {
      // Multer error (file size, type, etc)
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { staffId, doctorId } = req.params;
      const { message, senderType } = req.body;
      let filePath = null;

      if (req.file) {
        filePath = `/uploads/chats/${req.file.filename}`;
      }

      if ((!message || message.trim().length === 0) && !filePath) {
        return res.status(400).json({
          success: false,
          message: "Message or file must be provided.",
        });
      }

      const staff = await Staff.findById(staffId);
      const doctor = await Doctor.findById(doctorId);

      if (!staff || !doctor) {
        return res.status(404).json({
          success: false,
          message: "Either the staff or doctor does not exist.",
        });
      }

      const booking = await Booking.findOne({ staffId, doctorId });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "No booking found for this staff and doctor combination.",
        });
      }

      const consultationType = booking.type;
      const doctorStatus = doctor.isOnline ? "Online" : "Offline";

      // Determine sender/receiver based on senderType
      let senderId, receiverId;
      if (senderType === "staff") {
        senderId = staffId;
        receiverId = doctorId;
      } else if (senderType === "doctor") {
        senderId = doctorId;
        receiverId = staffId;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid senderType. Must be 'staff' or 'doctor'.",
        });
      }

      // Create new chat message with timestamp and optional file path
      const chat = new Chat({
        senderId,
        receiverId,
        message: message?.trim() || "",
        file: filePath,
        timestamp: new Date(),
      });

      const saved = await chat.save();

      const senderName = senderId === doctorId ? doctor.name : staff.name;
      const receiverName = receiverId === doctorId ? doctor.name : staff.name;

      // Emit message via Socket.IO with ISO timestamp string
      const io = req.app.get("io");
      const roomId = `${staffId}_${doctorId}`;

      if (io) {
        io.to(roomId).emit("receiveMessage", {
          ...saved.toObject(),
          timestamp: saved.timestamp.toISOString(),
          consultationType,
          doctorStatus,
          sender: senderName,
          receiver: receiverName,
          senderId,
          receiverId,
        });
      }

      // Send API response with ISO timestamp string
      res.status(201).json({
        success: true,
        chat: {
          ...saved.toObject(),
          timestamp: saved.timestamp.toISOString(),
          consultationType,
          doctorStatus,
          sender: senderName,
          receiver: receiverName,
          senderId,
          receiverId,
        },
      });

    } catch (error) {
      console.error("❌ Error sending message:", error);
      res.status(500).json({
        success: false,
        message: "Error sending message",
        error: error.message,
      });
    }
  });
};
export const getChatHistory = async (req, res) => {
  try {
    const { staffId, doctorId } = req.params;

    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(staffId) || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staffId or doctorId.',
      });
    }

    const staffObjectId = new mongoose.Types.ObjectId(staffId);
    const doctorObjectId = new mongoose.Types.ObjectId(doctorId);

    // Fetch all messages between staff and doctor
    const messages = await Chat.find({
      $or: [
        { senderId: staffObjectId, receiverId: doctorObjectId },
        { senderId: doctorObjectId, receiverId: staffObjectId },
      ],
    }).sort({ timestamp: 1 });

    if (!messages.length) {
      return res.status(404).json({
        success: false,
        message: 'No chat history found.',
      });
    }

    // Fetch names for mapping
    const [staff, doctor] = await Promise.all([
      Staff.findById(staffId),
      Doctor.findById(doctorId),
    ]);

    if (!staff || !doctor) {
      return res.status(404).json({
        success: false,
        message: 'Either the staff or doctor does not exist.',
      });
    }

    // Prepare formatted messages with ISO timestamps (frontend will format)
    const formattedMessages = messages.map((message) => {
      const isSenderStaff = String(message.senderId) === String(staffId);
      const isReceiverStaff = String(message.receiverId) === String(staffId);

      return {
        ...message.toObject(),
        timestamp: message.timestamp.toISOString(), // Send ISO format
        sender: isSenderStaff ? staff.name : doctor.name,
        receiver: isReceiverStaff ? staff.name : doctor.name,
      };
    });

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
    });

  } catch (error) {
    console.error('❌ Error fetching chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: error.message,
    });
  }
};




export const getDoctorsWithOnlineBookings = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Step 1: Find all online bookings for this staff
    const onlineBookings = await Booking.find({ staffId, type: 'Online' });

    if (!onlineBookings || onlineBookings.length === 0) {
      return res.status(404).json({ message: 'No doctors found with online consultation bookings for this staff.' });
    }

    // Step 2: Extract unique doctorIds
    const uniqueDoctorIds = [...new Set(onlineBookings.map(b => b.doctorId.toString()))];

    // Step 3: Fetch doctor details
    const doctors = await Doctor.find({ _id: { $in: uniqueDoctorIds } })
      .select('name image');

    // Step 4: Map doctor details with their latest booking slot
    const doctorsWithSlots = doctors.map(doctor => {
      // Find all bookings of this doctor
      const bookingsForDoctor = onlineBookings.filter(b => b.doctorId.toString() === doctor._id.toString());

      // Sort by createdAt to get latest
      const latestBooking = bookingsForDoctor.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      return {
        _id: doctor._id,
        name: doctor.name,
        image: doctor.image,
        bookingSlot: {
          timeSlot: latestBooking.bookedSlot?.timeSlot || latestBooking.timeSlot || '',
          date: latestBooking.bookedSlot?.date
            ? moment(latestBooking.bookedSlot.date).format('DD-MM-YYYY')
            : moment(latestBooking.date).format('DD-MM-YYYY')
        }
      };
    });

    res.status(200).json({
      message: `${doctorsWithSlots.length} doctor(s) found with online consultations.`,
      doctors: doctorsWithSlots
    });

  } catch (err) {
    console.error("❌ Error fetching doctors with online bookings:", err);
    res.status(500).json({ message: "An unexpected error occurred while fetching the doctors. Please try again later." });
  }
};


// Controller to redeem coins and add them to wallet_balance
export const redeemStaffCoins = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    const totalCoins = staff.totalCoins || 0;

    if (totalCoins <= 0) {
      return res.status(400).json({ message: 'No coins available for redemption' });
    }

    // Add coins to wallet balance and reset totalCoins
    staff.wallet_balance = (staff.wallet_balance || 0) + totalCoins;
    staff.totalCoins = 0;

    await staff.save();

    res.status(200).json({
      message: 'Coins redeemed successfully',
      wallet_balance: staff.wallet_balance,
      redeemedCoins: totalCoins,
    });
  } catch (error) {
    console.error('Error redeeming coins:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// Controller to get most recent confirmed doctor booking for a staff
export const getRecentDoctorBooking = async (req, res) => {
  try {
    const { staffId } = req.params;

    const booking = await Booking.findOne({
      staffId,
      doctorId: { $exists: true, $ne: null },
      status: "Confirmed"
    })
      .sort({ createdAt: -1 })
      .populate("doctorId", "name specialization qualification image")
      .populate("familyMemberId", "name relation age gender")
      .populate("staffId", "name email contact_number"); // 🧩 populate staff details

    if (!booking) {
      return res.status(404).json({ message: "No recent doctor booking found for this staff." });
    }

    const { name, email, contact_number } = booking.staffId || {};

    res.status(200).json({
      message: "Recent doctor booking retrieved successfully",
      staff: {
        name,
        email,
        contact_number
      },
      booking
    });
  } catch (error) {
    console.error("Error fetching recent doctor booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Controller to get most recent confirmed package booking for a staff
export const getRecentPackageBooking = async (req, res) => {
  try {
    const { staffId } = req.params;

    const booking = await Booking.findOne({
      staffId,
      packageId: { $exists: true, $ne: null },
      status: "Confirmed"
    })
      .sort({ createdAt: -1 })
      .populate("packageId", "name description price doctorInfo totalTestsIncluded includedTests");

    if (!booking) {
      return res.status(404).json({ message: "No recent package booking found for this staff." });
    }

    res.status(200).json({
      message: "Recent package booking retrieved successfully",
      package: booking.packageId
    });
  } catch (error) {
    console.error("Error fetching recent package booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getSlotsByDiagnosticId = async (req, res) => {
  try {
    const { diagnosticId } = req.params;
    const { date, type } = req.query; // Expecting ?date=YYYY-MM-DD&type=Home Collection|Center Visit

    if (!diagnosticId) {
      return res.status(400).json({ message: "Diagnostic ID is required in params" });
    }

    if (!date) {
      return res.status(400).json({ message: "Date is required in query params" });
    }

    const parsedDate = moment(date, [
      "YYYY/MM/DD", "DD/MM/YYYY", "YYYY-MM-DD", "MMMM DD, YYYY", "DD MMMM YYYY"
    ], true);

    if (!parsedDate.isValid()) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    const formattedDate = parsedDate.format("YYYY-MM-DD");

    const diagnostic = await Diagnostic.findById(diagnosticId).select("homeCollectionSlots centerVisitSlots");
    if (!diagnostic) {
      return res.status(404).json({ message: "Diagnostic center not found" });
    }

    // IST current time
    const now = moment.tz("Asia/Kolkata");

    // Function to process slots and filter out expired ones
    const processSlots = (slotsArray) => {
      return (slotsArray || [])
        .filter(slot => slot.date === formattedDate)
        .filter(slot => {
          const slotDateTime = moment.tz(
            `${slot.date} ${slot.timeSlot}`,
            ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'YYYY-MM-DD h:mm A'],
            "Asia/Kolkata"
          );
          return slotDateTime.isValid() && slotDateTime.isSameOrAfter(now);
        })
        .map(slotDoc => {
          const slot = slotDoc.toObject(); // remove mongoose metadata

          return {
            _id: slot._id,
            day: slot.day,
            date: slot.date,
            timeSlot: slot.timeSlot,
            isBooked: slot.isBooked
          };
        });
    };

    const processedHomeSlots = processSlots(diagnostic.homeCollectionSlots);
    const processedCenterSlots = processSlots(diagnostic.centerVisitSlots);

    if (type === "Home Collection") {
      if (processedHomeSlots.length === 0) {
        return res.status(404).json({ message: "No valid Home Collection slots found for the given date" });
      }
      return res.status(200).json({
        message: "Home collection slots fetched successfully",
        slots: processedHomeSlots,
      });
    } else if (type === "Center Visit") {
      if (processedCenterSlots.length === 0) {
        return res.status(404).json({ message: "No valid Center Visit slots found for the given date" });
      }
      return res.status(200).json({
        message: "Center visit slots fetched successfully",
        slots: processedCenterSlots,
      });
    }

    // For no type or both types combined
    const combinedSlots = [...processedHomeSlots, ...processedCenterSlots];
    if (combinedSlots.length === 0) {
      return res.status(404).json({ message: "No valid slots found for the given date" });
    }

    return res.status(200).json({
      message: "Slots fetched successfully",
      homeCollectionSlots: processedHomeSlots,
      centerVisitSlots: processedCenterSlots,
    });

  } catch (error) {
    console.error("❌ Error fetching diagnostic slots:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


export const getHraByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Fetch staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Get all HRAs
    let hras = await Hra.find();

    // Filter out "Women’s Health" if staff is male
    if (staff.gender === "Male") {
      hras = hras.filter(hra => hra.hraName !== "Women’s Health");
    }

    if (!hras.length) {
      return res.status(404).json({ message: "No HRAs found" });
    }

    return res.status(200).json({
      message: "HRAs fetched successfully",
      hras
    });
  } catch (error) {
    console.error("Error fetching HRAs:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
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

    // 📅 Parse and format date in IST
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

    // ✅ Filter + add isExpired based on IST
    const filteredSlots = (slots || [])
      .filter(slot => slot.date === formattedDate)
      .map(slotDoc => {
        const slot = typeof slotDoc.toObject === "function" ? slotDoc.toObject() : slotDoc;

        const slotDateTime = moment.tz(`${slot.date} ${slot.timeSlot}`, [
          "YYYY-MM-DD HH:mm",
          "YYYY-MM-DD H:mm",
          "YYYY-MM-DD h:mm A"
        ], "Asia/Kolkata");

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






// ✅ Step 1: Request to delete account
export const deleteAccount = async (req, res) => {
  const { email, reason } = req.body;

  if (!email || !reason) {
    return res.status(400).json({ message: "Email and reason are required" });
  }

  try {
    const user = await Staff.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString("hex");
    const deleteLink = `${process.env.BASE_URL}/confirm-delete-account/${token}`;

    // Save token & expiry
    user.deleteToken = token;
    user.deleteTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Account Deletion Request Received",
      text: `Hi ${user.name},

We have received your account deletion request. To confirm the deletion of your account, please click the link below:

${deleteLink}

Reason: ${reason}

If you have any questions or need further assistance, please contact us at contact.credenthealth@gmail.com.

Best regards,
Your Team`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message:
        "Account deletion request processed. Please check your email to confirm.",
      token
    });
  } catch (err) {
    console.error("Error in deleteAccount:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// ✅ Step 2: Confirm deletion via email link
export const confirmDeleteAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await Staff.findOne({
      deleteToken: token,
      deleteTokenExpiration: { $gt: Date.now() }
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired deletion token" });
    }

    await Staff.deleteOne({ _id: user._id });

    return res
      .status(200)
      .json({ message: "Your account has been successfully deleted." });
  } catch (err) {
    console.error("Error in confirmDeleteAccount:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};