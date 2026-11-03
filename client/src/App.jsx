import { useState } from "react";
import "./App.css";
import "./RepositoryExplorer.css";

const NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview", icon: "▦" },
      { id: "repositories", label: "Repositories", icon: "⌘" },
      { id: "insights", label: "Code Insights", icon: "✧", badge: "AI" },
    ],
  },
  {
    label: "ENGINEERING",
    items: [
      { id: "security", label: "Security Review", icon: "◇", badge: "SOON" },
      { id: "tests", label: "Test Generation", icon: "⌁", badge: "SOON" },
    ],
  },
];

function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [repoLocation, setRepoLocation] = useState(null);
  const [repoTree, setRepoTree] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");

    const match = repoUrl.trim().match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)\/?(?:[?#].*)?$/i
    );

    if (!match) {
      setError(
        "Enter a valid GitHub repository URL, such as https://github.com/facebook/react."
      );
      return;
    }

    const [, owner, rawRepo] = match;
    const repo = rawRepo.replace(/\.git$/i, "");

    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/github/${encodeURIComponent(
          owner
        )}/${encodeURIComponent(repo)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to retrieve repository information."
        );
      }

      setRepository(data.repository);
      setRepoLocation({ owner, repo });
      setRepoTree(null);
      setSelectedFile(null);
      setTreeError("");
      setFileError("");
      setActiveView("overview");

      // Retrieve the repository tree after metadata succeeds.
      setTreeLoading(true);
      try {
        const treeResponse = await fetch(
          `http://localhost:5000/api/github/${encodeURIComponent(
            owner
          )}/${encodeURIComponent(repo)}/tree?branch=${encodeURIComponent(
            data.repository.defaultBranch || "HEAD"
          )}`
        );
        const treeData = await treeResponse.json();

        if (!treeResponse.ok || !treeData.success) {
          throw new Error(
            treeData.message || "Unable to retrieve repository files."
          );
        }

        setRepoTree(treeData);
      } catch (treeErr) {
        setTreeError(
          treeErr.message || "Unable to retrieve the repository file tree."
        );
      } finally {
        setTreeLoading(false);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to DevFlowAI. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectFile(filePath) {
    if (!repoLocation) return;

    setFileLoading(true);
    setFileError("");
    setSelectedFile(null);

    try {
      const query = new URLSearchParams({ path: filePath });
      const response = await fetch(
        `http://localhost:5000/api/github/${encodeURIComponent(
          repoLocation.owner
        )}/${encodeURIComponent(repoLocation.repo)}/file?${query.toString()}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to retrieve this file.");
      }

      setSelectedFile(data.file);
    } catch (err) {
      setFileError(err.message || "Unable to load this file.");
    } finally {
      setFileLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "Unavailable";

    const date = new Date(dateString);

    return Number.isNaN(date.getTime())
      ? "Unavailable"
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  }

  function focusRepositoryInput() {
    setActiveView("repositories");

    window.setTimeout(() => {
      document.getElementById("repository-input")?.focus();
    }, 0);
  }

  const allNavItems = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    { id: "settings", label: "Settings" },
  ];

  const activeLabel =
    allNavItems.find((item) => item.id === activeView)?.label ||
    "Overview";

  return (
    <main className="desktop-shell">
      <div className="app-window">
        {/* macOS-style title bar */}
        <header className="titlebar">
          <div className="traffic-lights" aria-label="Window controls">
            <span className="traffic-light red" />
            <span className="traffic-light yellow" />
            <span className="traffic-light green" />
          </div>

          <div className="window-title">
            <span className="title-mark">✳</span>
            DevFlowAI
          </div>

          <div className="titlebar-status">
            <span className="status-dot" />
            API connected
          </div>
        </header>

        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="brand-block">
              <div className="brand-icon">✳</div>

              <div>
                <strong>DevFlowAI</strong>
                <span>Developer workspace</span>
              </div>
            </div>

            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-label">{group.label}</div>

                <nav className="navigation">
                  {group.items.map((item) => (
                    <button
                      className={`nav-item ${
                        activeView === item.id ? "active" : ""
                      }`}
                      key={item.id}
                      type="button"
                      onClick={() =>
                        item.id === "repositories"
                          ? focusRepositoryInput()
                          : setActiveView(item.id)
                      }
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.label}</span>

                      {item.badge && (
                        <span
                          className={`nav-badge ${
                            item.badge === "SOON"
                              ? "muted-badge"
                              : ""
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {activeView === item.id && (
                        <span className="active-chevron">›</span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            ))}

            <div className="sidebar-bottom">
              <button
                className={`nav-item settings-link ${
                  activeView === "settings" ? "active" : ""
                }`}
                onClick={() => setActiveView("settings")}
                type="button"
              >
                <span className="nav-icon">⚙</span>
                <span className="nav-text">Settings</span>
              </button>

              <div className="server-card">
                <div className="server-card-top">
                  <span className="status-dot" />
                  <strong>API server</strong>
                  <span className="online-label">Online</span>
                </div>

                <p>Express · localhost:5000</p>
              </div>

              <div className="profile-row">
                <div className="profile-avatar">R</div>

                <div className="profile-copy">
                  <strong>Developer</strong>
                  <span>Personal workspace</span>
                </div>

                <span className="profile-more">···</span>
              </div>
            </div>
          </aside>

          {/* Main workspace */}
          <section className="main-workspace">
            <header className="workspace-topbar">
              <div className="breadcrumbs">
                <span>Workspace</span>
                <span className="crumb-slash">/</span>
                <strong>{activeLabel}</strong>
              </div>

              <div className="topbar-right">
                <span className="environment-chip">
                  <span className="status-dot" />
                  Local environment
                </span>

                <button
                  className="topbar-icon"
                  type="button"
                  aria-label="Open repositories"
                  onClick={focusRepositoryInput}
                >
                  ⌘
                </button>
              </div>
            </header>

            <div className="view-scroll-area">
              {/* OVERVIEW */}
              {activeView === "overview" && (
                <div className="view-content overview-view">
                  <div className="welcome-row">
                    <div className="welcome-copy-block">
                      <div className="eyebrow">
                        <span>✦</span>
                        YOUR AI ENGINEERING WORKSPACE
                      </div>

                      <h1>
                        Build with <em>clarity.</em>
                      </h1>

                      <p className="welcome-copy">
                        Understand your codebase, spot opportunities,
                        and move forward with confidence.
                      </p>
                    </div>

                    <div className="welcome-orb" aria-hidden="true">
                      <span className="orb-ring ring-a" />
                      <span className="orb-ring ring-b" />
                      <span className="orb-star">✳</span>
                    </div>
                  </div>

                  <div className="overview-grid">
                    {/* Repository analyzer */}
                    <section className="panel analyzer-panel">
                      <div className="panel-heading">
                        <div className="panel-icon lavender-icon">
                          ⌘
                        </div>

                        <div>
                          <h2>Repository analyzer</h2>
                          <p>
                            Connect a public GitHub repository to get
                            started.
                          </p>
                        </div>

                        <span className="tiny-tag">GITHUB API</span>
                      </div>

                      <form
                        className="repo-form"
                        onSubmit={handleAnalyze}
                      >
                        <label className="repo-input-wrap">
                          <span className="github-symbol">⌘</span>

                          <input
                            id="repository-input"
                            type="url"
                            placeholder="https://github.com/owner/repository"
                            value={repoUrl}
                            onChange={(event) =>
                              setRepoUrl(event.target.value)
                            }
                            aria-label="GitHub repository URL"
                            required
                          />

                          {repoUrl && (
                            <button
                              type="button"
                              className="clear-button"
                              aria-label="Clear repository URL"
                              onClick={() => {
                                setRepoUrl("");
                                setError("");
                              }}
                            >
                              ×
                            </button>
                          )}
                        </label>

                        <button
                          className="primary-button"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner" />
                              Fetching
                            </>
                          ) : (
                            <>
                              Analyze repo <span>↗</span>
                            </>
                          )}
                        </button>
                      </form>

                      <div className="analyzer-footnote">
                        <span>
                          ◈ Public repositories · No token needed
                        </span>
                        <span>GitHub REST API</span>
                      </div>

                      {loading && (
                        <div
                          className="inline-feedback loading-feedback"
                          role="status"
                        >
                          <span className="spinner" />
                          Fetching repository metadata from GitHub…
                        </div>
                      )}

                      {error && (
                        <div
                          className="inline-feedback error-feedback"
                          role="alert"
                        >
                          <span>!</span>
                          {error}
                        </div>
                      )}

                      {!repository && !loading && (
                        <button
                          className="example-repo"
                          type="button"
                          onClick={() =>
                            setRepoUrl(
                              "https://github.com/facebook/react"
                            )
                          }
                        >
                          Try an example
                          <span>facebook/react ↗</span>
                        </button>
                      )}
                    </section>

                    {/* Repository snapshot */}
                    <section className="panel snapshot-panel">
                      <div className="panel-heading snapshot-heading">
                        <div>
                          <div className="eyebrow small-eyebrow">
                            YOUR WORKSPACE
                          </div>
                          <h2>Repository snapshot</h2>
                        </div>

                        <span
                          className={`snapshot-state ${
                            repository ? "is-connected" : ""
                          }`}
                        >
                          <span className="status-dot" />
                          {repository
                            ? "Connected"
                            : "Awaiting repo"}
                        </span>
                      </div>

                      {repository ? (
                        <>
                          <div className="snapshot-repo">
                            <div className="repo-mini-icon">⌘</div>

                            <div className="snapshot-repo-copy">
                              <strong>{repository.fullName}</strong>
                              <span>
                                {repository.description ||
                                  "No repository description."}
                              </span>
                            </div>

                            <a
                              href={repository.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open repository on GitHub"
                            >
                              ↗
                            </a>
                          </div>

                          <div className="metric-grid">
                            <Metric
                              label="Language"
                              value={repository.language || "Unknown"}
                              icon="◉"
                            />

                            <Metric
                              label="Stars"
                              value={Number(
                                repository.stars || 0
                              ).toLocaleString()}
                              icon="☆"
                            />

                            <Metric
                              label="Forks"
                              value={Number(
                                repository.forks || 0
                              ).toLocaleString()}
                              icon="⑂"
                            />

                            <Metric
                              label="Open issues"
                              value={Number(
                                repository.openIssues || 0
                              ).toLocaleString()}
                              icon="◎"
                            />
                          </div>

                          <div className="repo-meta-line">
                            <span>
                              Branch
                              <strong>
                                {repository.defaultBranch || "—"}
                              </strong>
                            </span>

                            <span>
                              Updated
                              <strong>
                                {formatDate(repository.updatedAt)}
                              </strong>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="snapshot-empty">
                          <div className="empty-repo-art">
                            <span>⌘</span>
                          </div>

                          <strong>
                            Your repository will appear here
                          </strong>

                          <p>
                            Connect a repo to see its language, stars,
                            forks, and activity at a glance.
                          </p>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Engineering toolkit */}
                  <section className="toolkit-section">
                    <div className="section-title-row">
                      <div>
                        <div className="eyebrow small-eyebrow">
                          THE ENGINEERING TOOLKIT
                        </div>
                        <h2>Tools for deeper understanding</h2>
                      </div>

                      <span className="section-caption">
                        More capabilities coming online
                      </span>
                    </div>

                    <div className="tool-grid">
                      <ToolCard
                        icon="✧"
                        tone="lavender"
                        title="AI code analysis"
                        description="Explore code quality and potential improvements."
                        status="IN DEVELOPMENT"
                        onClick={() => setActiveView("insights")}
                      />

                      <ToolCard
                        icon="⌕"
                        tone="blue"
                        title="Codebase chat"
                        description="Ask questions grounded in your repository."
                        status="PLANNED"
                        onClick={() => setActiveView("insights")}
                      />

                      <ToolCard
                        icon="◇"
                        tone="green"
                        title="Security review"
                        description="Review risks and security-related patterns."
                        status="PLANNED"
                        onClick={() => setActiveView("security")}
                      />
                    </div>
                  </section>

                  <footer className="app-footer">
                    <span>
                      DevFlowAI <i>✳</i>
                    </span>

                    <span>
                      Crafted for developers, powered by AI.
                    </span>

                    <span>
                      <span className="status-dot" />
                      Systems operational
                    </span>
                  </footer>
                </div>
              )}

              {/* REPOSITORIES */}
              {activeView === "repositories" && (
                <div className="view-content subpage-view">
                  <PageIntro
                    eyebrow="SOURCE CONTROL"
                    title="Repositories"
                    copy="Connect a public GitHub repository and keep its key metadata close at hand."
                  />

                  <section className="panel standalone-panel">
                    <div className="panel-heading">
                      <div className="panel-icon lavender-icon">
                        ⌘
                      </div>

                      <div>
                        <h2>Connect repository</h2>
                        <p>
                          Paste a repository URL to retrieve its metadata.
                        </p>
                      </div>
                    </div>

                    <form
                      className="repo-form"
                      onSubmit={handleAnalyze}
                    >
                      <label className="repo-input-wrap">
                        <span className="github-symbol">⌘</span>

                        <input
                          id="repository-input"
                          type="url"
                          placeholder="https://github.com/owner/repository"
                          value={repoUrl}
                          onChange={(event) =>
                            setRepoUrl(event.target.value)
                          }
                          required
                        />
                      </label>

                      <button
                        className="primary-button"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? (
                          "Fetching…"
                        ) : (
                          <>
                            Analyze repo <span>↗</span>
                          </>
                        )}
                      </button>
                    </form>

                    {loading && (
                      <div className="inline-feedback loading-feedback">
                        <span className="spinner" />
                        Fetching repository metadata…
                      </div>
                    )}

                    {error && (
                      <div className="inline-feedback error-feedback">
                        {error}
                      </div>
                    )}
                  </section>

                  {repository && (
                    <>
                      <RepositoryDetails
                        repository={repository}
                        formatDate={formatDate}
                      />

                      <RepositoryExplorer
                        tree={repoTree}
                        loading={treeLoading}
                        error={treeError}
                        selectedFile={selectedFile}
                        fileLoading={fileLoading}
                        fileError={fileError}
                        onSelectFile={handleSelectFile}
                      />
                    </>
                  )}
                </div>
              )}

              {/* CODE INSIGHTS */}
              {activeView === "insights" && (
                <div className="view-content subpage-view">
                  <PageIntro
                    eyebrow="AI WORKSPACE"
                    title="Code insights"
                    copy="The home for repository-aware explanations, code quality findings, and AI-assisted exploration."
                  />

                  <FeaturePlaceholder
                    icon="✧"
                    title="AI code insights are next"
                    copy="The GitHub metadata connection is working. The next milestone is retrieving source files and building an analysis workflow that can explain code and surface potential issues."
                    tag="NEXT MILESTONE"
                  />

                  <div className="next-steps-grid">
                    <div className="mini-step">
                      <span>01</span>
                      <strong>Fetch source files</strong>
                      <p>
                        Retrieve relevant files from the repository tree.
                      </p>
                    </div>

                    <div className="mini-step">
                      <span>02</span>
                      <strong>Analyze context</strong>
                      <p>
                        Use repository content to ground explanations.
                      </p>
                    </div>

                    <div className="mini-step">
                      <span>03</span>
                      <strong>Show findings</strong>
                      <p>Present results in this workspace.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY */}
              {activeView === "security" && (
                <div className="view-content subpage-view">
                  <PageIntro
                    eyebrow="ENGINEERING QUALITY"
                    title="Security review"
                    copy="A dedicated workspace for reviewing potential security risks in repository code."
                  />

                  <FeaturePlaceholder
                    icon="◇"
                    title="Security review is planned"
                    copy="This view is ready for the security workflow. We’ll connect it after source retrieval and analysis are implemented, rather than displaying simulated findings."
                    tag="NOT IMPLEMENTED YET"
                  />
                </div>
              )}

              {/* TEST GENERATION */}
              {activeView === "tests" && (
                <div className="view-content subpage-view">
                  <PageIntro
                    eyebrow="QUALITY ASSURANCE"
                    title="Test generation"
                    copy="A focused workspace for future AI-assisted test suggestions."
                  />

                  <FeaturePlaceholder
                    icon="⌁"
                    title="Test generation is planned"
                    copy="Once DevFlowAI can retrieve and understand repository source files, this view can present test ideas tied to actual code."
                    tag="NOT IMPLEMENTED YET"
                  />
                </div>
              )}

              {/* SETTINGS */}
              {activeView === "settings" && (
                <div className="view-content subpage-view">
                  <PageIntro
                    eyebrow="PREFERENCES"
                    title="Settings"
                    copy="A quick look at the current local development configuration."
                  />

                  <section className="panel settings-panel">
                    <SettingRow
                      label="Appearance"
                      value="Light · macOS inspired"
                    />

                    <SettingRow
                      label="Interface fonts"
                      value="Poppins + Fraunces"
                    />

                    <SettingRow
                      label="Backend endpoint"
                      value="http://localhost:5000"
                    />

                    <SettingRow
                      label="Repository provider"
                      value="GitHub REST API"
                    />

                    <SettingRow
                      label="Repository access"
                      value="Public repositories"
                    />
                  </section>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="metric-card">
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ToolCard({
  icon,
  tone,
  title,
  description,
  status,
  onClick,
}) {
  return (
    <button
      className="tool-card"
      type="button"
      onClick={onClick}
    >
      <span className={`tool-icon ${tone}`}>{icon}</span>

      <span className="tool-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        <em>{status}</em>
      </span>

      <span className="tool-arrow">↗</span>
    </button>
  );
}

function PageIntro({ eyebrow, title, copy }) {
  return (
    <div className="page-intro">
      <div className="eyebrow small-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function FeaturePlaceholder({ icon, title, copy, tag }) {
  return (
    <section className="panel feature-placeholder">
      <div className="placeholder-icon">{icon}</div>
      <div className="eyebrow small-eyebrow">{tag}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
    </section>
  );
}

function CodeInsightsPage({ repository, onChooseRepository }) {
  const repoName = repository?.fullName || "No repository selected";

  const insightSections = [
    {
      number: "01",
      title: "Architecture overview",
      description:
        "Understand the repository structure, major components, and how they work together.",
      icon: "⌘",
    },
    {
      number: "02",
      title: "Code quality",
      description:
        "Identify complex functions, duplication, and opportunities to improve maintainability.",
      icon: "◇",
    },
    {
      number: "03",
      title: "Improvement suggestions",
      description:
        "Explore practical refactoring ideas and improvements to the codebase.",
      icon: "✳",
    },
  ];

  return (
    <section className="insights-page">
      <div className="insights-heading">
        <div>
          <span className="eyebrow">AI-POWERED DEVELOPMENT</span>
          <h1>
            Code <span>Insights.</span>
          </h1>
          <p>
            Understand your codebase. Discover opportunities. Build better
            software.
          </p>
        </div>

        <div className="insights-symbol" aria-hidden="true">
          ✳
        </div>
      </div>

      <section className="insights-repository-card">
        <div className="insights-card-top">
          <div className="insights-icon">⌘</div>

          <div className="insights-repository-info">
            <span className="eyebrow">SELECTED REPOSITORY</span>
            <h2>{repoName}</h2>
            <p>
              {repository?.description ||
                "Select a repository to prepare your code analysis."}
            </p>
          </div>
        </div>

        <div className="insights-repository-footer">
          <span className="insights-status">
            <span className="status-dot" />
            {repository ? "Repository connected" : "Waiting for repository"}
          </span>

          <button
            type="button"
            className="insights-secondary-button"
            onClick={onChooseRepository}
          >
            {repository ? "Change repository" : "Choose repository"} ↗
          </button>
        </div>
      </section>

      <div className="insights-section-heading">
        <div>
          <span className="eyebrow">ANALYSIS TOOLKIT</span>
          <h2>Explore your codebase</h2>
        </div>

        <span className="planned-badge">AI analysis not connected yet</span>
      </div>

      <div className="insights-grid">
        {insightSections.map((section) => (
          <article className="insight-feature-card" key={section.number}>
            <div className="insight-feature-top">
              <div className="insight-icon">{section.icon}</div>
              <span className="insight-number">{section.number}</span>
            </div>

            <h3>{section.title}</h3>
            <p>{section.description}</p>

            <div className="insight-feature-footer">
              <span>Planned capability</span>
              <span aria-hidden="true">↗</span>
            </div>
          </article>
        ))}
      </div>

      <section className="insights-next-step">
        <div className="insights-next-icon">✦</div>

        <div>
          <span className="eyebrow">NEXT STEP</span>
          <h2>Give your codebase context.</h2>
          <p>
            The next integration will retrieve repository source files and use
            an AI model to produce evidence-based code insights.
          </p>
        </div>
      </section>
    </section>
  );
}

function buildFileTree(files = []) {
  const root = { name: "", path: "", type: "folder", children: [] };

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join("/");
      let child = current.children.find((item) => item.name === part);

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: index === parts.length - 1 ? file.type : "folder",
          children: [],
        };
        current.children.push(child);
      } else if (index === parts.length - 1) {
        child.type = file.type;
      }

      current = child;
    });
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(root.children);
  return root.children;
}

function RepositoryExplorer({
  tree,
  loading,
  error,
  selectedFile,
  fileLoading,
  fileError,
  onSelectFile,
}) {
  const [expandedPaths, setExpandedPaths] = useState([]);

  const files = tree?.files || [];
  const languageStats = tree?.overview?.languageStats || {};
  const importantFiles = tree?.overview?.importantFiles || [];
  const folders = tree?.overview?.folders || [];
  const fileCount = files.filter((item) => item.type === "file").length;
  const treeNodes = buildFileTree(files);

  function toggleFolder(path) {
    setExpandedPaths((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    );
  }

  return (
    <section className="panel repo-explorer-panel">
      <div className="repo-explorer-heading">
        <div>
          <div className="eyebrow small-eyebrow">REPOSITORY CONTENTS</div>
          <h2>Repository explorer</h2>
          <p>Browse folders, inspect source files, and review repository composition.</p>
        </div>
        {tree && (
          <span className="explorer-count">
            {fileCount} files · {folders.length} folders
          </span>
        )}
      </div>

      {loading && (
        <div className="explorer-message">
          <span className="spinner" /> Loading repository file tree…
        </div>
      )}

      {error && <div className="inline-feedback error-feedback">{error}</div>}

      {!loading && !error && tree && (
        <>
          {tree.truncated && (
            <div className="explorer-notice">
              GitHub truncated this large repository tree. Some paths may be missing.
            </div>
          )}

          <div className="repo-overview-stats">
            <div className="repo-overview-stat">
              <span>Total files</span>
              <strong>{fileCount}</strong>
            </div>
            <div className="repo-overview-stat">
              <span>Folders</span>
              <strong>{folders.length}</strong>
            </div>
            <div className="repo-overview-stat">
              <span>Languages detected</span>
              <strong>{Object.keys(languageStats).length}</strong>
            </div>
          </div>

          <div className="repo-overview-grid">
            <section className="repo-subpanel">
              <div className="repo-subpanel-heading">
                <h3>Languages</h3>
                <span>By file extension</span>
              </div>
              {Object.keys(languageStats).length ? (
                <div className="language-stat-list">
                  {Object.entries(languageStats)
                    .sort((a, b) => b[1] - a[1])
                    .map(([language, count]) => (
                      <div className="language-stat-row" key={language}>
                        <span>{language}</span>
                        <div className="language-stat-track">
                          <span
                            style={{
                              width: `${Math.max(
                                5,
                                (count / Math.max(...Object.values(languageStats))) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <strong>{count}</strong>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="explorer-empty-copy">No recognized file extensions were found.</p>
              )}
            </section>

            <section className="repo-subpanel">
              <div className="repo-subpanel-heading">
                <h3>Important files</h3>
                <span>Project entry points</span>
              </div>
              {importantFiles.length ? (
                <div className="important-file-list">
                  {importantFiles.map((file) => (
                    <button
                      type="button"
                      key={file.path}
                      onClick={() => onSelectFile(file.path)}
                      className="important-file-button"
                    >
                      <span>▤</span>
                      <span>{file.path}</span>
                      <b>↗</b>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="explorer-empty-copy">No known project entry files detected.</p>
              )}
            </section>
          </div>

          <div className="repo-browser-grid">
            <section className="repo-subpanel file-tree-panel">
              <div className="repo-subpanel-heading">
                <h3>Files & folders</h3>
                <span>{tree.branch || "Default branch"}</span>
              </div>
              {treeNodes.length ? (
                <div className="file-tree">
                  {treeNodes.map((node) => (
                    <FileTreeNode
                      key={node.path}
                      node={node}
                      depth={0}
                      expandedPaths={expandedPaths}
                      onToggle={toggleFolder}
                      onSelectFile={onSelectFile}
                      selectedPath={selectedFile?.path}
                    />
                  ))}
                </div>
              ) : (
                <p className="explorer-empty-copy">This repository has no files to display.</p>
              )}
            </section>

            <section className="repo-subpanel source-preview-panel">
              <div className="repo-subpanel-heading">
                <h3>Source preview</h3>
                <span>{selectedFile?.name || "No file selected"}</span>
              </div>
              {fileLoading ? (
                <div className="explorer-message"><span className="spinner" /> Loading file…</div>
              ) : fileError ? (
                <div className="inline-feedback error-feedback">{fileError}</div>
              ) : selectedFile ? (
                <>
                  <div className="source-file-path">{selectedFile.path}</div>
                  <pre className="source-code"><code>{selectedFile.content}</code></pre>
                </>
              ) : (
                <div className="source-empty-state">
                  <span>⌘</span>
                  <strong>Select a file to preview its source code</strong>
                  <p>Choose a file from the explorer or important files list.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function FileTreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
  onSelectFile,
  selectedPath,
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedPaths.includes(node.path);

  return (
    <div>
      <button
        type="button"
        className={`file-tree-row ${selectedPath === node.path ? "selected" : ""}`}
        style={{ paddingLeft: `${10 + depth * 17}px` }}
        onClick={() =>
          isFolder ? onToggle(node.path) : onSelectFile(node.path)
        }
      >
        <span className="file-tree-chevron">
          {isFolder ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        <span className="file-tree-icon">{isFolder ? (isExpanded ? "📂" : "📁") : "▤"}</span>
        <span className="file-tree-name">{node.name}</span>
      </button>

      {isFolder && isExpanded && node.children.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onSelectFile={onSelectFile}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RepositoryDetails({ repository, formatDate }) {
  return (
    <section className="panel repository-details">
      <div className="panel-heading">
        <div className="panel-icon lavender-icon">⌘</div>

        <div>
          <h2>{repository.fullName}</h2>
          <p>
            {repository.description || "No repository description."}
          </p>
        </div>

        <a
          className="text-link"
          href={repository.url}
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub ↗
        </a>
      </div>

      <div className="metric-grid detail-metrics">
        <Metric
          label="Language"
          value={repository.language || "Unknown"}
          icon="◉"
        />

        <Metric
          label="Stars"
          value={Number(repository.stars || 0).toLocaleString()}
          icon="☆"
        />

        <Metric
          label="Forks"
          value={Number(repository.forks || 0).toLocaleString()}
          icon="⑂"
        />

        <Metric
          label="Open issues"
          value={Number(
            repository.openIssues || 0
          ).toLocaleString()}
          icon="◎"
        />
      </div>

      <div className="detail-meta">
        <span>
          Owner <strong>{repository.owner}</strong>
        </span>

        <span>
          Default branch{" "}
          <strong>{repository.defaultBranch || "—"}</strong>
        </span>

        <span>
          Created <strong>{formatDate(repository.createdAt)}</strong>
        </span>

        <span>
          Last updated{" "}
          <strong>{formatDate(repository.updatedAt)}</strong>
        </span>
      </div>

      <div className="success-note">
        <span>✓</span>
        Repository metadata retrieved successfully.
      </div>
    </section>
  );
}

export default App;