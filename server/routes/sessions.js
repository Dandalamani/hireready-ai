const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../config/db');

// ── GET all sessions ──
router.get('/', protect, async (req, res) => {
  try {
    console.log('📋 Fetching sessions for user:', req.user.id);
    const [rows] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    console.log(`📋 Found ${rows.length} sessions`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Get sessions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET single session ──
router.get('/:id', protect, async (req, res) => {
  // Skip if id is a meta route
  if (['meta'].includes(req.params.id)) return res.status(404).json({ message: 'Not found' });
  try {
    const [sessions] = await db.query(
      'SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!sessions.length) return res.status(404).json({ message: 'Not found' });
    const [questions] = await db.query(
      `SELECT q.*, r.response_text, r.ai_feedback, r.score as response_score
       FROM questions q
       LEFT JOIN responses r ON r.question_id = q.id
       WHERE q.session_id = ?
       ORDER BY q.question_order`,
      [req.params.id]
    );
    res.json({ ...sessions[0], questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST save session ──
router.post('/', protect, async (req, res) => {
  const {
    target_role, mode, difficulty,
    score, confidence, pacing, filler_words,
    duration_minutes, exchanges, session_key
  } = req.body;

  console.log(`💾 Save session: user=${req.user.id} role=${target_role} score=${score} exchanges=${exchanges?.length} key=${session_key}`);

  if (!target_role) {
    return res.status(400).json({ message: 'target_role is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check duplicate session_key
    if (session_key) {
      const [existing] = await conn.query(
        'SELECT id, score FROM interview_sessions WHERE user_id = ? AND session_key = ?',
        [req.user.id, session_key]
      );
      if (existing.length > 0) {
        console.log(`⚠️ Duplicate key: ${session_key}, existing ID: ${existing[0].id}`);
        // Update score if we now have one
        if (score !== null && score !== undefined) {
          await conn.query(
            `UPDATE interview_sessions 
             SET score=?, confidence=?, pacing=?, filler_words=?
             WHERE id=?`,
            [score, confidence || null, pacing || null,
             filler_words || 'Low', existing[0].id]
          );
          console.log(`✅ Updated score on existing session: ${score}`);
        }
        await conn.commit();
        conn.release();
        return res.status(200).json({ id: existing[0].id, duplicate: true });
      }
    }

    // Insert new session
    const [sessionResult] = await conn.query(
      `INSERT INTO interview_sessions 
       (user_id, target_role, mode, difficulty, score, confidence,
        pacing, filler_words, duration_minutes, session_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        target_role || 'software-engineer',
        mode || 'questions',
        difficulty || 'intermediate',
        score || null,
        confidence || null,
        pacing || null,
        filler_words || 'Low',
        duration_minutes || 1,
        session_key || null
      ]
    );
    const sessionId = sessionResult.insertId;
    console.log(`✅ Session inserted ID: ${sessionId}`);

    // Insert exchanges
    if (exchanges && exchanges.length > 0) {
      for (let i = 0; i < exchanges.length; i++) {
        const ex = exchanges[i];
        if (!ex.question) continue;
        const [qResult] = await conn.query(
          `INSERT INTO questions (session_id, question_text, question_order, category)
           VALUES (?, ?, ?, ?)`,
          [sessionId, ex.question, i + 1, ex.category || 'general']
        );
        if (ex.answer) {
          await conn.query(
            `INSERT INTO responses (question_id, session_id, response_text, ai_feedback, score)
             VALUES (?, ?, ?, ?, ?)`,
            [
              qResult.insertId, sessionId,
              ex.answer || '',
              ex.feedback ? JSON.stringify(ex.feedback) : null,
              ex.feedback?.score || null
            ]
          );
        }
      }
    }

    await conn.commit();
    console.log(`✅ Session committed. ID: ${sessionId}`);
    res.status(201).json({ id: sessionId });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Session save error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH update score ──
router.patch('/update-score', protect, async (req, res) => {
  const { session_key, score, confidence, pacing } = req.body;
  console.log(`🔄 Update score: key=${session_key} score=${score} user=${req.user.id}`);

  if (!session_key) {
    return res.status(400).json({ message: 'session_key required' });
  }
  try {
    const [result] = await db.query(
      `UPDATE interview_sessions 
       SET score = ?,
           confidence = COALESCE(?, confidence),
           pacing = COALESCE(?, pacing)
       WHERE session_key = ? AND user_id = ?`,
      [score, confidence || null, pacing || null, session_key, req.user.id]
    );
    console.log(`✅ Score updated: ${score} | Rows affected: ${result.affectedRows}`);

    if (result.affectedRows === 0) {
      console.log(`⚠️ No session found with key: ${session_key}`);
    }
    res.json({ message: 'Score updated', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('❌ Update score error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE session ──
router.delete('/:id', protect, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM interview_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET analytics ──
router.get('/meta/analytics', protect, async (req, res) => {
  try {
    const [sessions] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    if (!sessions.length) {
      return res.json({
        totalSessions: 0,
        avgScore: 0,
        topRole: 'N/A',
        scoreTrend: [],
        roleBreakdown: [],
        recentSessions: [],
      });
    }

    const totalSessions = sessions.length;

    // Only count sessions that have a score
    const scoredSessions = sessions.filter(s => s.score !== null && s.score !== undefined);
    const avgScore = scoredSessions.length > 0
      ? (scoredSessions.reduce((s, r) => s + parseFloat(r.score), 0) / scoredSessions.length).toFixed(1)
      : 0;

    // Score trend (last 10 scored sessions)
    const scoreTrend = scoredSessions.slice(0, 10).reverse().map((s, i) => ({
      session: i + 1,
      score: Math.round(parseFloat(s.score)),
      date: new Date(s.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      }),
    }));

    // Role breakdown
    const roleMap = {};
    sessions.forEach(s => {
      const r = s.target_role || 'unknown';
      roleMap[r] = (roleMap[r] || 0) + 1;
    });
    const roleBreakdown = Object.entries(roleMap)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
    const topRole = roleBreakdown[0]?.role || 'N/A';

    res.json({
      totalSessions,
      avgScore,
      topRole,
      scoreTrend,
      roleBreakdown,
      recentSessions: sessions.slice(0, 5),
    });
  } catch (err) {
    console.error('❌ Analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET dashboard stats ──
router.get('/meta/dashboard', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📊 Dashboard stats for user:', userId);

    const [allSessions] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    const totalSessions = allSessions.length;

    if (totalSessions === 0) {
      return res.json({
        totalSessions: 0,
        avgScore: null,
        bestScore: null,
        avgConfidenceScore: null,
        pacingMode: null,
        fillerWordsMode: null,
        techScore: null,
        behScore: null,
        behavioralMastery: null,
        recentSessions: [],
        hasData: false,
      });
    }

    // Only use scored sessions for score metrics
    const scoredSessions = allSessions.filter(
      s => s.score !== null && s.score !== undefined && parseFloat(s.score) > 0
    );

    const avgScore = scoredSessions.length > 0
      ? (scoredSessions.reduce((a, s) => a + parseFloat(s.score), 0) / scoredSessions.length).toFixed(1)
      : null;

    const bestScore = scoredSessions.length > 0
      ? Math.round(Math.max(...scoredSessions.map(s => parseFloat(s.score))))
      : null;

// Confidence average - handle both string and number formats
const confMap = { 'Very High': 9.5, 'High': 8.0, 'Medium': 6.0, 'Low': 4.0 };
const confScores = allSessions
  .filter(s => s.confidence)
  .map(s => {
    const trimmed = String(s.confidence).trim();
    // If it's already a mapped string value
    if (confMap[trimmed] !== undefined) return confMap[trimmed];
    // If it's a number string like "8.5"
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num <= 10) return num;
    // If it contains WPM or other junk, skip it
    return null;
  })
  .filter(v => v !== null && v <= 10);

const avgConfidenceScore = confScores.length > 0
  ? (confScores.reduce((a, b) => a + b, 0) / confScores.length).toFixed(1)
  : null;

    // Pacing mode
    const pacingCounts = {};
    allSessions.forEach(s => {
      if (s.pacing) {
        const p = s.pacing.includes('WPM') ? 'Normal' : s.pacing;
        pacingCounts[p] = (pacingCounts[p] || 0) + 1;
      }
    });
    const pacingMode = Object.keys(pacingCounts).length > 0
      ? Object.entries(pacingCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Filler words mode
    const fillerCounts = {};
    allSessions.forEach(s => {
      if (s.filler_words) {
        fillerCounts[s.filler_words] = (fillerCounts[s.filler_words] || 0) + 1;
      }
    });
    const fillerWordsMode = Object.keys(fillerCounts).length > 0
      ? Object.entries(fillerCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Technical score (software-engineer)
    const techSessions = scoredSessions.filter(s => s.target_role === 'software-engineer');
    const techScore = techSessions.length > 0
      ? Math.round(techSessions.reduce((a, s) => a + parseFloat(s.score), 0) / techSessions.length)
      : null;

    // Behavioral score (pm + data scientist)
    const behSessions = scoredSessions.filter(
      s => s.target_role === 'product-manager' || s.target_role === 'data-scientist'
    );
    const behScore = behSessions.length > 0
      ? Math.round(behSessions.reduce((a, s) => a + parseFloat(s.score), 0) / behSessions.length)
      : null;

    const behavioralMastery = behScore || null;

    // Recent sessions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRaw = allSessions.filter(
      s => new Date(s.created_at) >= sevenDaysAgo
    ).slice(0, 5);

    const roleMap = {
      'software-engineer': 'System Design',
      'product-manager': 'Product Strategy',
      'data-scientist': 'Data Analysis',
    };
    const tagMap = {
      'software-engineer': 'TECHNICAL',
      'product-manager': 'BEHAVIORAL',
      'data-scientist': 'TECHNICAL',
    };

    const recentSessions = recentRaw.map(s => ({
      id: s.id,
      title: `${roleMap[s.target_role] || 'Interview'} Session`,
      time: getTimeAgo(new Date(s.created_at)),
      description: `${(s.target_role || 'interview').replace(/-/g, ' ')} session. Score: ${s.score ? Math.round(s.score) : 'Pending'}/100.`,
      tag: tagMap[s.target_role] || 'GENERAL',
      score: s.score ? parseFloat(s.score).toFixed(1) : 'N/A',
      done: true,
      role: s.target_role,
    }));

    console.log(`📊 Dashboard: total=${totalSessions} scored=${scoredSessions.length} avg=${avgScore} tech=${techScore} beh=${behScore}`);

    res.json({
      totalSessions,
      avgScore,
      bestScore,
      avgConfidenceScore,
      pacingMode,
      fillerWordsMode,
      techScore,
      behScore,
      behavioralMastery,
      recentSessions,
      hasData: true,
    });
  } catch (err) {
    console.error('❌ Dashboard stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

module.exports = router;