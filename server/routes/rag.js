const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  storeSessionAnswers,
  getUserWeakAreas,
  getSimilarQuestions,
  buildRAGContext,
  getUserRAGStats,
  clearUserRAGData,
} = require('../services/ragService');

// Store session answers in MySQL embeddings table
router.post('/store-session', protect, async (req, res) => {
  const { sessionId, exchanges, role } = req.body;

  if (!exchanges || exchanges.length === 0) {
    return res.status(400).json({ message: 'No exchanges provided' });
  }

  try {
    await storeSessionAnswers(req.user.id, sessionId, exchanges, role);
    res.json({
      message: 'Session stored in RAG knowledge base',
      count: exchanges.length,
    });
  } catch (err) {
    console.error('❌ RAG store route error:', err);
    res.status(500).json({ message: 'Failed to store session', error: err.message });
  }
});

// Get weak areas for current user
router.get('/weak-areas', protect, async (req, res) => {
  const { role } = req.query;
  try {
    const weakAreas = await getUserWeakAreas(
      req.user.id,
      role || 'software-engineer',
      10
    );
    res.json({ weakAreas, count: weakAreas.length });
  } catch (err) {
    console.error('❌ Weak areas error:', err);
    res.status(500).json({ message: 'Failed to fetch weak areas' });
  }
});

// Get RAG context for a session start
router.get('/context', protect, async (req, res) => {
  const { role } = req.query;
  try {
    const weakAreas = await getUserWeakAreas(
      req.user.id,
      role || 'software-engineer',
      5
    );
    const ragContext = buildRAGContext(weakAreas);
    res.json({
      hasContext: weakAreas.length > 0,
      weakAreaCount: weakAreas.length,
      weakAreas,
      ragContext,
    });
  } catch (err) {
    console.error('❌ RAG context error:', err);
    res.json({
      hasContext: false,
      weakAreaCount: 0,
      weakAreas: [],
      ragContext: '',
    });
  }
});

// Get RAG stats for settings page
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await getUserRAGStats(req.user.id);
    res.json(stats || {
      totalStored: 0,
      weakCount: 0,
      strongCount: 0,
      avgScore: 0,
      rolesCount: 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get RAG stats' });
  }
});

// Clear all RAG data for user
router.delete('/clear', protect, async (req, res) => {
  try {
    const deleted = await clearUserRAGData(req.user.id);
    res.json({ message: `Cleared ${deleted} entries from knowledge base` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear RAG data' });
  }
});

module.exports = router;