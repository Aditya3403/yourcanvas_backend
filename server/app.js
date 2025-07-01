import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import multer from "multer";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import canvasRoutes from './routes/canvasRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://yourcanvas.vercel.app',
    /\.vercel\.app$/ // Use regex for all vercel subdomains
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/canvas', canvasRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});