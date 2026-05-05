const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();

// @route POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),
  body('upiPin')
    .trim()
    .matches(/^\d{4,6}$/)
    .withMessage('UPI PIN must be 4 to 6 digits'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, phone, upiPin, email } = req.body;
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const hashedPin = await bcrypt.hash(upiPin, 12);
    const [result] = await db.query(
      'INSERT INTO users (name, phone, upi_pin, email) VALUES (?, ?, ?, ?)',
      [name, phone, hashedPin, email || null]
    );

    const token = jwt.sign(
      { id: result.insertId, phone, name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: { id: result.insertId, name, phone, email: email || null },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route POST /api/auth/login
router.post('/login', [
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit mobile number'),
  body('upiPin')
    .trim()
    .matches(/^\d{4,6}$/)
    .withMessage('UPI PIN must be 4 to 6 digits'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { phone, upiPin } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or UPI PIN' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(upiPin, user.upi_pin);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid phone number or UPI PIN' });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, phone, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route PUT /api/auth/profile
router.put('/profile', authMiddleware, [
  body('name').trim().notEmpty().withMessage('Name is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, currentPin, newPin } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const user = rows[0];
    let updateQuery = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
    let updateParams = [name, email || null, req.user.id];

    if (currentPin && newPin) {
      if (!/^\d{4,6}$/.test(newPin)) {
        return res.status(400).json({ success: false, message: 'New UPI PIN must be 4–6 digits' });
      }
      const isMatch = await bcrypt.compare(currentPin, user.upi_pin);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current UPI PIN is incorrect' });
      }
      const hashedNew = await bcrypt.hash(newPin, 12);
      updateQuery = 'UPDATE users SET name = ?, email = ?, upi_pin = ? WHERE id = ?';
      updateParams = [name, email || null, hashedNew, req.user.id];
    }

    await db.query(updateQuery, updateParams);
    const updated = { id: req.user.id, name, phone: user.phone, email: email || null };
    res.json({ success: true, message: 'Profile updated successfully', user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
