// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
