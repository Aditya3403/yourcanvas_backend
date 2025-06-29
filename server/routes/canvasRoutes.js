import express from "express";
const router = express.Router();
import {
  initCanvas,
  getPreview,
  exportPdf,
  addRectangle,
  addCircle,
  addText,
  addImageUrl,
  addImageUpload
} from "../controllers/canvasController.js"; // Note the .js extension
import upload from "../middleware/multer.js"; // Changed from require to import

// Canvas operations
router.post('/init', initCanvas);
router.get('/preview', getPreview); // Fixed typo in '/preview' (was '/preview')
router.get('/export', exportPdf);

// Element operations
router.post('/add/rectangle', addRectangle);
router.post('/add/circle', addCircle);
router.post('/add/text', addText);
router.post('/add/image-url', addImageUrl);
router.post('/add/image-upload', upload.single('image'), addImageUpload);

export default router; // Changed from module.exports to export default