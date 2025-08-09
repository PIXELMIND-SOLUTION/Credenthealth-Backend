import express from 'express';
import {
    signupAdmin,
    loginAdmin,
    getDoctorDetails,
    createStaffProfile,
    getDoctorTestsById,
    createDiagnosticDetails,
    updateDiagnosticDetails,
    deleteDiagnosticDetails,
    getAllDiagnostics,
    getDiagnosticById,
    addAmountToWallet,
    createDoctor,
    getAllDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
    getAllDiagnosticBookings,
    getAllDoctorAppointments,
    createCompany,
    getCompanies,
    getCompanyWithStaff,
    createCategory,
    getAllCategories,
    logoutAdmin,
    loginCompany,
    logoutCompany,
    updateBookingStatusByDiagnostic,
    getAcceptedDiagnosticBookings,
    getRejectedDiagnosticBookings,
    updateAppointmentStatus,
    getRejectedAppointments,
    getCounts,
    getCompanyById,
    getCompanyStaffStats,
    loginDoctor,
    logoutDoctor,
    getDoctorAppointments,
    getCompanyDiagnostics,
    loginDiagnostic,
    logoutDiagnostic,
    getBookingsByDiagnosticId,
    importCompaniesFromExcel,
    importStaffFromExcel,
    updateCompany,
    deleteCompany,
    editStaffProfile,
    deleteStaffProfile,
    deleteDiagnosticCenter,
    deleteBookingById,
    getDashboardCounts,
    addTestsToStaffByAgeGroup,
    submitSection,
    getAssessment,
    getSingleDiagnosticBooking,
    getSingleDoctorAppointment,
    getAllDoctorCategories,
    getAllDoctorsByFilter,
    getAllDoctorsFilter,
    getAdminById,
    updateAdminById,
    createTest,
    getAllTests,
    createPackage,
    getAllPackages,
    getSinglePackage,
    createXray,
    getAllXrays,
    getXrayById,
    createDiagnostic,
    uploadHraImage,
    getAllHra,
    createMultipleHraQuestions,
    getAllHraQuestions,
    getRecentDoctorDetails,
    getRecentPackage,
    getAllDiagnosticBookingsForAdmin,
    editCategory,
    deleteCategory,
    createBlog,
    updateDoctorAppointmentStatus,
    deleteDoctorAppointment,
    getAcceptedDoctorAppointments,
    getRejectedDoctorAppointments,
    getRejectedDiagnosticAppointments,
    getAcceptedDiagnosticAppointments,
    createDoctorConsultationBookingByAdmin,
    getAllStaff,
    uploadDoctorReport,
    uploadBookingReport,
    createPackageBookingByAdmin,
    updateHra,
    deleteHra,
    createTestName,
    getAllTestsName,
    updateTest,
    deleteTest,
    uploadDiagnosticPrescription,
    uploadDoctorPrescription,
    getCountries,
    getStates,
    getCities,
    deleteDiagnosticById,
    editDiagnosticById,
    getDoctorSlotsByDate,
    updatePackage,
    deletePackage,
    uploadCategoriesFromCSV,
    uploadCompaniesFromCSV,
    bulkUploadTestsFromCSV,
    bulkUploadTestsFromCSVForDiag,
    bulkUploadPackagesFromCSV,
    importXrayCSV,
    fetchImageEnabledCategories,
    updateDoctors,
    deleteSlotFromDoctor,
    addSlotToDoctor,
    updateTests,
    deleteTests,
    updateXray,
    deleteXray,
    addDiagnosticSlot,
    updateDiagnosticSlot,
    deleteDiagnosticSlot,
    getDiagnosticBookingsByDiagnosticId,
    createTestForDiagnostic,
    getAllTestsForDiagnostic,
    createXrayForDiagnostic,
    getAllXraysForDiagnostic,
    createPackageForDiagnostic,
    getPackagesForDiagnostic,
    updateTestForDiagnostic,
    deleteTestForDiagnostic,
    updateXrayForDiagnostic,
    deleteXrayForDiagnostic,
    updatePackageForDiagnostic,
    deletePackageForDiagnostic,
    updateHraQuestion,
    deleteHraQuestion,
    updateMeetingLink,
    bulkUploadStaffProfiles,
} from '../Controller/ControllerAdmin.js';
import multer from 'multer';
import { uploadBlogImage, uploadCategoryCSV, uploadCategoryImage, uploadCompanyCSV, uploadDiagnosticImage, uploadImages, uploadPackageCSV, uploadPrescriptionFile, uploadReportFile, uploadTestCSV, uploadTestImage, uploadXrayCSV, uploadXrayImage } from '../config/multerConfig.js';
import { createPackageBooking } from '../Controller/ControllerStaff.js';
import { updateDoctorDetails } from '../Controller/doctorController.js';
const upload = multer({ dest: 'uploads/' });


