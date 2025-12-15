import express from 'express';
import { getWalletBalance, 
    staffLogin, 
    bookAppointment, 
    processPayment,
    createFamilyMember,
    getFamilyMember,
    getAllFamilyMembers,
    updateFamilyMember,
    removeFamilyMember,
    uploadProfileImage,
    updateProfileImage,
    getMyProfile,
    createStaffAddress,
    getStaffAddresses,
    removeStaffAddress,
    submitIssue,
  updateIssueStatus,
  getStaffIssues,
  getDoctorAppointmentsForStaff,
  getAllDiagnosticBookingForStaff,
  getStaffTestPackageById,
  getAppointment,
  getPrescription,
  addDiagnosticTestsToStaff,
  getStaffPackages,
  submitAnswer,
  addOrUpdateStaffSteps,
  getStaffStepsHistory,
  updateStaffAddress,
  staffLogout,
  addToCart,
  getCart,
  removeFromCart,
  createBookingFromStaffCart,
  myBookings,
  createPackageBooking,
  getSingleBooking,
  cancelBooking,
  createDoctorConsultationBooking,
  verifyEmail,
  resetPassword,
  submitHraAnswers,
  sendMessage,
  getChatHistory,
  getDoctorsWithOnlineBookings,
  downloadReport,
  redeemStaffCoins,
  getRecentDoctorBooking,
  getRecentPackageBooking,
  getStaffNotifications,
  getSlotsByDiagnosticId,
  getHraByStaff,
  getDoctorSlotsByDate,
  getSingleStaffTestPackage,
  deleteAccount,
  confirmDeleteAccount,
  rescheduleDoctorConsultation,
  rescheduleDiagnosticBooking,
  reschedulePackageBooking,
  uploadDoctorReport,
  uploadDoctorPrescription,
  uploadBookingReport,
  uploadDiagnosticPrescription,
  handleUserMedicalUpload,
  deleteStaff,
  createSupportTicket,
  submitQustionAnswer,
  staffForgotPassword,
  getProfileStaff,
  editProfileStaff,
  changePasswordStaff,
  saveFcmToken,
  getStaffScans,
  getStaffTests,




 } from '../Controller/ControllerStaff.js';
import { uploadDiagnosticReport, uploadDiagPrescription, uploadHelpFile, uploadPrescriptionFile, uploadReportFile, uploadUserMedicalFile } from '../config/multerConfig.js';

const router = express.Router();

// Route for staff login
router.post('/login-staff', staffLogin);
router.post('/save-fcm-token', saveFcmToken);
router.post('/logout', staffLogout);
router.get('/wallet/:staffId', getWalletBalance);
router.post('/bookappoint', bookAppointment);
router.get('/getappoint/:staffId/:appointmentId', getAppointment);
router.post('/process-payment/:staffId/:appointmentId', processPayment);

// Routes for family members
router.post('/create-family/:staffId', createFamilyMember);
router.get('/get-singlefamilymem/:staffId/:familyMemberId', getFamilyMember);
router.get('/getallfamily/:staffId', getAllFamilyMembers);
router.put('/updatefamily/:staffId/:familyMemberId', updateFamilyMember);
router.delete('/removefamily/:staffId/:familyMemberId', removeFamilyMember);
router.post('/uploadProfileImage/:staffId', uploadProfileImage);
router.put('/updateProfileImage/:staffId', updateProfileImage);  // update existing
router.get('/getprofile/:staffId', getMyProfile);  // update existing
router.get('/staffprofile/:staffId', getProfileStaff);
router.put('/editprofile/:staffId', editProfileStaff);


// Route for creating a new address for a staff member
router.post('/create-address/:staffId', createStaffAddress);

// Route for fetching all addresses for a staff member
router.get('/getaddresses/:staffId', getStaffAddresses);

// Route for removing an address by addressId for a staff member
router.delete('/remove-address/:staffId/:addressId', removeStaffAddress);
router.put('/update-address/:staffId/:addressId', updateStaffAddress);


// 📥 Staff submits a new support issue (with file upload)
router.post('/submitissue/:staffId', submitIssue);

// 📄 Get all issues for a specific staff
router.get('/getissues/:staffId', getStaffIssues);

