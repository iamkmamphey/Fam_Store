// server.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

const ensureDataStore = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([]));
};

const readProducts = () => {
  try {
    ensureDataStore();
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeProducts = (products) => {
  ensureDataStore();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAx6HPz_3Q977kUnNq97Qx5GpkN5BBC-qI';

app.post('/api/scan', async (req, res) => {
  const { base64Data, mimeType } = req.body;
  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'Missing image data.' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: "Analyze this product image. Provide structured JSON for a POS inventory system. Suggested price should be realistic. Category must be one of: Apparel, Footwear, Accessories, Outerwear, or Other." }
          ]
        }],
        config: {
          responseMimeType: "application/json"
        }
      })
    });
    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'AI scan failed', details: err.message });
  }
});

app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

app.put('/api/products', (req, res) => {
  const { products } = req.body || {};
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Invalid payload. Expected { products: [] }' });
  }
  writeProducts(products);
  res.json({ success: true, count: products.length });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