const router = express.Router();

// Route for Admin Signup
router.post('/signup', signupAdmin);

// Route for Admin Login
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/getadmin/:adminId', getAdminById);
router.put('/updateadmin/:adminId', updateAdminById);



// Route to create new doctor details

// Route to get all doctor details
router.get('/getalldoctors', getDoctorDetails);
router.get('/recent-doctor', getRecentDoctorDetails);

router.get('/getallstaffs', getAllStaff);

// Route to get doctor details by ID
router.get('/getsingle-doctor/:id', getDoctorById);
router.post("/doctor-slots/:doctorId", getDoctorSlotsByDate);
router.get('/gettest/:id', getDoctorTestsById);


// Route to update doctor details
// Route to create a new staff profile (admin only)
router.post('/create-staff/:companyId', createStaffProfile);
router.post('/create-staffinbulk/:companyId', bulkUploadStaffProfiles);
router.post('/addamount/:staffId/:companyId', addAmountToWallet);


router.put("/editstaff/:staffId", editStaffProfile);
router.delete("/deletestaff/:staffId", deleteStaffProfile);




// Route to create a new diagnostic center along with tests
router.post('/create-diagnostic', createDiagnosticDetails);
// Inside your route file, e.g. routes/admin.js
router.delete("/delelte-diagnostic/:diagnosticId", deleteDiagnosticCenter);
router.put('/update/:bookingId', updateBookingStatusByDiagnostic);




// Route to update an existing diagnostic center by its ID
router.put('/update-diagnostic/:diagnosticId', updateDiagnosticDetails);

// Route to delete a diagnostic center by its ID
router.delete('/delete-diagnostic/:diagnosticId', deleteDiagnosticDetails);

// Create
router.post('/create-doctor', createDoctor);

// Read
router.get('/getdoctors', getAllDoctors);
router.get('/doctorscategories', getAllDoctorCategories);
router.get('/doctorsbyfilter', getAllDoctorsByFilter);
router.get('/doctorfilter', getAllDoctorsFilter);
router.get('/single-doctor/:id', getDoctorById);

// Update
router.put('/update-doctor/:id', updateDoctor);
router.put('/update-doctors/:doctorId', updateDoctors);
router.put('/delete-slot/:doctorId', deleteSlotFromDoctor);
router.put('/add-slot/:doctorId', addSlotToDoctor);
// Delete
router.delete('/remvoe-doctors/:id', deleteDoctor);
router.get('/alldiagnosticsbookings', getAllDiagnosticBookings);
// For Admin to fetch all bookings
router.get("/diagnostic-bookings", getAllDiagnosticBookingsForAdmin);
router.get("/diagnostic-bookings/:diagnosticId", getDiagnosticBookingsByDiagnosticId);
router.get('/booking/:bookingId', getSingleDiagnosticBooking);
router.get('/get-bookings/:diagnosticId', getBookingsByDiagnosticId);
router.delete('/delete-bookings/:bookingId', deleteBookingById);
router.get('/allaccepteddiagnosticsbookings', getAcceptedDiagnosticBookings);
router.get('/allrejecteddiagnosticsbookings', getRejectedDiagnosticBookings);
router.get('/alldoctorbookings', getAllDoctorAppointments);
router.get('/appointment/:appointmentId', getSingleDoctorAppointment);
router.put('/update-status', updateDoctorAppointmentStatus);
router.delete('/deleteappointments/:bookingId', deleteDoctorAppointment);
router.get('/alldoctorappointments/:doctorId', getDoctorAppointments);
router.get('/acceptedappointments', getAcceptedDoctorAppointments);
router.get('/rejectedappointments', getRejectedDoctorAppointments);

