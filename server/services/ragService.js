const db = require('../config/db');
const { embed, cosineSimilarity } = require('./embeddings');

// Check if Ollama is available
const checkOllama = async () => {
  try {
    const axios = require('axios');
    await axios.get('http://localhost:11434', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

// Store session answers as embeddings in MySQL
const storeSessionAnswers = async (userId, sessionId, exchanges, role) => {
  const ollamaUp = await checkOllama();
  if (!ollamaUp) {
    console.log('⚠️ Ollama not running — skipping RAG storage');
    return;
  }

  try {
    console.log(`📚 Storing ${exchanges.length} answers in RAG for user ${userId}`);
    let stored = 0;

    for (let i = 0; i < exchanges.length; i++) {
      const ex = exchanges[i];
      if (!ex.question || !ex.answer || ex.answer === '[No response]') continue;

      const score = parseFloat(ex.feedback?.score) || 5;
      const text = `Question: ${ex.question}\nAnswer: ${ex.answer}`;

      const embedding = await embed(text);
      if (!embedding) {
        console.log(`⚠️ Skipping Q${i + 1} — embedding failed`);
        continue;
      }

      await db.query(
        `INSERT INTO answer_embeddings 
         (user_id, session_id, role, question, answer, score, tip, tags, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          String(sessionId),
          role,
          ex.question.substring(0, 1000),
          ex.answer.substring(0, 2000),
          score,
          (ex.feedback?.tip || '').substring(0, 500),
          (ex.feedback?.tags || []).join(',').substring(0, 200),
          JSON.stringify(embedding),
        ]
      );
      stored++;
      console.log(`  ✅ Stored Q${i + 1} (score: ${score})`);
    }

    console.log(`✅ RAG storage complete — ${stored}/${exchanges.length} answers stored`);
  } catch (err) {
    console.error('❌ RAG store error:', err.message);
  }
};

// Get weak areas using cosine similarity from MySQL
const getUserWeakAreas = async (userId, role, limit = 5) => {
  const ollamaUp = await checkOllama();
  if (!ollamaUp) return [];

  try {
    // Get all answers for this user and role
    const [rows] = await db.query(
      `SELECT id, question, answer, score, tip, tags, embedding
       FROM answer_embeddings
       WHERE user_id = ? AND role = ? AND score <= 6
       ORDER BY score ASC, created_at DESC
       LIMIT 50`,
      [userId, role]
    );

    if (rows.length === 0) {
      console.log(`📭 No weak areas found for user ${userId} role ${role}`);
      return [];
    }

    // Return top N weakest answers sorted by score
    const weakAreas = rows.slice(0, limit).map(row => ({
      question: row.question,
      answer: row.answer,
      score: parseFloat(row.score),
      tip: row.tip,
      tags: row.tags,
    }));

    console.log(`🔍 Found ${weakAreas.length} weak areas for user ${userId}`);
    return weakAreas;
  } catch (err) {
    console.error('❌ Get weak areas error:', err.message);
    return [];
  }
};

// Find semantically similar past questions
const getSimilarQuestions = async (userId, role, questionText, limit = 3) => {
  const ollamaUp = await checkOllama();
  if (!ollamaUp) return [];

  try {
    const queryEmbedding = await embed(`Question: ${questionText}`);
    if (!queryEmbedding) return [];

    const [rows] = await db.query(
      `SELECT question, answer, score, tip, embedding
       FROM answer_embeddings
       WHERE user_id = ? AND role = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId, role]
    );

    if (rows.length === 0) return [];

    // Calculate cosine similarity for each row
    const withSimilarity = rows.map(row => {
      try {
        const rowEmbedding = JSON.parse(row.embedding);
        const similarity = cosineSimilarity(queryEmbedding, rowEmbedding);
        return { ...row, similarity };
      } catch {
        return { ...row, similarity: 0 };
      }
    });

    // Sort by similarity descending
    withSimilarity.sort((a, b) => b.similarity - a.similarity);

    return withSimilarity.slice(0, limit).map(r => ({
      question: r.question,
      answer: r.answer,
      score: parseFloat(r.score),
      tip: r.tip,
      similarity: r.similarity,
    }));
  } catch (err) {
    console.error('❌ Similarity search error:', err.message);
    return [];
  }
};

// Build RAG context string for Groq prompt
const buildRAGContext = (weakAreas) => {
  if (!weakAreas || weakAreas.length === 0) return '';

  const context = weakAreas.map((area, i) =>
    `Weak area ${i + 1} (score: ${area.score}/10):
Previously asked: "${area.question}"
Candidate answered: "${area.answer}"
Coach tip: "${area.tip || 'Use more structured answers'}"`
  ).join('\n\n');

  return `
CANDIDATE WEAK AREAS — generate questions targeting these specific gaps:
${context}
`;
};

// Get RAG stats for a user
const getUserRAGStats = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as totalStored,
        COUNT(CASE WHEN score <= 6 THEN 1 END) as weakCount,
        COUNT(CASE WHEN score >= 8 THEN 1 END) as strongCount,
        AVG(score) as avgScore,
        COUNT(DISTINCT role) as rolesCount
       FROM answer_embeddings
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  } catch (err) {
    console.error('❌ RAG stats error:', err.message);
    return null;
  }
};

// Clear all RAG data for a user
const clearUserRAGData = async (userId) => {
  try {
    const [result] = await db.query(
      'DELETE FROM answer_embeddings WHERE user_id = ?',
      [userId]
    );
    console.log(`✅ Cleared ${result.affectedRows} RAG entries for user ${userId}`);
    return result.affectedRows;
  } catch (err) {
    console.error('❌ Clear RAG error:', err.message);
    return 0;
  }
};

module.exports = {
  storeSessionAnswers,
  getUserWeakAreas,
  getSimilarQuestions,
  buildRAGContext,
  getUserRAGStats,
  clearUserRAGData,
};