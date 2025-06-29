import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In canvasController.js
registerFont(path.join(__dirname, '../fonts/arial.ttf'), { family: 'Arial' });
registerFont(path.join(__dirname, '../fonts/times new roman.ttf'), { family: 'Times New Roman' });
registerFont(path.join(__dirname, '../fonts/Courier New.ttf'), { family: 'Courier New' });
registerFont(path.join(__dirname, '../fonts/Georgia.ttf'), { family: 'Georgia' });

let canvasState = {
  width: 0,
  height: 0,
  elements: []
};

// Helper function to draw elements on a canvas context
const drawElements = (ctx, canvas) => {
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw all elements
  canvasState.elements.forEach(element => {
    switch (element.type) {
      case 'rectangle':
        ctx.fillStyle = element.color;
        ctx.fillRect(element.x, element.y, element.width, element.height);
        break;
        
      case 'circle':
        ctx.fillStyle = element.color;
        ctx.beginPath();
        ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'text':
        ctx.font = `${element.size}px ${element.font}`;
        ctx.fillStyle = element.color;
        ctx.fillText(element.text, element.x, element.y);
        break;
        
      case 'image':
        const imgPath = path.join(__dirname, '..', element.path);
        if (fs.existsSync(imgPath)) {
          try {
            const img = fs.readFileSync(imgPath);
            loadImage(img).then(image => {
              ctx.drawImage(image, element.x, element.y, element.width, element.height);
            }).catch(err => {
              console.error('Error loading image:', err);
            });
          } catch (err) {
            console.error('Error reading image file:', err);
          }
        }
        break;
        
      default:
        console.warn(`Unknown element type: ${element.type}`);
    }
  });
};

// Helper function to render canvas to image
const renderCanvas = async () => {
  try {
    // Create regular canvas for PNG preview
    const canvas = createCanvas(canvasState.width, canvasState.height);
    const ctx = canvas.getContext('2d');
    
    // Draw elements on the canvas
    drawElements(ctx, canvas);
    
    // Wait a bit for any async image loading to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Save preview as PNG
    const previewPath = path.join(__dirname, '../preview.png');
    const out = fs.createWriteStream(previewPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    
    // Create PDF canvas separately
    const pdfCanvas = createCanvas(canvasState.width, canvasState.height, 'pdf');
    const pdfCtx = pdfCanvas.getContext('2d');
    
    // Draw elements on PDF canvas
    drawElements(pdfCtx, pdfCanvas);
    
    // Wait a bit for any async image loading to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Save PDF
    const pdfPath = path.join(__dirname, '../export.pdf');
    const pdfOut = fs.createWriteStream(pdfPath);
    const pdfStream = pdfCanvas.createPDFStream();
    pdfStream.pipe(pdfOut);
    
    console.log('Canvas rendered successfully');
  } catch (error) {
    console.error('Error rendering canvas:', error);
  }
};

// Initialize canvas
export const initCanvas = async (req, res) => {
  const { width, height } = req.body;
  
  if (!width || !height || width <= 0 || height <= 0) {
    return res.status(400).json({ error: 'Invalid canvas dimensions' });
  }
  
  canvasState = {
    width: parseInt(width),
    height: parseInt(height),
    elements: []
  };
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error initializing canvas:', error);
    res.status(500).json({ error: 'Failed to initialize canvas' });
  }
};

// Add rectangle
export const addRectangle = async (req, res) => {
  const { x, y, width, height, color } = req.body;
  
  canvasState.elements.push({
    type: 'rectangle',
    x: parseInt(x),
    y: parseInt(y),
    width: parseInt(width),
    height: parseInt(height),
    color
  });
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error adding rectangle:', error);
    res.status(500).json({ error: 'Failed to add rectangle' });
  }
};

// Add circle
export const addCircle = async (req, res) => {
  const { x, y, radius, color } = req.body;
  
  canvasState.elements.push({
    type: 'circle',
    x: parseInt(x),
    y: parseInt(y),
    radius: parseInt(radius),
    color
  });
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error adding circle:', error);
    res.status(500).json({ error: 'Failed to add circle' });
  }
};

// Add text
export const addText = async (req, res) => {
  const { x, y, text, font, size, color } = req.body;
  
  canvasState.elements.push({
    type: 'text',
    x: parseInt(x),
    y: parseInt(y),
    text,
    font,
    size: parseInt(size),
    color
  });
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error adding text:', error);
    res.status(500).json({ error: 'Failed to add text' });
  }
};

// Add image from URL
export const addImageUrl = async (req, res) => {
  const { x, y, width, height, url } = req.body;
  
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');
    const filename = `image-${Date.now()}.${url.split('.').pop().split('?')[0]}`;
    const imagePath = path.join(__dirname, '../uploads', filename);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, imageBuffer);
    
    canvasState.elements.push({
      type: 'image',
      x: parseInt(x),
      y: parseInt(y),
      width: parseInt(width),
      height: parseInt(height),
      path: `/uploads/${filename}`
    });
    
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (err) {
    console.error('Error adding image from URL:', err);
    res.status(500).json({ error: 'Failed to add image from URL' });
  }
};

// Add uploaded image
export const addImageUpload = async (req, res) => {
  const { x, y, width, height } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  canvasState.elements.push({
    type: 'image',
    x: parseInt(x || 0),
    y: parseInt(y || 0),
    width: parseInt(width || 100),
    height: parseInt(height || 100),
    path: `/uploads/${file.filename}`
  });
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error adding uploaded image:', error);
    res.status(500).json({ error: 'Failed to add uploaded image' });
  }
};

// Get preview
export const getPreview = (req, res) => {
  const previewPath = path.join(__dirname, '../preview.png');
  
  if (fs.existsSync(previewPath)) {
    res.sendFile(previewPath);
  } else {
    res.status(404).json({ error: 'Preview not found' });
  }
};

// Export as PDF
export const exportPdf = (req, res) => {
  const pdfPath = path.join(__dirname, '../export.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'PDF not generated yet' });
  }
  
  res.download(pdfPath, 'canvas-export.pdf', (err) => {
    if (err) {
      console.error('Error downloading PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download PDF' });
      }
    } else {
      // Clean up the file after successful download
      try {
        fs.unlinkSync(pdfPath);
      } catch (unlinkErr) {
        console.error('Error deleting PDF file:', unlinkErr);
      }
    }
  });
};