router.get('/accepteddiagnosticbooking', getAcceptedDiagnosticAppointments);
router.get('/rejecteddiagnosticbooking', getRejectedDiagnosticAppointments);




router.post('/create-company', createCompany);
router.post("/upload-companies", uploadCompanyCSV, uploadCompaniesFromCSV);
router.get('/companies', getCompanies);
router.get('/singlecompany/:companyId', getCompanyById);
router.put('/update-company/:companyId', updateCompany);
router.delete('/delete-company/:companyId', deleteCompany);
router.get('/companydiag/:companyId', getCompanyDiagnostics);
router.get('/companystaffs/:companyId', getCompanyWithStaff);
router.get('/staffscount/:companyId', getCompanyStaffStats);


// Route to create a new category
router.post('/create-category', uploadCategoryImage, createCategory);
router.post("/bulk-upload-categories-csv", uploadCategoryCSV, uploadCategoriesFromCSV);
router.put('/updatecategory/:id', uploadCategoryImage, editCategory);
router.delete('/deletecategory/:id', deleteCategory);

// Route to get all categories
router.get('/getallcategory', getAllCategories);
router.get('/getspecialcategory', fetchImageEnabledCategories);



//login company
router.post('/login-company', loginCompany);
router.post('/logout-company', logoutCompany);


//login doctor
router.post('/login-doctor', loginDoctor);
router.post('/logout-doctor', logoutDoctor);


//login & logout diagnostic
//login doctor
router.post('/login-diagnostic', loginDiagnostic);
router.post('/logout-diagnostic', logoutDiagnostic);


// Update status of an appointment by appointmentId
router.put('/updatestatus/:appointmentId', updateAppointmentStatus);

// Get all accepted appointments

// Get all rejected appointments
router.get('/rejectedappointments', getRejectedAppointments);
router.get('/getcount', getCounts);

router.post('/import-companies', upload.single('file'), importCompaniesFromExcel);
router.post('/import-staffs', upload.single('file'), importStaffFromExcel);

router.get('/getdashboardcount', getDashboardCounts);
router.post('/add-packages', addTestsToStaffByAgeGroup);


// Route to submit a section or multiple sections
router.post('/submit-section', submitSection);

// Route to get the entire health assessment
router.get('/get-hra', getAssessment);
router.post('/create-tests', createTest);
router.get('/alltests', getAllTests); // ✅ GET route to fetch all tests
router.put('/updatetest/:testId', updateTests); // ✅ GET route to fetch all tests
router.delete('/deletetest/:testId', deleteTests); // ✅ GET route to fetch all tests
router.post('/create-packages', createPackage);
router.get('/getallpackages', getAllPackages);
router.get('/recent-package', getRecentPackage);
router.get('/singlepackages/:packageId', getSinglePackage);
router.post("/testsdiagnostic/:diagnosticId", uploadTestImage, createTestForDiagnostic);
router.put("/updatetestsdiagnostic/:diagnosticId/:testId", uploadTestImage, updateTestForDiagnostic);
router.delete("/deletetests/:diagnosticId/:testId", deleteTestForDiagnostic);
router.get('/getdiagnostic/:diagnosticId', getAllTestsForDiagnostic);



