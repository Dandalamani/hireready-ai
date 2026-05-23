const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

const githubFetch = async (url) => {
  const headers = {
    'User-Agent': 'HireReady-AI-App',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  return res;
};

const fetchRepoData = async (owner, repo) => {
  const repoRes = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}`
  );

  if (!repoRes.ok) {
    const errData = await repoRes.json().catch(() => ({}));
    console.error('GitHub API error:', repoRes.status, errData.message);
    if (repoRes.status === 404) throw new Error('Repository not found or is private');
    if (repoRes.status === 403) throw new Error('GitHub API rate limit exceeded. Try again in a minute.');
    throw new Error(`GitHub API error: ${errData.message || repoRes.status}`);
  }

  const repoData = await repoRes.json();

  const [languagesRes, commitsRes] = await Promise.all([
    githubFetch(`https://api.github.com/repos/${owner}/${repo}/languages`),
    githubFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`),
  ]);

  const languages = languagesRes.ok ? await languagesRes.json() : {};
  const commits = commitsRes.ok ? await commitsRes.json() : [];

  return {
    name: repoData.name,
    description: repoData.description || '',
    language: repoData.language || 'Unknown',
    languages: Object.keys(languages),
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    topics: repoData.topics || [],
    isPublic: !repoData.private,
    recentCommits: Array.isArray(commits)
      ? commits.slice(0, 5).map(c => ({
          message: c.commit?.message?.split('\n')[0] || '',
          date: c.commit?.author?.date || '',
        }))
      : [],
    openIssues: repoData.open_issues_count,
    updatedAt: repoData.updated_at,
  };
};

router.post('/analyze', protect, async (req, res) => {
  const { url, difficulty } = req.body;
  if (!url) return res.status(400).json({ message: 'GitHub URL required' });

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return res.status(400).json({
      message: 'Invalid GitHub URL. Use format: https://github.com/username/repository'
    });
  }

  console.log(`🔍 Analyzing repo: ${parsed.owner}/${parsed.repo}`);

  try {
    const repoData = await fetchRepoData(parsed.owner, parsed.repo);

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are Coach Roberts, an expert technical interview coach.
Analyze this GitHub repository and generate 5 targeted interview questions.
Return ONLY a valid JSON array. No markdown, no backticks.
Format: [{"question":"...","category":"Architecture","difficulty":"Intermediate"}]
Categories: Architecture, Code Quality, Problem Solving, Technology Choice, Performance`,
        },
        {
          role: 'user',
          content: `Repository: ${repoData.name}
Description: ${repoData.description}
Primary Language: ${repoData.language}
All Languages: ${repoData.languages.join(', ')}
Topics: ${repoData.topics.join(', ')}
Stars: ${repoData.stars}, Forks: ${repoData.forks}
Recent Commits: ${repoData.recentCommits.map(c => c.message).join(' | ')}
Difficulty: ${difficulty || 'Intermediate'}

Generate 5 specific interview questions about this repository.`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    console.log('GitHub questions raw:', raw?.substring(0, 200));

    let questions = [];
    try {
      let cleaned = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }
      questions = JSON.parse(cleaned);
    } catch {
      questions = [
        { question: `Walk me through the architecture of ${repoData.name}.`, category: 'Architecture', difficulty: difficulty || 'Intermediate' },
        { question: `Why did you choose ${repoData.language} for this project?`, category: 'Technology Choice', difficulty: difficulty || 'Intermediate' },
        { question: `What was the hardest problem you solved in ${repoData.name}?`, category: 'Problem Solving', difficulty: difficulty || 'Intermediate' },
        { question: `How did you ensure code quality in this project?`, category: 'Code Quality', difficulty: difficulty || 'Intermediate' },
        { question: `How would you scale ${repoData.name} to handle 10x more users?`, category: 'Performance', difficulty: difficulty || 'Intermediate' },
      ];
    }

    res.json({ repo: repoData, questions });
  } catch (err) {
    console.error('GitHub analyze error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

router.get('/user-repos/:username', protect, async (req, res) => {
  try {
    const response = await githubFetch(
      `https://api.github.com/users/${req.params.username}/repos?sort=updated&per_page=6`
    );
    if (!response.ok) throw new Error('User not found');
    const repos = await response.json();
    res.json(repos.map(r => ({
      name: r.name,
      description: r.description || '',
      language: r.language || 'Unknown',
      stars: r.stargazers_count,
      forks: r.forks_count,
      url: r.html_url,
      isPublic: !r.private,
      updatedAt: r.updated_at,
    })));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;