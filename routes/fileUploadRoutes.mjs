import router from "./authRoutes.mjs";
import multer from "multer";
import express from "express";
import path from "path";
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads/'); // Destination folder for uploaded files
    },
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
  });

  const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  };

  const upload = multer({ storage: storage, fileFilter: fileFilter });

  router.get('/uploadimage', (req, res) => {
    res.sendFile(path.resolve('index.html'));
  });

  // Handle file upload and return image path
router.post('/upload', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded.');
      }
  
      const imagePath = '/uploads/' + req.file.filename;
      res.status(200).json({ imagePath });
    } catch (error) {
      console.error(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  export default router;