//xrays routes
// ✅ Create new X-ray (with image)
router.post("/create-xray", uploadXrayImage, createXray);
router.post("/create-diagxray/:diagnosticId", uploadXrayImage, createXrayForDiagnostic);
router.put("/update-diagxray/:diagnosticId/:xrayId", uploadXrayImage, updateXrayForDiagnostic);
router.delete("/delete-diagxray/:diagnosticId/:xrayId", deleteXrayForDiagnostic);
// ✅ Get all X-rays
router.get("/getallxrays", getAllXrays);
// Express router example
router.get('/getxraysdiagnostic/:diagnosticId', getAllXraysForDiagnostic);
router.post("/createpackage/:diagnosticId", createPackageForDiagnostic);
router.put('/update-package/:diagnosticId/:packageId', updatePackageForDiagnostic);

router.delete('/delete-package/:diagnosticId/:packageId', deletePackageForDiagnostic);

// routes/adminRoutes.js or wherever your routes are defined
router.get("/getpackagesdiagnostic/:diagnosticId", getPackagesForDiagnostic);

// UPDATE X-ray
router.put('/updatexray/:id', updateXray);

// DELETE X-ray
router.delete('/deletexray/:id', deleteXray);

// ✅ Get X-ray by ID
router.get("/single-xray/:xrayId", getXrayById);

//create diagnostic
router.post("/create-diagnostics", uploadImages,  createDiagnostic);

router.put('/add-slotfordiag/:diagnosticId', addDiagnosticSlot);
router.put('/update-slot/:diagnosticId', updateDiagnosticSlot);
router.put('/delete-diagslot/:diagnosticId', deleteDiagnosticSlot);

router.get("/alldiagnostics", getAllDiagnostics);
router.get("/diagnostics/:diagnosticId", getDiagnosticById);
router.delete("/deletediagnostic/:diagnosticId", deleteDiagnosticById);
router.put("/editdiagnostic/:diagnosticId", editDiagnosticById);

router.post('/hra-category', uploadHraImage);
router.put('/updatehra/:hraId', updateHra);
router.delete('/deletehra/:hraId', deleteHra);
router.get('/allhracat', getAllHra);
router.post('/create-multiplehra', createMultipleHraQuestions);
router.put('/updatehra-question/:id', updateHraQuestion);
router.delete('/deletehra-question/:id', deleteHraQuestion);
router.get('/hra-questions', getAllHraQuestions);
router.post('/create-blog', uploadBlogImage, createBlog);
router.post('/create-doctor-booking', createDoctorConsultationBookingByAdmin);

router.post('/upload-doctor-report/:appointmentId', uploadReportFile, uploadDoctorReport);
router.post('/upload-doctor-prescription/:appointmentId', uploadPrescriptionFile, uploadDoctorPrescription);
router.post('/upload-report-diagnostic/:bookingId', uploadBookingReport);
router.post('/upload-prescription-diagnostic/:bookingId', uploadDiagnosticPrescription);

router.post("/create-packagebooking", createPackageBookingByAdmin);


router.post("/create-testname", createTestName);
router.get("/alltestname", getAllTestsName);
router.put("/updatetestname/:id", updateTest);
router.delete("/deletetestname/:id", deleteTest);



router.get('/countries', getCountries);
router.get('/states', getStates);
router.get('/cities', getCities);


router.put("/updatepackage/:packageId", updatePackage);
router.delete("/deletepackage/:packageId", deletePackage);
router.post('/upload-test-csv', uploadTestCSV, bulkUploadTestsFromCSV);
router.post('/upload-testcsv/:diagnosticId', uploadTestCSV, bulkUploadTestsFromCSVForDiag);
router.post('/upload-pkgcsv/:diagnosticId', uploadPackageCSV, bulkUploadPackagesFromCSV);

router.post('/upload-xray-csv/:diagnosticId', uploadXrayCSV, importXrayCSV);
router.put('/updatemeetinglink/:id', updateMeetingLink);

















// Route for staff login

export default router;
