import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

registerFont(path.join(__dirname, '../fonts/arial.ttf'), { family: 'Arial' });
registerFont(path.join(__dirname, '../fonts/times new roman.ttf'), { family: 'Times New Roman' });
registerFont(path.join(__dirname, '../fonts/Courier New.ttf'), { family: 'Courier New' });
registerFont(path.join(__dirname, '../fonts/Georgia.ttf'), { family: 'Georgia' });

let canvasState = {
  width: 0,
  height: 0,
  elements: []
};

const imageCache = new Map();


const preloadImages = async () => {
  const imageElements = canvasState.elements.filter(el => el.type === 'image');
  const loadedImages = new Map();
  
  for (const element of imageElements) {
    try {

      if (imageCache.has(element.path)) {
        loadedImages.set(element.path, imageCache.get(element.path));
        console.log(`Using cached image: ${element.path}`);
        continue;
      }

      const fullPath = path.join(__dirname, '../uploads', element.path);
      
      console.log(`Attempting to load image: ${fullPath}`);
      console.log(`File exists: ${fs.existsSync(fullPath)}`);
      
      if (fs.existsSync(fullPath)) {
        const imageBuffer = fs.readFileSync(fullPath);
        await new Promise(resolve => setTimeout(resolve, 100));
        const image = await loadImage(imageBuffer);
        imageCache.set(element.path, image);
        loadedImages.set(element.path, image);
        
        console.log(`Successfully loaded image: ${element.path} (${image.width}x${image.height})`);
      } else {
        console.error(`Image file not found: ${fullPath}`);
      }
    } catch (error) {
      console.error(`Error loading image ${element.path}:`, error);
    }
  }
  
  return loadedImages;
};

const drawElements = async (ctx, canvas) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const loadedImages = await preloadImages();
  
  for (const element of canvasState.elements) {
    try {
      console.log(`Drawing element: ${element.type}`, element);
      
      switch (element.type) {
        case 'rectangle':
          ctx.fillStyle = element.color;
          ctx.fillRect(element.x, element.y, element.width, element.height);
          console.log(`Drew rectangle at (${element.x}, ${element.y})`);
          break;
          
        case 'circle':
          ctx.fillStyle = element.color;
          ctx.beginPath();
          ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
          ctx.fill();
          console.log(`Drew circle at (${element.x}, ${element.y})`);
          break;
          
        case 'text':
          ctx.font = `${element.size}px ${element.font}`;
          ctx.fillStyle = element.color;
          ctx.fillText(element.text, element.x, element.y);
          console.log(`Drew text "${element.text}" at (${element.x}, ${element.y})`);
          break;
          
        case 'image':
          const image = loadedImages.get(element.path);
          if (image) {
            if (image.complete !== false) {
              ctx.drawImage(image, element.x, element.y, element.width, element.height);
              console.log(`Drew image ${element.path} at (${element.x}, ${element.y}) size ${element.width}x${element.height}`);
            } else {
              console.warn(`Image ${element.path} not fully loaded, skipping`);
            }
          } else {
            ctx.fillStyle = '#ffcccc';
            ctx.fillRect(element.x, element.y, element.width, element.height);
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(element.x, element.y, element.width, element.height);
            ctx.fillStyle = '#ff0000';
            ctx.font = '12px Arial';
            ctx.fillText('Image Error', element.x + 5, element.y + 15);
            console.log(`Drew error placeholder for image ${element.path}`);
          }
          break;
          
        default:
          console.warn(`Unknown element type: ${element.type}`);
      }
    } catch (error) {
      console.error(`Error drawing element ${element.type}:`, error);
    }
  }
  
  console.log(`Finished drawing ${canvasState.elements.length} elements`);
};

const renderCanvas = async (retryCount = 0) => {
  try {
    console.log(`Starting canvas render... (attempt ${retryCount + 1})`);
    console.log('Canvas state:', JSON.stringify(canvasState, null, 2));
    
    if (canvasState.width === 0 || canvasState.height === 0) {
      throw new Error('Canvas not initialized');
    }
    
    const canvas = createCanvas(canvasState.width, canvasState.height);
    const ctx = canvas.getContext('2d');
    
    await drawElements(ctx, canvas);
    
    const previewPath = path.join(__dirname, '../preview.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(previewPath, buffer);
    console.log(`Preview saved to: ${previewPath}`);
    
    const pdfCanvas = createCanvas(canvasState.width, canvasState.height, 'pdf');
    const pdfCtx = pdfCanvas.getContext('2d');
    
    await drawElements(pdfCtx, pdfCanvas);
    
    const pdfPath = path.join(__dirname, '../export.pdf');
    const pdfBuffer = pdfCanvas.toBuffer();
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`PDF saved to: ${pdfPath}`);
    
    console.log('Canvas rendered successfully');
  } catch (error) {
    console.error('Error rendering canvas:', error);
    
    const hasImages = canvasState.elements.some(el => el.type === 'image');
    if (retryCount === 0 && hasImages) {
      console.log('Retrying canvas render after delay...');
      await new Promise(resolve => setTimeout(resolve, 500));
      return renderCanvas(1);
    }
    
    throw error;
  }
};

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
  
  imageCache.clear();
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error initializing canvas:', error);
    res.status(500).json({ error: 'Failed to initialize canvas' });
  }
};

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

