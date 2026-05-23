const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const db = require('../config/db');

// Get full profile
router.get('/profile', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    // Get session stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as totalSessions,
        AVG(score) as avgScore,
        MAX(score) as bestScore,
        MAX(created_at) as lastSession
       FROM interview_sessions WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({ ...rows[0], stats: stats[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile (name, email, avatar)
router.put('/profile', protect, async (req, res) => {
  const { name, email, avatar_url } = req.body;
  if (!name || !email)
    return res.status(400).json({ message: 'Name and email are required' });

  try {
    // Check email not taken by another user
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length)
      return res.status(409).json({ message: 'Email already in use by another account' });

    await db.query(
      'UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?',
      [name, email, avatar_url || null, req.user.id]
    );

    res.json({ message: 'Profile updated', name, email, avatar_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Both fields required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete account
router.delete('/account', protect, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });

  try {
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    // Delete in order (responses → questions → sessions → user)
    await db.query(
      `DELETE r FROM responses r
       INNER JOIN questions q ON r.question_id = q.id
       INNER JOIN interview_sessions s ON q.session_id = s.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    await db.query(
      `DELETE q FROM questions q
       INNER JOIN interview_sessions s ON q.session_id = s.id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    await db.query('DELETE FROM interview_sessions WHERE user_id = ?', [req.user.id]);
    await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;