const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Replace the direct require above with this safe version:
let getUserWeakAreas, buildRAGContext;
try {
  const ragService = require('../services/ragService');
  getUserWeakAreas = ragService.getUserWeakAreas;
  buildRAGContext = ragService.buildRAGContext;
} catch (err) {
  console.log('⚠️ RAG service not available');
  getUserWeakAreas = async () => [];
  buildRAGContext = () => '';
}

// ── Usage tracker ──
const usageTracker = {
  tokensUsed: 0,
  requestsUsed: 0,
  windowStart: Date.now(),
  limitReached: false,
  limitType: null,
  TOKEN_LIMIT: 6000,
  REQUEST_LIMIT: 30,
  WARN_THRESHOLD: 0.9,

  reset() {
    const now = Date.now();
    if (now - this.windowStart >= 60000) {
      this.tokensUsed = 0;
      this.requestsUsed = 0;
      this.windowStart = now;
      this.limitReached = false;
      this.limitType = null;
    }
  },

  addUsage(tokens) {
    this.reset();
    this.tokensUsed += tokens || 0;
    this.requestsUsed += 1;
    const tokenPct = this.tokensUsed / this.TOKEN_LIMIT;
    const reqPct = this.requestsUsed / this.REQUEST_LIMIT;
    if (tokenPct >= 1 || reqPct >= 1) {
      this.limitReached = true;
      this.limitType = tokenPct >= 1 ? 'tokens' : 'requests';
    }
  },

  isNearLimit() {
    this.reset();
    return (this.tokensUsed / this.TOKEN_LIMIT) >= this.WARN_THRESHOLD ||
           (this.requestsUsed / this.REQUEST_LIMIT) >= this.WARN_THRESHOLD;
  },

  isAtLimit() {
    this.reset();
    return this.limitReached;
  },

  getStatus() {
    this.reset();
    const tokenPct = Math.min(100, Math.round((this.tokensUsed / this.TOKEN_LIMIT) * 100));
    const reqPct = Math.min(100, Math.round((this.requestsUsed / this.REQUEST_LIMIT) * 100));
    return {
      tokensUsed: this.tokensUsed,
      tokenLimit: this.TOKEN_LIMIT,
      requestsUsed: this.requestsUsed,
      requestLimit: this.REQUEST_LIMIT,
      tokenPct,
      reqPct,
      usagePct: Math.max(tokenPct, reqPct),
      limitReached: this.limitReached,
      nearLimit: this.isNearLimit(),
      limitType: this.limitType,
      secondsUntilReset: Math.max(0, 60 - Math.floor((Date.now() - this.windowStart) / 1000)),
    };
  },
};

// ── Safe JSON parser ──
const safeParseJSON = (raw) => {
  if (!raw) return null;
  try {
    // Remove markdown code blocks
    let cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Extract JSON object
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON parse error:', err.message);
    console.error('Raw content was:', raw?.substring(0, 500));
    return null;
  }
};

// ── Groq call helper ──
const groqCall = async (messages, maxTokens = 200, temperature = 0.7) => {
  if (usageTracker.isAtLimit()) {
    const err = new Error('GROQ_LIMIT_REACHED');
    err.status = 429;
    err.groqStatus = usageTracker.getStatus();
    throw err;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    const usage = completion.usage;
    usageTracker.addUsage(usage?.total_tokens || maxTokens * 0.5);
    return completion;
  } catch (err) {
    if (err.status === 429 ||
        err?.error?.type === 'tokens' ||
        err?.error?.code === 'rate_limit_exceeded') {
      usageTracker.limitReached = true;
      usageTracker.limitType = 'api';
      const limErr = new Error('GROQ_LIMIT_REACHED');
      limErr.status = 429;
      limErr.groqStatus = usageTracker.getStatus();
      throw limErr;
    }
    throw err;
  }
};

const sendLimitError = (res, groqStatus) =>
  res.status(429).json({
    error: 'GROQ_LIMIT_REACHED',
    message: 'Groq API rate limit reached. Please wait before continuing.',
    groqStatus: groqStatus || usageTracker.getStatus(),
  });

const rolePrompts = {
  'software-engineer': 'You are interviewing a Software Engineer. Focus on system design, algorithms, coding, and technical problem solving.',
  'product-manager': 'You are interviewing a Product Manager. Focus on product strategy, execution, stakeholder management.',
  'data-scientist': 'You are interviewing a Data Scientist. Focus on ML, statistics, data analysis, and business impact.',
};

// ── GET status ──
router.get('/status', protect, (req, res) => {
  res.json(usageTracker.getStatus());
});

