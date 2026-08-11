import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  useAuthenticated,
  useNhostClient,
  useUserData,
} from "@nhost/react";

const GET_MY_ORGANIZATIONS = gql`
  query GetMyOrganizations {
    organizations {
      id
      name
      created_by
      quota_allowed
      quota_used
      quota_period_start
      created_at
      updated_at
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
      quota_allowed
      quota_used
      quota_period_start
      created_at
      updated_at
    }
  }
`;

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows {
      id
      name
      description
      org_id
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
    <main className="auth-screen">
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

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
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

  const [organizationId, setOrganizationId] = useState(null);
  const [organizationError, setOrganizationError] = useState("");

  const {
    data: organizationData,
    loading: organizationsLoading,
    error: organizationsError,
  } = useQuery(GET_MY_ORGANIZATIONS);

  const [createOrganization] = useMutation(CREATE_ORGANIZATION);

  const {
    data: workflowsData,
    loading: workflowsLoading,
    error: workflowsError,
    refetch: refetchWorkflows,
  } = useQuery(GET_WORKFLOWS, {
    skip: !organizationId,
  });

  const [createWorkflow, { loading: creatingWorkflow }] =
    useMutation(CREATE_WORKFLOW);

  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowError, setWorkflowError] = useState("");

  const workflows = workflowsData?.workflows ?? [];

  useEffect(() => {
    let cancelled = false;

    async function initializeOrganization() {
      if (!user?.id || organizationsLoading) {
        return;
      }

      setOrganizationError("");

      try {
        if (organizationsError) {
          throw new Error(organizationsError.message);
        }

        const organizations = organizationData?.organizations ?? [];

        /*
         * If the user already has an organization,
         * use the first one.
         */
        if (organizations.length > 0) {
          if (!cancelled) {
            setOrganizationId(organizations[0].id);
          }

          return;
        }

        /*
         * No organization exists yet.
         *
         * The Hasura permission rule is responsible for
         * setting created_by from the authenticated user.
         */
        const result = await createOrganization({
          variables: {
            name: user.displayName?.trim() || "My Workspace",
          },
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        if (result.errors?.length) {
          throw new Error(result.errors[0].message);
        }

        const createdOrganization =
          result.data?.insert_organizations_one;

        if (!createdOrganization?.id) {
          throw new Error("Organization was not created.");
        }

        if (!cancelled) {
          setOrganizationId(createdOrganization.id);
        }
      } catch (err) {
        if (!cancelled) {
          setOrganizationError(
            err.message || "Unable to initialize your workspace."
          );
        }
      }
    }

    initializeOrganization();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    user?.displayName,
    organizationData,
    organizationsLoading,
    organizationsError,
    createOrganization,
  ]);

  async function handleLogout() {
    await nhost.auth.signOut();
  }

  async function handleCreateWorkflow(event) {
    event.preventDefault();

    setWorkflowError("");

    if (!organizationId) {
      setWorkflowError(
        "Your workspace is not ready yet. Please wait a moment and try again."
      );
      return;
    }

    if (!workflowName.trim()) {
      setWorkflowError("Please enter a workflow name.");
      return;
    }

    try {
      const result = await createWorkflow({
        variables: {
          orgId: organizationId,
          name: workflowName.trim(),
          description: workflowDescription.trim() || null,
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }

      const createdWorkflow =
        result.data?.insert_workflows_one;

      if (!createdWorkflow?.id) {
        throw new Error("Workflow was not created.");
      }

      setWorkflowName("");
      setWorkflowDescription("");
      setWorkflowError("");
      setShowCreateWorkflow(false);

      await refetchWorkflows();
    } catch (err) {
      setWorkflowError(
        err.message || "Unable to create workflow."
      );
    }
  }

  /*
   * IMPORTANT:
   *
   * We do NOT include !organizationId here.
   *
   * Otherwise a GraphQL/permission problem would appear
   * forever as "Loading workspace".
   */
  const loading =
    organizationsLoading ||
    (organizationId !== null && workflowsLoading);

  const error =
    organizationError ||
    organizationsError?.message ||
    workflowsError?.message ||
    workflowError;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AI</div>

          <div>
            <strong>Workflow Builder</strong>
            <span>Automation workspace</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item active"
            type="button"
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            <span>⌘</span>
            Workflows
          </button>

          <button
            className="nav-item"
            type="button"
            onClick={() => {
              alert("Runs page coming soon.");
            }}
          >
            <span>▶</span>
            Runs
          </button>

          <button
            className="nav-item"
            type="button"
            onClick={() => {
              alert("Settings page coming soon.");
            }}
          >
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
            <strong>
              {user?.displayName || "My Workspace"}
            </strong>

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
          </div>

          <div className="header-actions">
            <button
              className="new-workflow"
              type="button"
              onClick={() => {
                setWorkflowError("");
                setShowCreateWorkflow(true);
              }}
              disabled={loading || !organizationId}
            >
              + &nbsp; New Workflow
            </button>

            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {showCreateWorkflow && (
          <section className="workflow-create">
            <form onSubmit={handleCreateWorkflow}>
              <div className="workflow-create-header">
                <div>
                  <p className="eyebrow">NEW WORKFLOW</p>

                  <h2>Create workflow</h2>

                  <p>
                    Give your workflow a name and describe what it
                    should do.
                  </p>
                </div>
              </div>

              <div className="workflow-form-grid">
                <label className="workflow-field">
                  <span>Workflow name</span>

                  <input
                    type="text"
                    value={workflowName}
                    onChange={(event) =>
                      setWorkflowName(event.target.value)
                    }
                    placeholder="My AI workflow"
                    autoFocus
                  />
                </label>

                <label className="workflow-field workflow-description-field">
                  <span>Description</span>

                  <textarea
                    value={workflowDescription}
                    onChange={(event) =>
                      setWorkflowDescription(event.target.value)
                    }
                    placeholder="Describe what this workflow should do..."
                    rows={4}
                  />
                </label>
              </div>

              {workflowError && (
                <div className="auth-error">
                  {workflowError}
                </div>
              )}

              <div className="form-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    creatingWorkflow ||
                    !organizationId ||
                    !workflowName.trim()
                  }
                >
                  {creatingWorkflow
                    ? "Creating..."
                    : "Create workflow"}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setShowCreateWorkflow(false);
                    setWorkflowError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

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

        <section className="workflow-section">
          <div className="section-heading">
            <div>
              <h2>Your workflows</h2>

              <p>
                Select a workflow to configure and run it.
              </p>
            </div>

            <span className="count">
              {workflows.length}
            </span>
          </div>

          {loading && (
            <p className="status">
              Loading workspace...
            </p>
          )}

          {error && (
            <div className="error">
              <h3>Workspace error</h3>

              <pre>{error}</pre>
            </div>
          )}

          {!loading &&
            !error &&
            workflows.length === 0 && (
              <p className="status">
                No workflows yet. Click{" "}
                <strong>New Workflow</strong> to create your
                first one.
              </p>
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
                      <div className="workflow-icon">
                        ✦
                      </div>

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

                    <button
                      className="open-workflow"
                      type="button"
                      onClick={() => {
                        alert(
                          "Workflow editor coming soon."
                        );
                      }}
                    >
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
