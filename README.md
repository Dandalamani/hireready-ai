## HireReady AI 🎯

An AI-powered voice interview preparation platform that conducts real-time voice interviews, analyzes responses using Large Language Models, and personalizes coaching through a RAG (Retrieval-Augmented Generation) pipeline built on vector embeddings.

🔗 **Live Demo:** [hireready-ai.vercel.app](https://hireready-ai.vercel.app)  
🖥️ **Backend API:** [hireready-api.onrender.com](https://hireready-api.onrender.com/api/health)

## ✨ Features

- 🎤 **Voice-based Interview** — Coach Roberts speaks questions aloud and listens to your spoken answers using Web Speech API
- 🧠 **RAG-powered Personalization** — Learns from your past sessions and targets your specific weak areas in every new session
- 📊 **Detailed Performance Reports** — Overall score, clarity, structure, tone, confidence, phrasing suggestions, and executive summary
- 💻 **GitHub Project Interviews** — Paste any public GitHub repo URL and get AI-generated questions specific to your code
- 📈 **Analytics Dashboard** — Track your improvement over time with score trends, role breakdown, and session history
- ⚡ **Groq Rate Limit Protection** — Real-time usage tracking with warning banners and auto-blocking at limit
- 🔄 **Circuit Breaker Pattern** — Graceful handling of Groq API failures with automatic recovery
- 🛡️ **Secure Authentication** — JWT-based auth with bcrypt password hashing

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React.js | UI framework with component-based architecture |
| Tailwind CSS | Utility-first styling |
| React Router | Client-side navigation |
| Axios | HTTP client with JWT interceptors |
| Web Speech API | Voice input (SpeechRecognition) |
| SpeechSynthesis API | Voice output (Coach Roberts speaks) |
| Context API | Global state — Auth and Groq status |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| JWT | Stateless authentication |
| bcryptjs | Password hashing (12 salt rounds) |
| Groq SDK | LLaMA 3.3 70B for AI question generation |
| Axios | GitHub API and Ollama embedding calls |
| Helmet.js | Security headers |

### Database
| Technology | Purpose |
|---|---|
| PostgreSQL (Neon) | Production cloud database |
| MySQL | Local development database |
| Custom db.js | Unified abstraction layer for both DBs |

### AI & RAG
| Technology | Purpose |
|---|---|
| Groq API (LLaMA 3.3 70B) | Question generation, answer analysis, reports |
| Ollama (nomic-embed-text) | Free local vector embeddings |
| PostgreSQL | Vector embedding storage for RAG retrieval |
| Cosine Similarity | Semantic search for similar past answers |

### Deployment
| Service | Purpose |
|---|---|
| Vercel | React frontend hosting + CDN |
| Render | Node.js backend hosting |
| Neon | Serverless PostgreSQL |
| GitHub | Version control + CI/CD |

**Architecture Type:** 3-Tier Client-Server Architecture with REST API communication, MVC-inspired backend structure, and event-driven frontend for the voice interview flow.

## 🧠 How the RAG System Works

Session completes => 
Each answer → Ollama (nomic-embed-text)
=>
768-dimension vector embedding generated
=>
Stored in answer_embeddings table with score
=>
Next session starts
=>
Fetch lowest-scored answers for that role
=>
Format into RAG context string
=>
Inject into Groq system prompt
=>
Coach Roberts asks targeted questions

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MySQL (local development)
- Ollama installed → [ollama.com](https://ollama.com)
- Groq API key → [console.groq.com](https://console.groq.com)

### 1. Clone the repository

```bash
git clone https://github.com/Dandalamani/hireready-ai.git
cd hireready-ai
```

### 2. Set up Ollama embedding model

```bash
ollama pull nomic-embed-text
ollama serve
```

### 3. Set up the backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hireready_db
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=gsk_your_groq_api_key
CLIENT_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

### 4. Set up the frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm start
```

### 5. Set up the database

Run in MySQL Workbench:

```sql
CREATE DATABASE hireready_db;
USE hireready_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  target_role VARCHAR(100),
  mode VARCHAR(50),
  difficulty VARCHAR(50),
  score DECIMAL(4,2),
  confidence VARCHAR(50),
  pacing VARCHAR(50),
  filler_words VARCHAR(50),
  duration_minutes INT,
  session_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_order INT,
  category VARCHAR(50),
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE TABLE responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  session_id INT NOT NULL,
  response_text TEXT,
  ai_feedback TEXT,
  score DECIMAL(4,2),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
);

CREATE TABLE answer_embeddings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(100),
  role VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  score DECIMAL(4,2),
  tip TEXT,
  tags VARCHAR(200),
  embedding LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `DATABASE_URL` | Neon PostgreSQL connection string (production) |
| `DB_HOST` | MySQL host (local) |
| `DB_USER` | MySQL username (local) |
| `DB_PASSWORD` | MySQL password (local) |
| `DB_NAME` | MySQL database name (local) |
| `JWT_SECRET` | Secret key for JWT signing |
| `GROQ_API_KEY` | Groq API key from console.groq.com |
| `CLIENT_URL` | Frontend URL for CORS |
| `GITHUB_TOKEN` | GitHub token (optional, for higher rate limits) |
```

## 🔒 Security

- JWT authentication with 7-day token expiry
- bcrypt password hashing with 12 salt rounds
- CORS restricted to verified frontend domains
- Helmet.js security headers on all responses
- SQL injection prevention via parameterized queries
- Environment variables for all secrets — never committed to git

## 👤 Author

**Dandalamani**
- GitHub: [@Dandalamani](https://github.com/Dandalamani)

---
