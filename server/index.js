const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const groqRoutes = require('./routes/groq');
const githubRoutes = require('./routes/github');
const userRoutes = require('./routes/user');
const ragRoutes = require('./routes/rag');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:3000',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/groq', groqRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rag', ragRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ RAG using MySQL + Ollama (no ChromaDB needed)');
});