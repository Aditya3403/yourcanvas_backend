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
} from "../controllers/canvasController.js";
import upload from "../middleware/multer.js";

router.post('/init', initCanvas);
router.get('/preview', getPreview); 
router.get('/export', exportPdf);

router.post('/add/rectangle', addRectangle);
router.post('/add/circle', addCircle);
router.post('/add/text', addText);
router.post('/add/image-url', addImageUrl);
router.post('/add/image-upload', upload.single('image'), addImageUpload);

export default router; 