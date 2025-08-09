import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeDir = (dir) => fs.mkdirSync(dir, { recursive: true });

// 📁 Define all directories
const dirs = {
  support: path.join(__dirname, '..', 'uploads', 'support'),
  documents: path.join(__dirname, '..', 'uploads', 'documents'),
  testImages: path.join(__dirname, '..', 'uploads', 'testimages'),
  companyImages: path.join(__dirname, '..', 'uploads', 'company-images'),
  doctorImages: path.join(__dirname, '..', 'uploads', 'doctorimages'),
  staffImages: path.join(__dirname, '..', 'uploads', 'staffimages'),
  reports: path.join(__dirname, '..', 'uploads', 'reports'),
  doctorprescription: path.join(__dirname, '..', 'uploads', 'doctorprescription'),
  categoryCsv: path.join(__dirname, '..', 'uploads', 'category-csv'),  // ✅ Properly added
  companyCsv: path.join(__dirname, '..', 'uploads', 'company-csv'),
    testCsv: path.join(__dirname, '..', 'uploads', 'test-csv'),  // ✅ Add this
      packageCsv: path.join(__dirname, '..', 'uploads', 'packages'),
      xrayCsv: path.join(__dirname, '..', 'uploads', 'xray-csv'), // ✅ Create this folder if not exists
        diagnosticImages: path.join(__dirname, '..', 'uploads', 'diagnostic-images'),
  xrayImages: path.join(__dirname, '..', 'uploads', 'xray-images'),


};


// 🔧 Create all directories
Object.values(dirs).forEach(makeDir);

// Generic filename generator
const getFilename = (file) => `${Date.now()}-${file.originalname}`;

// 🧾 Support file upload
export const uploadSupportFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.support),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('file');

// 📄 Document upload
export const uploadDocuments = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.documents),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('documents', 5);

// 🧪 Test image upload
export const uploadTestImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.testImages),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('testImage');

// 🏢 Company assets upload
export const uploadCompanyAssets = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'image') cb(null, dirs.companyImages);
      else if (file.fieldname === 'documents') cb(null, dirs.documents);
      else cb(new Error('Invalid field'), null);
    },
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]);

// 👥 Staff images upload
export const uploadStaffImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.staffImages),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 }
]);

// 🧑‍⚕️ Doctor image upload
// 🧑‍⚕️ Doctor image & document upload middleware
export const uploadDoctorImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.doctorImages),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
]);


// export const uploadStaffProfile = multer({
//   storage: multer.diskStorage({
//     destination: (req, file, cb) => cb(null, dirs.staffImages),
//     filename: (req, file, cb) => cb(null, getFilename(file)),
//   }),
//   limits: { fileSize: 10 * 1024 * 1024 },
// }).fields([
//   { name: 'profileImage', maxCount: 1 },
//   { name: 'idImage', maxCount: 1 },
// ]);




// 🩻 X-ray image upload
const xrayImagesDir = path.join(__dirname, '..', 'uploads', 'xray-images');
makeDir(xrayImagesDir); // Create directory if not exists

export const uploadXrayImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, xrayImagesDir),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5 MB
}).single('image');



const diagnosticImagesDir = path.join(__dirname, '..', 'uploads', 'diagnostic-images');
makeDir(diagnosticImagesDir); // Create directory if it doesn't exist

export const uploadDiagnosticImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, diagnosticImagesDir),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // Max 5 MB
}).single('image');


// Ensure these directories are created
makeDir(dirs.diagnosticImages);
makeDir(dirs.xrayImages);

export const uploadImages = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!req.uploadCounter) req.uploadCounter = 0;

      const folder = req.uploadCounter === 0 ? dirs.diagnosticImages : dirs.xrayImages;

      // Debugging the folder path
      console.log('Selected Folder:', folder);

      // Folder validation
      if (!folder) {
        console.error("Error: Folder is undefined");
        return cb(new Error("Invalid folder destination"));
      }

      req.uploadCounter++;
      cb(null, folder);
    },
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max per file
}).array('image', 2);


// Path where category images will be stored
const categoryImagesDir = path.join(__dirname, '..', 'uploads', 'category-images');
makeDir(categoryImagesDir);

// Multer middleware for category image upload
export const uploadCategoryImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, categoryImagesDir),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5 MB
}).single('image'); // Form field name = 'image'


// 📝 Report file upload
export const uploadReportFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.reports), // Saving to the 'reports' directory
    filename: (req, file, cb) => cb(null, getFilename(file)) // Unique file name
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // Limit file size to 20 MB
}).single('report'); // Assuming the form field is 'report'



// Directory for blog images
const blogImagesDir = path.join(__dirname, '..', 'uploads', 'blog');
makeDir(blogImagesDir);

// Multer upload middleware
export const uploadBlogImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, blogImagesDir),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single('image'); // The form field name should be 'image'



// Setup upload directory and multer storage
const chatUploadsDir = path.join(__dirname, '..', 'uploads', 'chats');
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}


export const chatFunction = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadsDir),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
}).single('file');  // Expect form field 'file'


// 🧾 Diagnostic Report Upload
const diagnosticReportDir = path.join(__dirname, '..', 'uploads', 'diagnosticReport');
makeDir(diagnosticReportDir); // Ensure the directory exists

export const uploadDiagnosticReport = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, diagnosticReportDir),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // Max 20 MB
}).single('report'); // Form field name: 'report'


const diagPrescriptionDir = path.join(__dirname, "..", "uploads", "diagprescription");
makeDir(diagPrescriptionDir); // Ensure folder exists

export const uploadDiagPrescription = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, diagPrescriptionDir),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 20 * 1024 * 1024 } // Max 20MB
}).single("prescription"); // form-data field name: 'prescription'


// 🧾 Prescription file upload
export const uploadPrescriptionFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.doctorprescription),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
}).single('prescription');





// 🧑‍💼 Staff profile upload configuration
export const uploadStaffProfile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.staffImages),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 },
]);





export const uploadCategoryCSV = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.categoryCsv),
    filename: (req, file, cb) => cb(null, getFilename(file))
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('file'); // Ensure your form field is named 'file'


export const uploadCompanyCSV = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.companyCsv),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('file'); // 🔁 front-end should send as `file`




// ✅ CSV Upload Middleware
export const uploadTestCSV = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.testCsv),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file'); // 🔁 field name must be "file"


export const uploadPackageCSV = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.packageCsv),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
}).single('file'); // <-- this 'file' must match frontend FormData key




export const uploadXrayCSV = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, dirs.xrayCsv),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('file');


// ✅ Define path for test images
const testImagesDir = path.join(__dirname, '..', 'uploads', 'test-images');
makeDir(testImagesDir);

// ✅ Multer middleware for test image upload
export const uploadTestImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, testImagesDir),
    filename: (req, file, cb) => cb(null, getFilename(file)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
}).single('image'); // form field name = 'testImage'

