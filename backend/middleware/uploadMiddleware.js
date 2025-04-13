const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const profileUploadDir = path.join(__dirname, '../uploads/profile');
const coverUploadDir = path.join(__dirname, '../uploads/cover');

console.log('Creating upload directories if they don\'t exist:');
console.log('Profile directory:', profileUploadDir);
console.log('Cover directory:', coverUploadDir);

// Create directories if they don't exist
try {
  if (!fs.existsSync(path.join(__dirname, '../uploads'))) {
    fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
    console.log('Created uploads directory');
  }

  if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir, { recursive: true });
    console.log('Created profile upload directory');
  }

  if (!fs.existsSync(coverUploadDir)) {
    fs.mkdirSync(coverUploadDir, { recursive: true });
    console.log('Created cover upload directory');
  }
} catch (err) {
  console.error('Error creating upload directories:', err);
}

// Profile image storage configuration
const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Profile image destination:', profileUploadDir);
    cb(null, profileUploadDir);
  },
  filename: function(req, file, cb) {
    // Use userId to make filename unique and avoid conflicts
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Get file extension from mimetype if filename doesn't have one
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {
      // Try to get extension from mimetype
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {
        // Default for other image types
        ext = '.jpg';
      }
      console.log(`No extension in filename, using mimetype to set extension to: ${ext}`);
    }
    
    const filename = `profile-${userId}-${uniqueSuffix}${ext}`;
    console.log('Generated profile image filename:', filename);
    cb(null, filename);
  }
});

// Cover image storage configuration
const coverStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Cover image destination:', coverUploadDir);
    cb(null, coverUploadDir);
  },
  filename: function(req, file, cb) {
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Get file extension from mimetype if filename doesn't have one
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {
      // Try to get extension from mimetype
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {
        // Default for other image types
        ext = '.jpg';
      }
      console.log(`No extension in filename, using mimetype to set extension to: ${ext}`);
    }
    
    const filename = `cover-${userId}-${uniqueSuffix}${ext}`;
    console.log('Generated cover image filename:', filename);
    cb(null, filename);
  }
});

// File filter to accept only image files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/i;
  const allowedMimeTypes = /^image\//i;  // Accept any image mimetype
  
  // Check file extension if available
  const extname = file.originalname && path.extname(file.originalname)
    ? allowedFileTypes.test(path.extname(file.originalname).toLowerCase())
    : true; // If no extension, rely on mimetype
  
  // Check mimetype - more important for camera captures
  const mimetype = allowedMimeTypes.test(file.mimetype);

  console.log('File upload info:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extname: path.extname(file.originalname).toLowerCase() || 'no extension',
    extnameAllowed: extname,
    mimetypeAllowed: mimetype
  });

  // Accept the file if either the extension or mimetype is valid
  // For camera captures, the mimetype should be image/* even if extension is missing
  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed! Supported types: jpeg, jpg, png, gif, webp'));
  }
};

// Create upload middleware instances
const uploadProfileImage = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
}).single('profileImage');

const uploadCoverImage = multer({
  storage: coverStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
}).single('coverImage');

// Middleware wrappers to handle errors
exports.profileUpload = (req, res, next) => {
  console.log('Profile upload middleware called');
  uploadProfileImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading (e.g., file too large)
      console.error('Multer profile upload error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      // Unknown error occurred
      console.error('Unknown profile upload error:', err);
      return res.status(500).json({ message: err.message });
    }
    
    console.log('Profile file uploaded:', req.file);
    // Everything is fine
    next();
  });
};

exports.coverUpload = (req, res, next) => {
  console.log('Cover upload middleware called');
  uploadCoverImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer cover upload error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown cover upload error:', err);
      return res.status(500).json({ message: err.message });
    }
    
    console.log('Cover file uploaded:', req.file);
    next();
  });
}; 