export const addImageUrl = async (req, res) => {
  const { x, y, width, height, url } = req.body;
  
  console.log('Adding image from URL:', { x, y, width, height, url });
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    new URL(url);
    
    console.log('Fetching image from URL...');
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Canvas-Image-Fetcher/1.0',
        'Accept': 'image/*'
      }
    });
    
    const imageBuffer = Buffer.from(response.data);
    console.log(`Image downloaded, size: ${imageBuffer.length} bytes`);
    
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('URL does not point to a valid image');
    }
    
    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg'
    };
    
    const extension = extensionMap[contentType] || 'jpg';
    
    try {

      if (extension !== 'svg') {
        const testImage = await loadImage(imageBuffer);
        console.log(`Image validation successful: ${testImage.width}x${testImage.height}`);
      }
    } catch (imgError) {
      console.error('Image validation failed:', imgError);
      return res.status(400).json({ 
        error: `Invalid image format (${contentType}). Supported formats: JPEG, PNG, GIF, WEBP`
      });
    }
    
    const filename = `url-image-${Date.now()}.${extension}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    const imagePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, imageBuffer);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error('Failed to save image file');
    }
    
    const parseNumber = (value, defaultValue) => 
      value !== undefined && !isNaN(parseInt(value)) ? parseInt(value) : defaultValue;

    const imageElement = {
      type: 'image',
      x: parseNumber(x, 0),
      y: parseNumber(y, 0),
      width: parseNumber(width, 200),
      height: parseNumber(height, 200),
      path: filename,
      originalUrl: url 
    };
    
    canvasState.elements.push(imageElement);
    console.log('Image element added to canvas state:', imageElement);
    
    await renderCanvas();
    res.json({ 
      canvas: canvasState,
      message: 'Image added successfully'
    });
  } catch (err) {
    console.error('Error adding image from URL:', err);
    
    let errorMessage = 'Failed to add image from URL';
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to fetch image from URL - host not found';
    } else if (err.name === 'TypeError' && err.message.includes('Invalid URL')) {
      errorMessage = 'Invalid URL format';
    } else if (err.message.includes('Unsupported image type')) {
      errorMessage = 'Image format not supported. Please use JPEG, PNG, GIF, or WEBP';
    }
    
    res.status(400).json({ 
      error: errorMessage,
      details: err.message
    });
  }
};

export const addImageUpload = async (req, res) => {
  const { x, y, width, height } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    const imagePath = path.join(uploadsDir, file.filename);
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    await new Promise((resolve, reject) => {
      fs.access(imagePath, fs.constants.R_OK, (err) => {
        if (err) reject(new Error('File not accessible'));
        else resolve(true);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    const imageBuffer = fs.readFileSync(imagePath);
    const testImage = await loadImage(imageBuffer);
    console.log(`Image loaded: ${testImage.width}x${testImage.height}`);

    const imageElement = {
      type: 'image',
      x: parseInt(x) || 0,
      y: parseInt(y) || 0,
      width: parseInt(width) || testImage.width,
      height: parseInt(height) || testImage.height,
      path: file.filename
    };

    canvasState.elements.push(imageElement);
    imageCache.delete(file.filename);

    await renderCanvas();
    res.json({ 
      canvas: canvasState,
      imagePath: `/uploads/${file.filename}`
    });
  } catch (error) {
    console.error('Error adding uploaded image:', error);
  
    if (file?.filename) {
      const filePath = path.join(__dirname, '../uploads', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(400).json({ error: 'Invalid image file: ' + error.message });
  }
};

export const getPreview = (req, res) => {
  const previewPath = path.join(__dirname, '../preview.png');
  
  if (fs.existsSync(previewPath)) {
    res.sendFile(previewPath);
  } else {
    res.status(404).json({ error: 'Preview not found' });
  }
};

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
    }
  });
};

export const getCanvasState = (req, res) => {
  res.json({ canvas: canvasState });
};

export const clearCanvas = async (req, res) => {
  canvasState.elements = [];
  imageCache.clear();
  
  try {
    await renderCanvas();
    res.json({ canvas: canvasState });
  } catch (error) {
    console.error('Error clearing canvas:', error);
    res.status(500).json({ error: 'Failed to clear canvas' });
  }
};

export const debugFiles = (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ error: 'Uploads directory does not exist', files: [] });
    }
    
    const files = fs.readdirSync(uploadsDir).map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime
      };
    });
    
    res.json({ 
      uploadsDir,
      files,
      canvasState: canvasState,
      imageCache: Array.from(imageCache.keys())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};