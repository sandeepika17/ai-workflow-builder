import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  useAuthenticated,
  useNhostClient,
  useUserData,
} from "@nhost/react";

const GET_ORGANIZATION = gql`
  query GetOrganization {
    organizations(limit: 1) {
      id
      name
      created_by
      quota_allowed
      quota_used
      quota_period_start
    }
  }
`;

const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($name: String!) {
    insert_organizations_one(
      object: {
        name: $name
      }
    ) {
      id
      name
      created_by
    }
  }
`;

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows(order_by: { created_at: desc }) {
      id
      org_id
      name
      description
      created_by
      created_at
      updated_at
    }
  }
`;

const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow(
    $orgId: uuid!
    $name: String!
    $description: String
  ) {
    insert_workflows_one(
      object: {
        org_id: $orgId
        name: $name
        description: $description
      }
    ) {
      id
      org_id
      name
      description
      created_by
      created_at
      updated_at
    }
  }
`;

function AuthScreen() {
  const nhost = useNhostClient();

  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 9) {
      setError("Password must be at least 9 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await nhost.auth.signUp({
          email,
          password,
          options: {
            displayName: displayName || undefined,
          },
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        setSuccess(
          "Account created. Please check your email if verification is required."
        );

        setMode("signin");
      } else {
        const result = await nhost.auth.signIn({
          email,
          password,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand-mark">AI</div>

        <p className="eyebrow">AI WORKFLOW BUILDER</p>

        <h1>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>

        <p className="auth-subtitle">
          {mode === "signin"
            ? "Sign in to access your workflow workspace."
            : "Create an account to start building workflows."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 9 characters"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          {success && <div className="auth-success">{success}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "signin" ? (
            <>
              Don't have an account?
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setSuccess("");
                }}
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setSuccess("");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Workspace() {
  const nhost = useNhostClient();
  const user = useUserData();

  const {
    loading: organizationLoading,
    error: organizationError,
    data: organizationData,
    refetch: refetchOrganization,
  } = useQuery(GET_ORGANIZATION);

  const {
    loading: workflowsLoading,
    error: workflowsError,
    data: workflowsData,
    refetch: refetchWorkflows,
  } = useQuery(GET_WORKFLOWS);

  const [createOrganization, { loading: creatingOrganization }] =
    useMutation(CREATE_ORGANIZATION);

  const [createWorkflow, { loading: creatingWorkflow }] =
    useMutation(CREATE_WORKFLOW);

  const organization = organizationData?.organizations?.[0] ?? null;
  const workflows = workflowsData?.workflows ?? [];

  async function handleCreateOrganization() {
    const name = window.prompt(
      "Enter a name for your workspace:",
      user?.displayName
        ? `${user.displayName}'s Workspace`
        : "My Workspace"
    );

    if (!name?.trim()) {
      return;
    }

    try {
      await createOrganization({
        variables: {
          name: name.trim(),
        },
      });

      await refetchOrganization();
      await refetchWorkflows();
    } catch (err) {
      window.alert(err.message || "Could not create workspace.");
    }
  }

  async function handleCreateWorkflow() {
    if (!organization) {
      window.alert("Create your workspace first.");
      return;
    }

    const name = window.prompt("Workflow name:");

    if (!name?.trim()) {
      return;
    }

    const description =
      window.prompt("Workflow description:", "") ?? "";

    try {
      await createWorkflow({
        variables: {
          orgId: organization.id,
          name: name.trim(),
          description: description.trim(),
        },
      });

      await refetchWorkflows();
    } catch (err) {
      window.alert(err.message || "Could not create workflow.");
    }
  }

  async function handleLogout() {
    await nhost.auth.signOut();
  }

  const loading = organizationLoading || workflowsLoading;
  const error = organizationError || workflowsError;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">AI</div>

          <div>
            <strong>Workflow Builder</strong>
            <span>Automation workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span>⌘</span>
            Workflows
          </button>

          <button className="nav-item">
            <span>▶</span>
            Runs
          </button>

          <button className="nav-item">
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="workspace-user">
          <span className="user-avatar">
            {(user?.displayName || user?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </span>

          <div>
            <strong>{user?.displayName || "My Workspace"}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">WORKSPACE</p>

            <h1>Workflows</h1>

            <p>
              Create, manage, and run your AI-powered workflows.
            </p>

            {organization && (
              <small>
                Workspace: <strong>{organization.name}</strong>
              </small>
            )}
          </div>

          <div className="header-actions">
            {!organization && !organizationLoading && (
              <button
                className="new-workflow"
                onClick={handleCreateOrganization}
                disabled={creatingOrganization}
              >
                {creatingOrganization
                  ? "Creating..."
                  : "+ Create Workspace"}
              </button>
            )}

            {organization && (
              <button
                className="new-workflow"
                onClick={handleCreateWorkflow}
                disabled={creatingWorkflow}
              >
                {creatingWorkflow
                  ? "Creating..."
                  : "+ New Workflow"}
              </button>
            )}

            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="stats">
          <div className="stat-card">
            <span>Total workflows</span>
            <strong>{workflows.length}</strong>
          </div>

          <div className="stat-card">
            <span>Active</span>
            <strong>{workflows.length}</strong>
          </div>

          <div className="stat-card">
            <span>Runs today</span>
            <strong>0</strong>
          </div>
        </section>

        {organizationError && (
          <div className="error">
            <h3>Organization error</h3>
            <pre>{organizationError.message}</pre>
          </div>
        )}

        {!organizationLoading &&
          !organizationError &&
          !organization && (
            <section className="workflow-section">
              <div className="section-heading">
                <div>
                  <h2>Create your workspace</h2>
                  <p>
                    Your account needs an organization before workflows
                    can be created.
                  </p>
                </div>
              </div>

              <button
                className="primary-button"
                onClick={handleCreateOrganization}
                disabled={creatingOrganization}
              >
                {creatingOrganization
                  ? "Creating workspace..."
                  : "Create workspace"}
              </button>
            </section>
          )}

        <section className="workflow-section">
          <div className="section-heading">
            <div>
              <h2>Your workflows</h2>
              <p>Select a workflow to configure and run it.</p>
            </div>

            <span className="count">{workflows.length}</span>
          </div>

          {loading && (
            <p className="status">Loading workspace...</p>
          )}

          {error && (
            <div className="error">
              <h3>GraphQL error</h3>
              <pre>{error.message}</pre>
            </div>
          )}

          {!loading &&
            !error &&
            organization &&
            workflows.length === 0 && (
              <div className="empty-state">
                <p>No workflows yet.</p>

                <button
                  className="primary-button"
                  onClick={handleCreateWorkflow}
                  disabled={creatingWorkflow}
                >
                  {creatingWorkflow
                    ? "Creating..."
                    : "Create your first workflow"}
                </button>
              </div>
            )}

          {!loading &&
            !error &&
            workflows.length > 0 && (
              <div className="workflow-grid">
                {workflows.map((workflow) => (
                  <article
                    className="workflow-card"
                    key={workflow.id}
                  >
                    <div className="workflow-card-top">
                      <div className="workflow-icon">✦</div>

                      <span className="ready">
                        <span>●</span> Ready
                      </span>
                    </div>

                    <h3>{workflow.name}</h3>

                    {workflow.description && (
                      <p>{workflow.description}</p>
                    )}

                    <div className="workflow-divider" />

                    <small>ID</small>

                    <code>{workflow.id}</code>

                    <button className="open-workflow">
                      Open workflow →
                    </button>
                  </article>
                ))}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthenticated();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <Workspace />;
}
