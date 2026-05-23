const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Parse GitHub URL to get owner/repo
const parseGitHubUrl = (url) => {
  try {
    const cleaned = url.trim().replace(/\/$/, '');
    const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
    return null;
  } catch {
    return null;
  }
};

// Fetch repo info from GitHub public API
const fetchRepoData = async (owner, repo) => {
  const headers = { 'User-Agent': 'HireReady-AI' };

  const [repoRes, languagesRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }),
  ]);

  if (!repoRes.ok) throw new Error('Repository not found or is private');

  const repoData = await repoRes.json();
  const languages = languagesRes.ok ? await languagesRes.json() : {};
  const commits = commitsRes.ok ? await commitsRes.json() : [];

  return {
    name: repoData.name,
    description: repoData.description || '',
    language: repoData.language || 'Unknown',
    languages: Object.keys(languages),
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    size: repoData.size,
    topics: repoData.topics || [],
    defaultBranch: repoData.default_branch,
    isPublic: !repoData.private,
    commitCount: repoData.size,
    recentCommits: commits.slice(0, 5).map(c => ({
      message: c.commit?.message?.split('\n')[0] || '',
      date: c.commit?.author?.date || '',
    })),
    createdAt: repoData.created_at,
    updatedAt: repoData.updated_at,
    openIssues: repoData.open_issues_count,
  };
};

// Analyze repo and generate interview questions
router.post('/analyze', protect, async (req, res) => {
  const { url, difficulty } = req.body;
  if (!url) return res.status(400).json({ message: 'GitHub URL required' });

  const parsed = parseGitHubUrl(url);
  if (!parsed) return res.status(400).json({ message: 'Invalid GitHub URL' });

  try {
    const repoData = await fetchRepoData(parsed.owner, parsed.repo);

    // Generate AI questions based on repo
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are Coach Roberts, an expert technical interview coach.
Analyze this GitHub repository and generate 5 targeted interview questions.
Return ONLY a valid JSON array of objects with this structure:
[
  {
    "question": "<specific interview question about this repo>",
    "category": "<Architecture|Code Quality|Problem Solving|Technology Choice|Performance>",
    "difficulty": "<Basic|Intermediate|Advanced>"
  }
]
Make questions specific to this repo — mention actual technologies, patterns, or decisions visible from the repo data.
Return ONLY the JSON array, nothing else.`,
        },
        {
          role: 'user',
          content: `Repository: ${repoData.name}
Description: ${repoData.description}
Primary Language: ${repoData.language}
All Languages: ${repoData.languages.join(', ')}
Topics/Tags: ${repoData.topics.join(', ')}
Stars: ${repoData.stars}, Forks: ${repoData.forks}
Open Issues: ${repoData.openIssues}
Recent Commits: ${repoData.recentCommits.map(c => c.message).join(' | ')}
Difficulty level requested: ${difficulty || 'Intermediate'}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    let questions = [];
    try {
      questions = JSON.parse(raw);
    } catch {
      questions = [
        {
          question: `Walk me through the architecture of ${repoData.name} and the key design decisions you made.`,
          category: 'Architecture',
          difficulty: difficulty || 'Intermediate',
        },
        {
          question: `Why did you choose ${repoData.language} for this project? What were the tradeoffs?`,
          category: 'Technology Choice',
          difficulty: difficulty || 'Intermediate',
        },
        {
          question: `What was the most complex problem you solved in ${repoData.name}?`,
          category: 'Problem Solving',
          difficulty: difficulty || 'Intermediate',
        },
      ];
    }

    res.json({ repo: repoData, questions });
  } catch (err) {
    console.error('GitHub analyze error:', err);
    res.status(400).json({ message: err.message || 'Failed to analyze repository' });
  }
});

// Get user's public repos (from GitHub username)
router.get('/user-repos/:username', protect, async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/users/${req.params.username}/repos?sort=updated&per_page=6`,
      { headers: { 'User-Agent': 'HireReady-AI' } }
    );
    if (!response.ok) throw new Error('User not found');
    const repos = await response.json();
    const simplified = repos.map(r => ({
      name: r.name,
      description: r.description || '',
      language: r.language || 'Unknown',
      stars: r.stargazers_count,
      forks: r.forks_count,
      url: r.html_url,
      isPublic: !r.private,
      updatedAt: r.updated_at,
      commits: r.size,
    }));
    res.json(simplified);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;