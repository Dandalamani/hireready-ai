const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';

// Generate embedding vector for text using Ollama
const embed = async (text) => {
  try {
    const res = await axios.post(
      `${OLLAMA_URL}/api/embeddings`,
      { model: EMBED_MODEL, prompt: text },
      { timeout: 10000 }
    );
    return res.data.embedding;
  } catch (err) {
    console.error('❌ Ollama embedding error:', err.message);
    return null;
  }
};

// Cosine similarity between two vectors
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

module.exports = { embed, cosineSimilarity };