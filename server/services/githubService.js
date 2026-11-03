const axios = require("axios");

async function getRepositoryInfo(owner, repo) {
  const response = await axios.get(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
      timeout: 10000,
    }
  );

  const data = response.data;

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    owner: data.owner.login,
    url: data.html_url,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    language: data.language,
    defaultBranch: data.default_branch,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

async function getRepositoryTree(owner, repo) {
  // Step 1: Get repository metadata to find its default branch
  const repository = await getRepositoryInfo(owner, repo);

  // Step 2: Fetch the complete repository file tree
  const response = await axios.get(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(repository.defaultBranch)}`,
    {
      params: {
        recursive: 1,
      },
      headers: {
        Accept: "application/vnd.github+json",
      },
      timeout: 15000,
    }
  );

  // Step 3: Return useful information about each file and folder
  return {
    repository: repository.fullName,
    defaultBranch: repository.defaultBranch,
    truncated: response.data.truncated,
    files: response.data.tree.map((item) => ({
      path: item.path,
      type: item.type,
      sha: item.sha,
      size: item.size ?? null,
    })),
  };
}

function analyzeRepositoryFiles(files) {
  const languageMap = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".sql": "SQL",
    ".php": "PHP",
    ".rb": "Ruby",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
  };

  const languageStats = {};
  const folders = new Set();

  const importantFileNames = [
    "package.json",
    "package-lock.json",
    "README.md",
    "server.js",
    "index.js",
    "App.jsx",
    "App.js",
    "vite.config.js",
    "tsconfig.json",
    "requirements.txt",
    "Dockerfile",
    "docker-compose.yml",
    ".gitignore",
    ".env.example",
  ];

  const importantFiles = [];

  files.forEach((file) => {
    if (file.type === "folder") {
      folders.add(file.path);
      return;
    }

    const fileName = file.name;
    const lastDotIndex = fileName.lastIndexOf(".");
    const extension =
      lastDotIndex === -1
        ? ""
        : fileName.slice(lastDotIndex).toLowerCase();

    if (languageMap[extension]) {
      const language = languageMap[extension];

      languageStats[language] =
        (languageStats[language] || 0) + 1;
    }

    if (importantFileNames.includes(fileName)) {
      importantFiles.push({
        name: fileName,
        path: file.path,
      });
    }

    // Collect parent directories
    const pathParts = file.path.split("/");

    for (let i = 1; i < pathParts.length; i++) {
      folders.add(pathParts.slice(0, i).join("/"));
    }
  });

  return {
    languageStats,
    importantFiles,
    folders: Array.from(folders).sort(),
  };
}function analyzeRepositoryFiles(files) {
  const languageMap = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".md": "Markdown",
    ".sql": "SQL",
    ".php": "PHP",
    ".rb": "Ruby",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
  };

  const languageStats = {};
  const folders = new Set();

  const importantFileNames = [
    "package.json",
    "package-lock.json",
    "README.md",
    "server.js",
    "index.js",
    "App.jsx",
    "App.js",
    "vite.config.js",
    "tsconfig.json",
    "requirements.txt",
    "Dockerfile",
    "docker-compose.yml",
    ".gitignore",
    ".env.example",
  ];

  const importantFiles = [];

  files.forEach((file) => {
    if (file.type === "folder") {
      folders.add(file.path);
      return;
    }

    const fileName = file.name;
    const lastDotIndex = fileName.lastIndexOf(".");
    const extension =
      lastDotIndex === -1
        ? ""
        : fileName.slice(lastDotIndex).toLowerCase();

    if (languageMap[extension]) {
      const language = languageMap[extension];

      languageStats[language] =
        (languageStats[language] || 0) + 1;
    }

    if (importantFileNames.includes(fileName)) {
      importantFiles.push({
        name: fileName,
        path: file.path,
      });
    }

    // Collect parent directories
    const pathParts = file.path.split("/");

    for (let i = 1; i < pathParts.length; i++) {
      folders.add(pathParts.slice(0, i).join("/"));
    }
  });

  return {
    languageStats,
    importantFiles,
    folders: Array.from(folders).sort(),
  };
}

module.exports = {
  getRepositoryInfo,
  getRepositoryTree,
  analyzeRepositoryFiles,
};