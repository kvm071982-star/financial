const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// @route GET /api/transactions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      startDate, endDate,
      minAmount, maxAmount,
      keyword, type, category,
      uploadId,
      page = 1, limit = 50,
      sortBy = 'date', sortOrder = 'DESC'
    } = req.query;

    let query = `SELECT t.*, u.original_name as statement_name 
                 FROM transactions t 
                 LEFT JOIN uploads u ON t.upload_id = u.id 
                 WHERE t.user_id = ?`;
    const params = [req.user.id];

    if (startDate) { query += ' AND t.date >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND t.date <= ?'; params.push(endDate); }
    if (minAmount) { query += ' AND t.amount >= ?'; params.push(parseFloat(minAmount)); }
    if (maxAmount) { query += ' AND t.amount <= ?'; params.push(parseFloat(maxAmount)); }
    if (keyword) { query += ' AND t.description LIKE ?'; params.push(`%${keyword}%`); }
    if (type && type !== 'all') { query += ' AND t.type = ?'; params.push(type); }
    if (category && category !== 'all') { query += ' AND t.category = ?'; params.push(category); }
    if (uploadId) { query += ' AND t.upload_id = ?'; params.push(parseInt(uploadId)); }

    // Count query
    const countQuery = query.replace(
      'SELECT t.*, u.original_name as statement_name',
      'SELECT COUNT(*) as total'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Validate sort column
    const allowedSortCols = ['date', 'amount', 'description', 'category', 'type'];
    const sortCol = allowedSortCols.includes(sortBy) ? `t.${sortBy}` : 't.date';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortCol} ${sortDir}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [transactions] = await db.query(query, params);

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route GET /api/transactions/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, uploadId } = req.query;
    let params = [req.user.id];
    let where = 'WHERE user_id = ?';

    if (startDate) { where += ' AND date >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND date <= ?'; params.push(endDate); }
    if (uploadId) { where += ' AND upload_id = ?'; params.push(parseInt(uploadId)); }

    const [summary] = await db.query(
      `SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expenses,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'credit' THEN 1 END) as credit_count,
        COUNT(CASE WHEN type = 'debit' THEN 1 END) as debit_count,
        AVG(amount) as avg_transaction
       FROM transactions ${where}`,
      params
    );

    res.json({ success: true, summary: summary[0] });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route GET /api/transactions/categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let params = [req.user.id];
    let where = 'WHERE user_id = ? AND type = "debit"';
    if (startDate) { where += ' AND date >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND date <= ?'; params.push(endDate); }

    const [rows] = await db.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count 
       FROM transactions ${where}
       GROUP BY category ORDER BY total DESC`,
      params
    );
    res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route GET /api/transactions/monthly
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        DATE_FORMAT(date, '%b %Y') as month_label,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as expenses,
        COUNT(*) as transaction_count
       FROM transactions 
       WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(date, '%Y-%m'), DATE_FORMAT(date, '%b %Y')
       ORDER BY month ASC`,
      [req.user.id]
    );
    res.json({ success: true, monthly: rows });
  } catch (err) {
    console.error('Monthly error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route GET /api/transactions/insights
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Highest expense month
    const [highestMonth] = await db.query(
      `SELECT DATE_FORMAT(date, '%b %Y') as month, SUM(amount) as total 
       FROM transactions WHERE user_id = ? AND type = 'debit'
       GROUP BY DATE_FORMAT(date, '%Y-%m'), DATE_FORMAT(date, '%b %Y') ORDER BY total DESC LIMIT 1`,
      [userId]
    );

    // Top category
    const [topCategory] = await db.query(
      `SELECT category, SUM(amount) as total 
       FROM transactions WHERE user_id = ? AND type = 'debit'
       GROUP BY category ORDER BY total DESC LIMIT 1`,
      [userId]
    );

    // Average monthly spending
    const [avgMonthly] = await db.query(
      `SELECT AVG(monthly_total) as avg_monthly FROM (
        SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as monthly_total
        FROM transactions WHERE user_id = ? AND type = 'debit'
        GROUP BY month
      ) as monthly_data`,
      [userId]
    );

    // This month vs last month
    const [thisMonth] = await db.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'debit' AND MONTH(date) = MONTH(NOW()) AND YEAR(date) = YEAR(NOW())`,
      [userId]
    );
    const [lastMonth] = await db.query(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE user_id = ? AND type = 'debit' AND MONTH(date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
       AND YEAR(date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))`,
      [userId]
    );

    const thisMonthTotal = thisMonth[0].total || 0;
    const lastMonthTotal = lastMonth[0].total || 0;
    const changePercent = lastMonthTotal > 0
      ? (((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      insights: {
        highestExpenseMonth: highestMonth[0] || null,
        topCategory: topCategory[0] || null,
        avgMonthlySpending: avgMonthly[0]?.avg_monthly || 0,
        thisMonthExpenses: thisMonthTotal,
        lastMonthExpenses: lastMonthTotal,
        monthlyChange: parseFloat(changePercent),
      },
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
