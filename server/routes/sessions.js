const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../config/db');

const isPG = !!process.env.DATABASE_URL;

// ── GET all sessions ──
router.get('/', protect, async (req, res) => {
  try {
    console.log('📋 Fetching sessions for user:', req.user.id);
    const [rows] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ${ isPG ? '$1' : '?' }
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
  if (req.params.id === 'meta') return res.status(404).json({ message: 'Not found' });
  try {
    const p = isPG ? ['$1', '$2'] : ['?', '?'];
    const [sessions] = await db.query(
      `SELECT * FROM interview_sessions WHERE id = ${p[0]} AND user_id = ${p[1]}`,
      [req.params.id, req.user.id]
    );
    if (!sessions.length) return res.status(404).json({ message: 'Not found' });
    const p2 = isPG ? '$1' : '?';
    const [questions] = await db.query(
      `SELECT q.*, r.response_text, r.ai_feedback, r.score as response_score
       FROM questions q
       LEFT JOIN responses r ON r.question_id = q.id
       WHERE q.session_id = ${p2}
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

  console.log(`💾 Save: user=${req.user.id} role=${target_role} score=${score} key=${session_key}`);

  if (!target_role) {
    return res.status(400).json({ message: 'target_role required' });
  }

  // Sanitize confidence
  const confMap = { 'Very High': 'Very High', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low' };
  let sanitizedConfidence = null;
  if (confidence) {
    if (confMap[confidence]) {
      sanitizedConfidence = confidence;
    } else {
      const num = parseFloat(confidence);
      if (!isNaN(num)) {
        if (num >= 9) sanitizedConfidence = 'Very High';
        else if (num >= 7) sanitizedConfidence = 'High';
        else if (num >= 5) sanitizedConfidence = 'Medium';
        else sanitizedConfidence = 'Low';
      }
    }
  }

  // Check duplicate BEFORE transaction
  if (session_key) {
    try {
      const p1 = isPG ? '$1' : '?';
      const p2 = isPG ? '$2' : '?';
      const [existing] = await db.query(
        `SELECT id, score FROM interview_sessions 
         WHERE session_key = ${p1} AND user_id = ${p2}`,
        [session_key, req.user.id]
      );

      if (existing.length > 0) {
        console.log(`⚠️ Duplicate blocked: key=${session_key} existing_id=${existing[0].id}`);

        // Update score if we have one and existing doesn't
        if (score && !existing[0].score) {
          const p3 = isPG ? '$1' : '?';
          const p4 = isPG ? '$2' : '?';
          const p5 = isPG ? '$3' : '?';
          await db.query(
            `UPDATE interview_sessions SET score=${p3}, confidence=${p4}
             WHERE id=${p5}`,
            [score, sanitizedConfidence, existing[0].id]
          );
          console.log(`✅ Updated score on existing: ${score}`);
        }

        return res.status(200).json({
          id: existing[0].id,
          duplicate: true,
          message: 'Session already exists',
        });
      }
    } catch (checkErr) {
      console.error('Duplicate check error:', checkErr.message);
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let sessionId;
    if (isPG) {
      const [rows] = await conn.query(
        `INSERT INTO interview_sessions
         (user_id, target_role, mode, difficulty, score, confidence,
          pacing, filler_words, duration_minutes, session_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (session_key) DO UPDATE
         SET score = COALESCE(EXCLUDED.score, interview_sessions.score),
             confidence = COALESCE(EXCLUDED.confidence, interview_sessions.confidence),
             pacing = COALESCE(EXCLUDED.pacing, interview_sessions.pacing)
         RETURNING id`,
        [
          req.user.id,
          target_role || 'software-engineer',
          mode || 'questions',
          difficulty || 'intermediate',
          score || null,
          sanitizedConfidence,
          pacing || null,
          filler_words || 'Low',
          duration_minutes || 1,
          session_key || null,
        ]
      );
      sessionId = rows[0].id;
    } else {
      const [result] = await conn.query(
        `INSERT INTO interview_sessions
         (user_id, target_role, mode, difficulty, score, confidence,
          pacing, filler_words, duration_minutes, session_key)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
         score = COALESCE(VALUES(score), score),
         confidence = COALESCE(VALUES(confidence), confidence)`,
        [
          req.user.id,
          target_role || 'software-engineer',
          mode || 'questions',
          difficulty || 'intermediate',
          score || null,
          sanitizedConfidence,
          pacing || null,
          filler_words || 'Low',
          duration_minutes || 1,
          session_key || null,
        ]
      );
      sessionId = result.insertId || result.id;
    }

    console.log(`✅ Session upserted ID: ${sessionId}`);

    // Only insert questions if this is a new session
    if (exchanges && exchanges.length > 0) {
      // Check if questions already exist
      const p = isPG ? '$1' : '?';
      const [existingQ] = await conn.query(
        `SELECT COUNT(*) as cnt FROM questions WHERE session_id = ${p}`,
        [sessionId]
      );
      const qCount = parseInt(existingQ[0]?.cnt || existingQ[0]?.count || 0);

      if (qCount === 0) {
        for (let i = 0; i < exchanges.length; i++) {
          const ex = exchanges[i];
          if (!ex.question) continue;

          let questionId;
          if (isPG) {
            const [qRows] = await conn.query(
              `INSERT INTO questions (session_id, question_text, question_order, category)
               VALUES ($1,$2,$3,$4) RETURNING id`,
              [sessionId, ex.question, i + 1, ex.category || 'general']
            );
            questionId = qRows[0].id;
          } else {
            const [qResult] = await conn.query(
              `INSERT INTO questions (session_id, question_text, question_order, category)
               VALUES (?,?,?,?)`,
              [sessionId, ex.question, i + 1, ex.category || 'general']
            );
            questionId = qResult.insertId;
          }

          if (ex.answer) {
            const vals = isPG ? '$1,$2,$3,$4,$5' : '?,?,?,?,?';
            await conn.query(
              `INSERT INTO responses
               (question_id, session_id, response_text, ai_feedback, score)
               VALUES (${vals})`,
              [
                questionId, sessionId,
                ex.answer || '',
                ex.feedback ? JSON.stringify(ex.feedback) : null,
                ex.feedback?.score || null,
              ]
            );
          }
        }
        console.log(`✅ Questions inserted for session ${sessionId}`);
      } else {
        console.log(`⚠️ Questions already exist for session ${sessionId}, skipping`);
      }
    }

    await conn.commit();
    res.status(201).json({ id: sessionId });
  } catch (err) {
    await conn.rollback();
    // Handle unique constraint violation gracefully
    if (err.code === '23505' || err.message?.includes('unique') || err.message?.includes('duplicate')) {
      console.log(`⚠️ Unique constraint caught: ${session_key}`);
      return res.status(200).json({ duplicate: true, message: 'Session already saved' });
    }
    console.error('❌ Session save error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH update score ──
router.patch('/update-score', protect, async (req, res) => {
  const { session_key, score, confidence, pacing } = req.body;
  console.log(`🔄 Update score: key=${session_key} score=${score}`);

  if (!session_key) return res.status(400).json({ message: 'session_key required' });

  const confMap = { 'Very High': 'Very High', 'High': 'High', 'Medium': 'Medium', 'Low': 'Low' };
  let sanitizedConfidence = null;
  if (confidence) {
    if (confMap[confidence]) sanitizedConfidence = confidence;
    else {
      const num = parseFloat(confidence);
      if (!isNaN(num)) {
        if (num >= 9) sanitizedConfidence = 'Very High';
        else if (num >= 7) sanitizedConfidence = 'High';
        else if (num >= 5) sanitizedConfidence = 'Medium';
        else sanitizedConfidence = 'Low';
      }
    }
  }

  try {
    if (isPG) {
      const [rows, meta] = await db.query(
        `UPDATE interview_sessions 
         SET score = $1,
             confidence = COALESCE($2, confidence),
             pacing = COALESCE($3, pacing)
         WHERE session_key = $4 AND user_id = $5`,
        [score, sanitizedConfidence, pacing || null, session_key, req.user.id]
      );
      const affectedRows = meta?.rowCount || 0;
      console.log(`✅ Score updated: ${score} | Rows: ${affectedRows}`);
      res.json({ message: 'Score updated', affectedRows });
    } else {
      const [res2] = await db.query(
        `UPDATE interview_sessions 
         SET score = ?,
             confidence = COALESCE(?, confidence),
             pacing = COALESCE(?, pacing)
         WHERE session_key = ? AND user_id = ?`,
        [score, sanitizedConfidence, pacing || null, session_key, req.user.id]
      );
      console.log(`✅ Score updated: ${score} | Rows: ${res2.affectedRows}`);
      res.json({ message: 'Score updated', affectedRows: res2.affectedRows });
    }
  } catch (err) {
    console.error('❌ Update score error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE session ──
router.delete('/:id', protect, async (req, res) => {
  try {
    const p = isPG ? ['$1', '$2'] : ['?', '?'];
    await db.query(
      `DELETE FROM interview_sessions WHERE id = ${p[0]} AND user_id = ${p[1]}`,
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
    const p = isPG ? '$1' : '?';
    const [sessions] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ${p} 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    if (!sessions.length) {
      return res.json({
        totalSessions: 0, avgScore: 0, topRole: 'N/A',
        scoreTrend: [], roleBreakdown: [], recentSessions: [],
      });
    }

    const totalSessions = sessions.length;
    const scoredSessions = sessions.filter(s => s.score !== null && s.score !== undefined);
    const avgScore = scoredSessions.length > 0
      ? (scoredSessions.reduce((s, r) => s + parseFloat(r.score), 0) / scoredSessions.length).toFixed(1)
      : 0;

    const scoreTrend = scoredSessions.slice(0, 10).reverse().map((s, i) => ({
      session: i + 1,
      score: Math.round(parseFloat(s.score)),
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

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
      totalSessions, avgScore, topRole,
      scoreTrend, roleBreakdown,
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

    const p = isPG ? '$1' : '?';
    const [allSessions] = await db.query(
      `SELECT * FROM interview_sessions 
       WHERE user_id = ${p} 
       ORDER BY created_at DESC`,
      [userId]
    );

    const totalSessions = allSessions.length;

    if (totalSessions === 0) {
      return res.json({
        totalSessions: 0, avgScore: null, bestScore: null,
        avgConfidenceScore: null, pacingMode: null,
        fillerWordsMode: null, techScore: null, behScore: null,
        behavioralMastery: null, recentSessions: [], hasData: false,
      });
    }

    const scoredSessions = allSessions.filter(
      s => s.score !== null && s.score !== undefined && parseFloat(s.score) > 0
    );

    const avgScore = scoredSessions.length > 0
      ? (scoredSessions.reduce((a, s) => a + parseFloat(s.score), 0) / scoredSessions.length).toFixed(1)
      : null;

    const bestScore = scoredSessions.length > 0
      ? Math.round(Math.max(...scoredSessions.map(s => parseFloat(s.score))))
      : null;

    // Confidence average
    const confMap = { 'Very High': 9.5, 'High': 8.0, 'Medium': 6.0, 'Low': 4.0 };
    const confScores = allSessions
      .filter(s => s.confidence)
      .map(s => {
        const trimmed = String(s.confidence).trim();
        if (confMap[trimmed] !== undefined) return confMap[trimmed];
        const num = parseFloat(trimmed);
        if (!isNaN(num) && num <= 10) return num;
        return null;
      })
      .filter(v => v !== null);
    const avgConfidenceScore = confScores.length > 0
      ? (confScores.reduce((a, b) => a + b, 0) / confScores.length).toFixed(1)
      : null;

    // Pacing mode
    const pacingCounts = {};
    allSessions.forEach(s => {
      if (s.pacing) {
        const p2 = s.pacing.includes('WPM') ? 'Normal' : s.pacing;
        pacingCounts[p2] = (pacingCounts[p2] || 0) + 1;
      }
    });
    const pacingMode = Object.keys(pacingCounts).length > 0
      ? Object.entries(pacingCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Filler words
    const fillerCounts = {};
    allSessions.forEach(s => {
      if (s.filler_words) {
        fillerCounts[s.filler_words] = (fillerCounts[s.filler_words] || 0) + 1;
      }
    });
    const fillerWordsMode = Object.keys(fillerCounts).length > 0
      ? Object.entries(fillerCounts).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    // Tech vs behavioral scores
    const techSessions = scoredSessions.filter(s => s.target_role === 'software-engineer');
    const techScore = techSessions.length > 0
      ? Math.round(techSessions.reduce((a, s) => a + parseFloat(s.score), 0) / techSessions.length)
      : null;

    const behSessions = scoredSessions.filter(
      s => s.target_role === 'product-manager' || s.target_role === 'data-scientist'
    );
    const behScore = behSessions.length > 0
      ? Math.round(behSessions.reduce((a, s) => a + parseFloat(s.score), 0) / behSessions.length)
      : null;

    // Recent sessions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRaw = allSessions
      .filter(s => new Date(s.created_at) >= sevenDaysAgo)
      .slice(0, 5);

    const roleLabels = {
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
      title: `${roleLabels[s.target_role] || 'Interview'} Session`,
      time: getTimeAgo(new Date(s.created_at)),
      description: `${(s.target_role || 'interview').replace(/-/g, ' ')} session. Score: ${s.score ? Math.round(s.score) : 'Pending'}/100.`,
      tag: tagMap[s.target_role] || 'GENERAL',
      score: s.score ? parseFloat(s.score).toFixed(1) : 'N/A',
      done: true,
      role: s.target_role,
    }));

    console.log(`📊 Dashboard: total=${totalSessions} scored=${scoredSessions.length} avg=${avgScore} tech=${techScore} beh=${behScore}`);

    res.json({
      totalSessions, avgScore, bestScore,
      avgConfidenceScore, pacingMode, fillerWordsMode,
      techScore, behScore,
      behavioralMastery: behScore,
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