// ── Start question ──
router.post('/start', protect, async (req, res) => {
  const { role, mode, useRAG } = req.body;
  try {
    const roleContext = rolePrompts[role] || rolePrompts['software-engineer'];

    // Fetch RAG context if enabled
    let ragContext = '';
    let weakAreaCount = 0;
    if (useRAG !== false) {
      try {
        const weakAreas = await getUserWeakAreas(req.user.id, role, 3);
        weakAreaCount = weakAreas.length;
        ragContext = buildRAGContext(weakAreas);
        if (ragContext) {
          console.log(`🧠 RAG: Using ${weakAreaCount} weak areas as context`);
        }
      } catch (ragErr) {
        console.log('⚠️ RAG not available, using standard generation');
      }
    }

    const systemPrompt = ragContext
      ? `${roleContext}
You are Coach Roberts, a professional executive interview coach.
${ragContext}
Generate ONE opening interview question that specifically targets the candidate's weak areas above.
If no weak areas exist, generate a standard opening question.
Return ONLY the question text, nothing else.`
      : `${roleContext}
You are Coach Roberts, a professional executive interview coach.
Generate ONE interview question. Return ONLY the question text, nothing else.`;

    const completion = await groqCall([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate an opening interview question for a ${role} role.${ragContext ? ' Focus on the candidate\'s identified weak areas.' : ''}`,
      },
    ], 150, 0.8);

    const question = completion.choices[0]?.message?.content?.trim();
    res.json({
      question,
      ragUsed: !!ragContext,
      weakAreaCount,
      groqStatus: usageTracker.getStatus(),
    });
  } catch (err) {
    if (err.message === 'GROQ_LIMIT_REACHED') return sendLimitError(res, err.groqStatus);
    console.error('Start error:', err);
    res.status(500).json({ message: 'Failed to generate question' });
  }
});

// Replace /next route to also use RAG:
router.post('/next', protect, async (req, res) => {
  const { role, previousQuestion, userAnswer, questionNumber, totalQuestions } = req.body;
  try {
    // Get weak areas for smarter follow-ups
    let ragContext = '';
    try {
      const weakAreas = await getUserWeakAreas(req.user.id, role, 2);
      ragContext = buildRAGContext(weakAreas);
    } catch {}

    const completion = await groqCall([
      {
        role: 'system',
        content: `${rolePrompts[role] || rolePrompts['software-engineer']}
You are Coach Roberts. Generate ONE follow-up interview question.
${ragContext ? ragContext : ''}
Make it progressively deeper or target the candidate's weak areas.
Return ONLY the question text. No numbering, no explanation.`,
      },
      {
        role: 'user',
        content: `Previous question: "${previousQuestion}"
Candidate's answer: "${userAnswer}"
This is question ${questionNumber} of ${totalQuestions}. Generate the next targeted question.`,
      },
    ], 150, 0.8);

    const question = completion.choices[0]?.message?.content?.trim();
    res.json({ question, groqStatus: usageTracker.getStatus() });
  } catch (err) {
    if (err.message === 'GROQ_LIMIT_REACHED') return sendLimitError(res, err.groqStatus);
    console.error('Next error:', err);
    res.status(500).json({ message: 'Failed to generate question' });
  }
});

// ── Analyze answer ──
router.post('/analyze', protect, async (req, res) => {
  const { role, question, answer } = req.body;
  try {
    const completion = await groqCall([
      {
        role: 'system',
        content: `You are Coach Roberts, an expert interview coach.
Analyze the answer and return ONLY a JSON object. No markdown, no backticks.
Use exactly this format:
{"score":7,"confidence":"High","pacing":"Normal","tags":["Good Structure"],"tip":"Use specific examples"}`,
      },
      {
        role: 'user',
        content: `Role: ${role}\nQuestion: "${question}"\nAnswer: "${answer}"`,
      },
    ], 150, 0.3);

    const raw = completion.choices[0]?.message?.content?.trim();
    const parsed = safeParseJSON(raw);

    if (parsed) {
      res.json({ ...parsed, groqStatus: usageTracker.getStatus() });
    } else {
      res.json({
        score: 7,
        confidence: 'Medium',
        pacing: 'Normal',
        tags: ['Good Effort'],
        tip: 'Use the STAR method for structured answers.',
        groqStatus: usageTracker.getStatus(),
      });
    }
  } catch (err) {
    if (err.message === 'GROQ_LIMIT_REACHED') return sendLimitError(res, err.groqStatus);
    console.error('Analyze error:', err);
    res.json({
      score: 7, confidence: 'Medium', pacing: 'Normal',
      tags: ['Good Effort'], tip: 'Keep practicing!',
      groqStatus: usageTracker.getStatus(),
    });
  }
});

// ── Generate report ──
router.post('/report', protect, async (req, res) => {
  const { role, exchanges } = req.body;

  if (!exchanges || exchanges.length === 0) {
    return res.status(400).json({ message: 'No exchanges provided' });
  }

  console.log(`📊 Generating report: ${exchanges.length} exchanges, role: ${role}`);

  try {
    const summary = exchanges
      .map((e, i) => `Q${i + 1}: ${e.question || 'N/A'}\nAnswer: ${e.answer || 'No answer given'}`)
      .join('\n\n');

    const completion = await groqCall([
      {
        role: 'system',
        content: `You are Coach Roberts, an expert interview coach.
Analyze this interview and return ONLY a JSON object.
No markdown formatting, no backticks, no extra text before or after.
Return exactly this JSON structure with real numeric values:
{
  "overallScore": 75,
  "clarity": 80,
  "structure": 70,
  "tone": 75,
  "confidence": "High",
  "empathy": "Consistent",
  "pacingWPM": 145,
  "strengths": ["strength one", "strength two"],
  "improvements": ["area one", "area two"],
  "valueProp": "Your core strength in one sentence.",
  "executivePresence": "One specific coaching tip.",
  "nextSteps": "One actionable next step.",
  "phrasingSuggestions": [
    {"said": "what candidate said", "better": "improved version"}
  ]
}
All numeric fields must be actual numbers between 1-100.
confidence must be one of: Very High, High, Medium, Low
empathy must be one of: Strong, Consistent, Inconsistent`,
      },
      {
        role: 'user',
        content: `Candidate role: ${role}

Interview transcript:
${summary}

Analyze the above and return the JSON report.`,
      },
    ], 1000, 0.3);

    const raw = completion.choices[0]?.message?.content?.trim();
    console.log('📊 Report raw response (first 300 chars):', raw?.substring(0, 300));

    const parsed = safeParseJSON(raw);

    if (parsed) {
      // Validate and ensure all fields exist with proper types
      const report = {
        overallScore: parseInt(parsed.overallScore) || 70,
        clarity: parseInt(parsed.clarity) || 72,
        structure: parseInt(parsed.structure) || 70,
        tone: parseInt(parsed.tone) || 71,
        confidence: parsed.confidence || 'Medium',
        empathy: parsed.empathy || 'Consistent',
        pacingWPM: parseInt(parsed.pacingWPM) || 145,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Good communication'],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Use STAR method'],
        valueProp: parsed.valueProp || 'You demonstrate solid foundational knowledge.',
        executivePresence: parsed.executivePresence || 'Lead with your key achievements.',
        nextSteps: parsed.nextSteps || 'Practice structured responses using the STAR method.',
        phrasingSuggestions: Array.isArray(parsed.phrasingSuggestions) ? parsed.phrasingSuggestions : [],
        groqStatus: usageTracker.getStatus(),
      };

      console.log('✅ Report parsed successfully. Score:', report.overallScore);
      res.json(report);
    } else {
      // Fallback with reasonable scores based on exchange count
      const baseScore = Math.min(85, 60 + exchanges.length * 3);
      console.log('⚠️ Using fallback report. Base score:', baseScore);
      res.json({
        overallScore: baseScore,
        clarity: baseScore + 5,
        structure: baseScore - 2,
        tone: baseScore + 3,
        confidence: 'Medium',
        empathy: 'Consistent',
        pacingWPM: 145,
        strengths: ['Engaged with all questions', 'Showed relevant knowledge'],
        improvements: ['Use more specific examples', 'Structure with STAR method'],
        valueProp: 'You demonstrated solid engagement throughout the interview.',
        executivePresence: 'Focus on quantifying your achievements with numbers and impact.',
        nextSteps: 'Practice the STAR method: Situation, Task, Action, Result.',
        phrasingSuggestions: [],
        groqStatus: usageTracker.getStatus(),
      });
    }
  } catch (err) {
    if (err.message === 'GROQ_LIMIT_REACHED') return sendLimitError(res, err.groqStatus);
    console.error('❌ Report generation error:', err.message);
    const baseScore = Math.min(85, 60 + (exchanges?.length || 1) * 3);
    res.json({
      overallScore: baseScore,
      clarity: baseScore + 5,
      structure: baseScore - 2,
      tone: baseScore + 3,
      confidence: 'Medium',
      empathy: 'Consistent',
      pacingWPM: 145,
      strengths: ['Completed the interview session', 'Demonstrated communication skills'],
      improvements: ['Add more specific examples', 'Use structured STAR responses'],
      valueProp: 'You showed commitment by completing the full session.',
      executivePresence: 'Lead your answers with impact statements.',
      nextSteps: 'Practice 2-3 behavioral stories using the STAR framework.',
      phrasingSuggestions: [],
      groqStatus: usageTracker.getStatus(),
    });
  }
});

module.exports = router;