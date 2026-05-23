// ChromaDB replaced with MySQL — this file is no longer used
// Kept for compatibility
const initCollections = async () => {
  console.log('✅ RAG using MySQL storage (no ChromaDB needed)');
};
const getWeakAnswersCollection = () => null;
const getGoodAnswersCollection = () => null;
const isChromaAvailable = () => false;

module.exports = {
  initCollections,
  getWeakAnswersCollection,
  getGoodAnswersCollection,
  isChromaAvailable,
};