#!/usr/bin/env node

/**
 * generate-note.js
 * 分析 git diff 並使用 Claude API 生成技術筆記
 *
 * Usage:
 *   node generate-note.js --repo <path> [options]
 *
 * Options:
 *   --repo <path>       Source repository path to analyze (required)
 *   --commits <n>       Number of recent commits to analyze (default: 1)
 *   --dry-run           Preview without writing files
 *   --auto-commit       Auto-commit generated note to Evernote repo
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Config
// ============================================================================

const EVERNOTE_REPO = path.resolve(__dirname, '..');
const NOTES_DIR = path.join(EVERNOTE_REPO, 'src', 'pages', 'notes');
const HISTORY_FILE = path.join(EVERNOTE_REPO, '.note-history.json');
const API_KEY = process.env.ANTHROPIC_API_KEY;

// ============================================================================
// Helpers
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    repo: null,
    commits: 1,
    dryRun: false,
    autoCommit: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo') options.repo = args[++i];
    else if (args[i] === '--commits') options.commits = parseInt(args[++i]);
    else if (args[i] === '--dry-run') options.dryRun = true;
    else if (args[i] === '--auto-commit') options.autoCommit = true;
  }

  return options;
}

function execInRepo(cmd, repo) {
  try {
    return execSync(cmd, { cwd: repo, encoding: 'utf-8' }).trim();
  } catch (err) {
    return '';
  }
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return { lastRun: null, processedCommits: [] };
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function shouldSkip(commitHash, history) {
  // Skip if already processed
  if (history.processedCommits.includes(commitHash)) {
    console.log(`⏭  Skipping already processed commit: ${commitHash}`);
    return true;
  }

  // Skip if last run was less than 5 minutes ago
  if (history.lastRun) {
    const timeSinceLastRun = Date.now() - new Date(history.lastRun).getTime();
    if (timeSinceLastRun < 5 * 60 * 1000) {
      console.log(`⏭  Skipping: Last run was ${Math.round(timeSinceLastRun / 1000)}s ago (< 5 min)`);
      return true;
    }
  }

  return false;
}

// ============================================================================
// Git Analysis
// ============================================================================

function analyzeRepo(repo, commits = 1) {
  const commitMessages = execInRepo(`git log --oneline -${commits}`, repo);
  const commitHash = execInRepo('git rev-parse HEAD', repo).slice(0, 7);
  const diffStat = execInRepo(`git diff HEAD~${commits}..HEAD --stat`, repo);
  const diffContent = execInRepo(`git diff HEAD~${commits}..HEAD`, repo).slice(0, 4000);
  const branch = execInRepo('git rev-parse --abbrev-ref HEAD', repo);

  return {
    commitHash,
    commitMessages,
    diffStat,
    diffContent,
    branch,
    repoName: path.basename(repo),
  };
}

function detectTags(analysis) {
  const { diffStat, diffContent } = analysis;
  const tags = new Set();

  // File extensions
  if (/\.ts|\.tsx/.test(diffStat)) tags.add('TypeScript');
  if (/\.js|\.jsx/.test(diffStat)) tags.add('JavaScript');
  if (/\.py/.test(diffStat)) tags.add('Python');
  if (/\.go/.test(diffStat)) tags.add('Go');
  if (/\.rs/.test(diffStat)) tags.add('Rust');
  if (/\.css|\.scss/.test(diffStat)) tags.add('CSS');

  // Framework keywords
  if (/react|useState|useEffect/i.test(diffContent)) tags.add('React');
  if (/electron|ipcMain|ipcRenderer/i.test(diffContent)) tags.add('Electron');
  if (/express|fastapi|flask/i.test(diffContent)) tags.add('API');
  if (/sqlite|postgres|mysql/i.test(diffContent)) tags.add('Database');
  if (/docker|dockerfile/i.test(diffStat)) tags.add('Docker');

  // Generic programming tags
  if (/test|spec|\.test\.|\.spec\./i.test(diffStat)) tags.add('Testing');
  if (/bug|fix/i.test(analysis.commitMessages)) tags.add('Debug');

  return Array.from(tags).slice(0, 5); // Max 5 tags
}

// ============================================================================
// Claude API
// ============================================================================

async function generateNoteContent(analysis) {
  if (!API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = `你是一個技術筆記產生器。根據以下 git diff 和 commit messages，產生一則簡潔的技術筆記（繁體中文）。

專案：${analysis.repoName}
分支：${analysis.branch}
Commit：${analysis.commitMessages}

變更統計：
${analysis.diffStat}

部分 diff：
${analysis.diffContent}

請產生：
1. 標題（一句話，描述這次改動的技術重點）
2. 內容（2-3 段，說明：做了什麼、為什麼、有什麼技術細節值得記錄）

格式要求：
- 標題要具體，不要太泛泛
- 內容要技術性，記錄關鍵的實作細節或踩坑經驗
- 保持簡潔，500 字以內
- 用 markdown 格式

請直接輸出：
TITLE: <標題>
CONTENT:
<內容>`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse output
  const titleMatch = text.match(/TITLE:\s*(.+)/);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/);

  if (!titleMatch || !contentMatch) {
    throw new Error('Failed to parse Claude response');
  }

  return {
    title: titleMatch[1].trim(),
    content: contentMatch[1].trim(),
  };
}

// ============================================================================
// File Generation
// ============================================================================

function generateSlug(title, commitHash) {
  // Try to extract English keywords
  const englishWords = title.match(/[a-z]+/gi);
  if (englishWords && englishWords.length >= 2) {
    return englishWords.slice(0, 3).join('-').toLowerCase();
  }

  // Fallback: use commit hash
  return `note-${commitHash}`;
}

function generateMarkdown(note, analysis, tags) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  const frontmatter = `---
layout: ../../layouts/NoteLayout.astro
title: ${note.title}
date: ${dateStr}
tags:
${tags.map(tag => `  - ${tag}`).join('\n')}
source: ${analysis.repoName}
autoGenerated: true
---

${note.content}
`;

  return frontmatter;
}

function writeNote(markdown, slug) {
  const now = new Date();
  const datePrefix = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${datePrefix}-${slug}.md`;
  const filepath = path.join(NOTES_DIR, filename);

  // Check for collision
  if (fs.existsSync(filepath)) {
    const hash = Math.random().toString(36).slice(2, 8);
    const newFilename = `${datePrefix}-${slug}-${hash}.md`;
    const newFilepath = path.join(NOTES_DIR, newFilename);
    fs.writeFileSync(newFilepath, markdown, 'utf-8');
    return newFilename;
  }

  fs.writeFileSync(filepath, markdown, 'utf-8');
  return filename;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs();

  if (!options.repo) {
    console.error('❌ Error: --repo <path> is required');
    process.exit(1);
  }

  if (!fs.existsSync(options.repo)) {
    console.error(`❌ Error: Repository not found: ${options.repo}`);
    process.exit(1);
  }

  console.log('🔍 Analyzing repository...');
  const analysis = analyzeRepo(options.repo, options.commits);

  // Check history
  const history = loadHistory();
  if (shouldSkip(analysis.commitHash, history)) {
    return;
  }

  console.log(`📦 Repo: ${analysis.repoName}`);
  console.log(`🔀 Branch: ${analysis.branch}`);
  console.log(`📝 Commit: ${analysis.commitHash} ${analysis.commitMessages.split('\n')[0]}`);

  // Detect tags
  const tags = detectTags(analysis);
  console.log(`🏷  Tags: ${tags.join(', ')}`);

  // Generate note
  console.log('🤖 Generating note with Claude...');
  const note = await generateNoteContent(analysis);

  const slug = generateSlug(note.title, analysis.commitHash);
  const markdown = generateMarkdown(note, analysis, tags);

  console.log(`\n📄 Generated Note:\n`);
  console.log(`Title: ${note.title}`);
  console.log(`Slug: ${slug}`);
  console.log(`Tags: ${tags.join(', ')}`);
  console.log(`\n${markdown.split('\n').slice(0, 15).join('\n')}\n...`);

  if (options.dryRun) {
    console.log('🚫 Dry run mode - not writing file');
    return;
  }

  // Write file
  const filename = writeNote(markdown, slug);
  console.log(`✅ Note written: ${filename}`);

  // Update history
  history.processedCommits.push(analysis.commitHash);
  history.lastRun = new Date().toISOString();
  saveHistory(history);

  // Auto-commit
  if (options.autoCommit) {
    console.log('📤 Committing to Evernote repo...');
    try {
      execSync(`git add "${path.join(NOTES_DIR, filename)}"`, { cwd: EVERNOTE_REPO });
      execSync(`git commit -m "note: auto-generated from ${analysis.repoName}"`, { cwd: EVERNOTE_REPO });
      console.log('✅ Committed successfully');
    } catch (err) {
      console.error('❌ Commit failed:', err.message);
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
