const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `statement-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

// Category keywords mapping
const categoryKeywords = {
  'Food & Dining': ['restaurant', 'food', 'dining', 'cafe', 'coffee', 'pizza', 'burger', 'eat', 'meal', 'kitchen', 'zomato', 'swiggy', 'mcdonalds', 'kfc', 'dominos'],
  'Transport': ['uber', 'ola', 'taxi', 'auto', 'petrol', 'fuel', 'transport', 'metro', 'bus', 'train', 'flight', 'airline', 'irctc', 'rapido'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'shop', 'store', 'mall', 'mart', 'purchase', 'buy', 'retail', 'meesho', 'ajio'],
  'Utilities': ['electricity', 'water', 'gas', 'internet', 'broadband', 'phone', 'mobile', 'bill', 'recharge', 'airtel', 'jio', 'bsnl', 'bescom'],
  'Healthcare': ['hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'medicine', 'health', 'apollo', 'diagnostic', 'lab'],
  'Entertainment': ['netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube', 'movie', 'cinema', 'theatre', 'game', 'subscription'],
  'Education': ['school', 'college', 'university', 'course', 'tuition', 'book', 'udemy', 'coursera', 'education', 'fees'],
  'Salary': ['salary', 'wages', 'payroll', 'income', 'stipend', 'bonus'],
  'Transfer': ['transfer', 'neft', 'rtgs', 'imps', 'upi', 'payment', 'sent', 'received'],
  'Investment': ['mutual fund', 'sip', 'stock', 'shares', 'investment', 'zerodha', 'groww', 'fd', 'fixed deposit'],
  'Insurance': ['insurance', 'premium', 'lic', 'policy', 'cover'],
  'ATM': ['atm', 'cash withdrawal', 'cash deposit'],
};

const categorizeTransaction = (description) => {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
};

// Parse transactions from PDF text
const parseTransactions = (text) => {
  const transactions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Match dates like 12/05/2023, 12-05-23, 12 May 2023
  const dateRegex = /(\d{1,2}[-/\.\s]\d{1,2}[-/\.\s]\d{2,4}|\d{1,2}[-/\.\s][A-Za-z]{3}[-/\.\s]\d{2,4})/;
  
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue; // Must have a date

    // Find all amounts (e.g. 1,500.00 or 1500.00)
    const amountMatches = [...line.matchAll(/([\d,]+\.\d{2})/g)];
    if (amountMatches.length === 0) continue;

    // Use the first valid amount found as the transaction amount
    let amountStr = amountMatches[0][1].replace(/,/g, '');
    let amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    let dateStr = dateMatch[1];
    
    // Description is the text between the date and the amount
    let description = line.substring(dateMatch.index + dateMatch[0].length, amountMatches[0].index).trim();
    
    // Clean up generic symbols or empty desc
    description = description.replace(/[^a-zA-Z0-9\s\/\-\.]/g, '').replace(/\s+/g, ' ').trim();
    if (description.length < 2) description = 'Bank Transaction';

    let date;
    try {
      let cleanDate = dateStr.replace(/[\.\s]/g, '-');
      // Fix 3-letter months to numbers if possible, or just let Date() parse it
      date = new Date(cleanDate);
      if (isNaN(date.getTime())) {
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
          } else {
            const yr = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            date = new Date(`${yr}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          }
        }
      }
      if (isNaN(date.getTime())) continue;
    } catch {
      continue;
    }

    const type = line.toLowerCase().includes('dr') || line.toLowerCase().includes('debit') ? 'debit' : 'credit';

    transactions.push({
      date: date.toISOString().split('T')[0],
      description,
      amount,
      type,
      category: categorizeTransaction(description),
    });
  }

  return transactions;
};

// @route POST /api/upload
router.post('/', authMiddleware, upload.single('statement'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
  }

  const { file } = req;
  let uploadId;

  try {
    // Insert upload record
    const [uploadResult] = await db.query(
      'INSERT INTO uploads (user_id, file_name, original_name, file_size, status) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, file.filename, file.originalname, file.size, 'processing']
    );
    uploadId = uploadResult.insertId;

    // Parse PDF
    const dataBuffer = fs.readFileSync(file.path);
    let transactions = [];

    try {
      const pdfData = await pdfParse(dataBuffer);
      transactions = parseTransactions(pdfData.text);
    } catch (pdfErr) {
      console.warn('PDF parsing warning:', pdfErr.message);
      throw new Error(pdfErr.message || 'Failed to parse PDF.');
    }

    // Insert transactions
    if (transactions.length > 0) {
      const values = transactions.map(t => [
        uploadId, req.user.id, t.date, t.description, t.amount, t.type, t.category
      ]);
      await db.query(
        'INSERT INTO transactions (upload_id, user_id, date, description, amount, type, category) VALUES ?',
        [values]
      );
    }

    // Update upload status
    await db.query(
      'UPDATE uploads SET status = ?, transaction_count = ? WHERE id = ?',
      ['completed', transactions.length, uploadId]
    );

    res.status(201).json({
      success: true,
      message: `Statement uploaded and processed. ${transactions.length} transactions extracted.`,
      uploadId,
      transactionCount: transactions.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (uploadId) {
      await db.query('UPDATE uploads SET status = ? WHERE id = ?', ['failed', uploadId]);
    }
    res.status(400).json({ success: false, message: err.message || 'Error processing the uploaded file' });
  }
});

// @route GET /api/upload/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, original_name, file_name, file_size, upload_date, status, transaction_count 
       FROM uploads WHERE user_id = ? ORDER BY upload_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, uploads: rows });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route DELETE /api/upload/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM uploads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Upload not found' });

    const filePath = path.join(__dirname, '../uploads', rows[0].file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.query('DELETE FROM uploads WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Upload deleted successfully' });
  } catch (err) {
    console.error('Delete upload error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
