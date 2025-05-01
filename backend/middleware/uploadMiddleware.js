const multer = require('multer');
const path = require('path');
const fs = require('fs');


const profileUploadDir = path.join(__dirname, '../uploads/profile');
const coverUploadDir = path.join(__dirname, '../uploads/cover');
const hotelUploadDir = path.join(__dirname, '../uploads/hotel');

console.log('Creating upload directories if they don\'t exist:');
console.log('Profile directory:', profileUploadDir);
console.log('Cover directory:', coverUploadDir);
console.log('Hotel directory:', hotelUploadDir);


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

  if (!fs.existsSync(hotelUploadDir)) {
    fs.mkdirSync(hotelUploadDir, { recursive: true });
    console.log('Created hotel upload directory');
  }
} catch (err) {
  console.error('Error creating upload directories:', err);
}


const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Profile image destination:', profileUploadDir);
    cb(null, profileUploadDir);
  },
  filename: function(req, file, cb) {

    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    

    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {

      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {

        ext = '.jpg';
      }
      console.log(`No extension in filename, using mimetype to set extension to: ${ext}`);
    }
    
    const filename = `profile-${userId}-${uniqueSuffix}${ext}`;
    console.log('Generated profile image filename:', filename);
    cb(null, filename);
  }
});


const coverStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Cover image destination:', coverUploadDir);
    cb(null, coverUploadDir);
  },
  filename: function(req, file, cb) {
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    

    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {

      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {

        ext = '.jpg';
      }
      console.log(`No extension in filename, using mimetype to set extension to: ${ext}`);
    }
    
    const filename = `cover-${userId}-${uniqueSuffix}${ext}`;
    console.log('Generated cover image filename:', filename);
    cb(null, filename);
  }
});

const hotelStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log('Hotel image destination:', hotelUploadDir);
    cb(null, hotelUploadDir);
  },
  filename: function(req, file, cb) {
    const userId = req.user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext || ext === '.') {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        ext = '.jpg';
      } else if (file.mimetype === 'image/png') {
        ext = '.png';
      } else if (file.mimetype === 'image/gif') {
        ext = '.gif';
      } else if (file.mimetype === 'image/webp') {
        ext = '.webp';
      } else {
        ext = '.jpg';
      }
      console.log(`No extension in filename, using mimetype to set extension to: ${ext}`);
    }
    
    const filename = `hotel-${userId}-${uniqueSuffix}${ext}`;
    console.log('Generated hotel image filename:', filename);
    cb(null, filename);
  }
});


const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/i;
  const allowedMimeTypes = /^image\//i;  // Accept any image mimetype
  

  const extname = file.originalname && path.extname(file.originalname)
    ? allowedFileTypes.test(path.extname(file.originalname).toLowerCase())
    : true; // If no extension, rely on mimetype
  

  const mimetype = allowedMimeTypes.test(file.mimetype);

  console.log('File upload info:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    extname: path.extname(file.originalname).toLowerCase() || 'no extension',
    extnameAllowed: extname,
    mimetypeAllowed: mimetype
  });



  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed! Supported types: jpeg, jpg, png, gif, webp'));
  }
};


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

const uploadHotelImages = multer({
  storage: hotelStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
}).array('hotelImages', 10); // Allow up to a maximum of 10 images in one upload


exports.profileUpload = (req, res, next) => {
  console.log('Profile upload middleware called');
  uploadProfileImage(req, res, function(err) {
    if (err instanceof multer.MulterError) {

      console.error('Multer profile upload error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {

      console.error('Unknown profile upload error:', err);
      return res.status(500).json({ message: err.message });
    }
    
    console.log('Profile file uploaded:', req.file);

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

exports.hotelImagesUpload = (req, res, next) => {
  console.log('Hotel images upload middleware called');
  uploadHotelImages(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer hotel upload error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown hotel upload error:', err);
      return res.status(500).json({ message: err.message });
    }
    
    console.log('Hotel files uploaded:', req.files);
    
    if (req.files && req.files.length > 0) {
      // Add the server URLs to the request
      req.hotelImageUrls = req.files.map(file => {
        return `/uploads/hotel/${file.filename}`;
      });
    }
    
    next();
  });
}; 