// 📤 Admin updates an issue's status or response
router.put('/updateissue/:staffId/:issueId', updateIssueStatus);

router.get('/getdoctorappointment/:staffId', getDoctorAppointmentsForStaff);  // update existing
router.get('/getalldiagbookings/:staffId', getAllDiagnosticBookingForStaff);  // update existing
router.get('/stafftestpackages/:staffId', getStaffTestPackageById);
router.get('/singlestafftestpackages/:staffId/:packageId', getSingleStaffTestPackage);
router.get('/getPrescription/:staffId', getPrescription);
router.post('/addpackages', addDiagnosticTestsToStaff);
router.get('/getpackage-test/:staffId', getStaffPackages);
router.get('/getscans/:staffId', getStaffScans);
router.get('/gettests/:staffId', getStaffTests);
router.post('/submit-hra/:staffId', submitAnswer);
router.post('/addsteps/:staffId', addOrUpdateStaffSteps); // POST: To add/update steps
router.get('/steps/:staffId', getStaffStepsHistory); // GET: To fetch staff's step history

router.post('/redeemcoins/:staffId', redeemStaffCoins);

router.post('/addcart/:userId', addToCart);

// Get user's cart
router.get('/mycart/:userId', getCart);

// Remove item from cart
router.delete('/deletecart/:userId', removeFromCart);


// POST /api/bookings/staff/:staffId
router.post("/create-bookings/:staffId", createBookingFromStaffCart);
router.get("/mybookings/:staffId", myBookings);
router.get("/notifications/:staffId", getStaffNotifications);
router.get("/single-booking/:staffId/:bookingId", getSingleBooking);
router.post("/package-bookings/:staffId", createPackageBooking);
router.put('/cancel-booking/:staffId/:bookingId', cancelBooking);

router.get("/diagnosticslots/:diagnosticId", getSlotsByDiagnosticId);


router.post("/consultationbooking/:staffId", createDoctorConsultationBooking);


router.post('/verify-email', verifyEmail);

router.post('/reset-password/:staffId', resetPassword);
router.post('/submit-hra-answers', submitHraAnswers);

//chats
router.post('/sendchat/:staffId/:doctorId', sendMessage);       // Optional REST POST
router.get('/getchat/:staffId/:doctorId', getChatHistory);     // Chat history
router.get('/getonlinebookingdoctors/:staffId', getDoctorsWithOnlineBookings);

// routes/reportRoutes.js
router.get('/download-report/:staffId/:bookingId', downloadReport);


router.get("/recent-doctor-booking/:staffId", getRecentDoctorBooking);
router.get("/recent-package-booking/:staffId", getRecentPackageBooking);
router.get('/allhracat/:staffId', getHraByStaff);
router.get("/doctor-slots/:doctorId", getDoctorSlotsByDate);
router.post('/deleteaccount', deleteAccount)
router.get('/confirm-delete-account/:token', confirmDeleteAccount);
router.put('/reschedulebooking/:staffId/:bookingId', rescheduleDoctorConsultation);
router.put("/diagreschedule/:staffId/:bookingId", rescheduleDiagnosticBooking);
router.put("/packagereschedule/:staffId/:bookingId", reschedulePackageBooking);
router.put('/upload-doctor-report/:staffId/:appointmentId',uploadReportFile,uploadDoctorReport);
router.put('/upload-doctor-prescription/:staffId/:appointmentId',uploadPrescriptionFile,uploadDoctorPrescription);
router.put("/upload-booking-report/:staffId/:bookingId",uploadBookingReport);
router.put("/upload-diagnostic-prescription/:staffId/:bookingId",uploadDiagnosticPrescription);
// Example route
router.put(
  '/userupload/:staffId',
  uploadUserMedicalFile, // middleware
  handleUserMedicalUpload
);

router.delete('/deleteaccount/:staffId', deleteStaff);
router.post('/support-ticket', uploadHelpFile, createSupportTicket);

router.post('/submit-questionanswer', submitQustionAnswer);

router.post('/forgot-password', staffForgotPassword);

router.put('/changepassword/:staffId', changePasswordStaff);






















export default router;
