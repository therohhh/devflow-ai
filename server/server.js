const {
  getRepositoryInfo,
  analyzeRepositoryFiles,
} = require("./services/githubService");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// ========================================
// REPOSITORY EXPLORER
// ========================================

// Get repository file and folder structure
app.get("/api/github/:owner/:repo/tree", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch || "HEAD";

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || "Unable to fetch repository files.",
      });
    }

    if (data.truncated) {
      console.warn(
        `Repository tree for ${owner}/${repo} was truncated by GitHub.`
      );
    }

    const files = (data.tree || []).map((item) => ({
      path: item.path,
      name: item.path.split("/").pop(),
      type: item.type === "tree" ? "folder" : "file",
      size: item.size ?? null,
      sha: item.sha,
    }));

    const overview = analyzeRepositoryFiles(files);

    res.json({
      success: true,
      repository: `${owner}/${repo}`,
      branch,
      truncated: Boolean(data.truncated),

      total: files.length,

      files,

      overview: {
        languageStats: overview.languageStats,
        importantFiles: overview.importantFiles,
        folders: overview.folders,
      },
    });
  } catch (error) {
    console.error("Repository tree error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve the repository tree.",
    });
  }
});

// Get the contents of a selected file
app.get("/api/github/:owner/:repo/file", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.query.path;

    if (!filePath || typeof filePath !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please provide a file path.",
      });
    }

    if (
      filePath.startsWith("/") ||
      filePath.split("/").some((part) => part === "..")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid repository file path.",
      });
    }

    const encodedPath = filePath
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || "Unable to fetch this file.",
      });
    }

    if (Array.isArray(data) || data.type !== "file") {
      return res.status(400).json({
        success: false,
        message: "The selected path is not a file.",
      });
    }

    if (data.size > 1_000_000) {
      return res.status(413).json({
        success: false,
        message: "This file is too large to preview.",
      });
    }

    if (!data.content || data.encoding !== "base64") {
      return res.status(415).json({
        success: false,
        message: "This file format cannot be previewed as text.",
      });
    }

    const content = Buffer.from(data.content, "base64").toString("utf8");

    res.json({
      success: true,
      file: {
        name: data.name,
        path: data.path,
        size: data.size,
        content,
      },
    });
  } catch (error) {
    console.error("Repository file error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve the selected file.",
    });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to DevFlowAI API!",
  });
});

// Health-check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "DevFlowAI backend is running successfully!",
  });
});

app.get("/api/github/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const repository = await getRepositoryInfo(owner, repo);

    res.json({
      success: true,
      repository,
    });
  } catch (error) {
    const status = error.response?.status;

    if (status === 404) {
      return res.status(404).json({
        success: false,
        message: "Repository not found. Check the owner and repository name.",
      });
    }

    if (status === 403 || status === 429) {
      return res.status(429).json({
        success: false,
        message: "GitHub API rate limit reached. Please try again later.",
      });
    }

    console.error("GitHub API error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve repository information.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`DevFlowAI server running on port ${PORT}`);
});