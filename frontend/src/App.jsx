import { useEffect, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  useAuthenticated,
  useNhostClient,
  useUserData,
} from "@nhost/react";

/* ============================================================
   GRAPHQL
============================================================ */

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

const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow(
    $id: uuid!
    $name: String!
    $description: String
  ) {
    update_workflows_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
      }
    ) {
      id
      name
      description
      org_id
      updated_at
    }
  }
`;

const GET_WORKFLOW_STEPS = gql`
  query GetWorkflowSteps($workflowId: uuid!) {
    workflow_steps(
      where: { workflow_id: { _eq: $workflowId } }
      order_by: { position: asc }
    ) {
      id
      workflow_id
      position
      type
      config
      created_at
      updated_at
    }
  }
`;

const CREATE_WORKFLOW_STEP = gql`
  mutation CreateWorkflowStep(
    $workflowId: uuid!
    $position: Int!
    $type: workflow_step_type!
    $config: jsonb!
  ) {
    insert_workflow_steps_one(
      object: {
        workflow_id: $workflowId
        position: $position
        type: $type
        config: $config
      }
    ) {
      id
      workflow_id
      position
      type
      config
    }
  }
`;

const UPDATE_WORKFLOW_STEP = gql`
  mutation UpdateWorkflowStep(
    $id: uuid!
    $position: Int!
    $type: workflow_step_type!
    $config: jsonb!
  ) {
    update_workflow_steps_by_pk(
      pk_columns: { id: $id }
      _set: {
        position: $position
        type: $type
        config: $config
      }
    ) {
      id
      workflow_id
      position
      type
      config
    }
  }
`;

const DELETE_WORKFLOW_STEP = gql`
  mutation DeleteWorkflowStep($id: uuid!) {
    delete_workflow_steps_by_pk(id: $id) {
      id
    }
  }
`;

const GET_WORKFLOW_TRIGGERS = gql`
  query GetWorkflowTriggers($workflowId: uuid!) {
    workflow_triggers(
      where: { workflow_id: { _eq: $workflowId } }
      order_by: { created_at: asc }
    ) {
      id
      workflow_id
      type
      config
      enabled
      created_at
      updated_at
    }
  }
`;

const CREATE_WORKFLOW_TRIGGER = gql`
  mutation CreateWorkflowTrigger(
    $workflowId: uuid!
    $type: workflow_trigger_type!
    $config: jsonb!
    $enabled: Boolean!
  ) {
    insert_workflow_triggers_one(
      object: {
        workflow_id: $workflowId
        type: $type
        config: $config
        enabled: $enabled
      }
    ) {
      id
      workflow_id
      type
      config
      enabled
    }
  }
`;

const UPDATE_WORKFLOW_TRIGGER = gql`
  mutation UpdateWorkflowTrigger(
    $id: uuid!
    $type: workflow_trigger_type!
    $config: jsonb!
    $enabled: Boolean!
  ) {
    update_workflow_triggers_by_pk(
      pk_columns: { id: $id }
      _set: {
        type: $type
        config: $config
        enabled: $enabled
      }
    ) {
      id
      workflow_id
      type
      config
      enabled
    }
  }
`;

const DELETE_WORKFLOW_TRIGGER = gql`
  mutation DeleteWorkflowTrigger($id: uuid!) {
    delete_workflow_triggers_by_pk(id: $id) {
      id
    }
  }
`;

const GET_WORKFLOW_RUNS = gql`
  query GetWorkflowRuns {
    workflow_runs(
      order_by: { created_at: desc }
      limit: 100
    ) {
      id
      workflow_id
      status
      trigger_type
      created_by
      started_at
      completed_at
      error
      created_at
    }
  }
`;

const CREATE_WORKFLOW_RUN = gql`
  mutation CreateWorkflowRun(
    $workflowId: uuid!
    $triggerType: workflow_trigger_type!
  ) {
    insert_workflow_runs_one(
      object: {
        workflow_id: $workflowId
        trigger_type: $triggerType
        status: pending
      }
    ) {
      id
      workflow_id
      status
      trigger_type
      created_by
      started_at
      completed_at
      error
      created_at
    }
  }
`;

/* ============================================================
   CONSTANTS
============================================================ */

const STEP_TYPES = [
  {
    value: "llm_call",
    label: "LLM Call",
    icon: "✦",
    description: "Call an AI model with a prompt.",
  },
  {
    value: "http_request",
    label: "HTTP Request",
    icon: "↗",
    description: "Send a request to an external API.",
  },
  {
    value: "db_write",
    label: "Database Write",
    icon: "▣",
    description: "Write data to a database.",
  },
  {
    value: "notify",
    label: "Notify",
    icon: "●",
    description: "Send a notification.",
  },
  {
    value: "conditional_branch",
    label: "Conditional Branch",
    icon: "◇",
    description: "Branch based on a condition.",
  },
  {
    value: "approval_gate",
    label: "Approval Gate",
    icon: "✓",
    description: "Pause until an approval is received.",
  },
];

const TRIGGER_TYPES = [
  {
    value: "manual",
    label: "Manual",
    icon: "▶",
  },
  {
    value: "webhook",
    label: "Webhook",
    icon: "⌁",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    icon: "◷",
  },
  {
    value: "database_event",
    label: "Database Event",
    icon: "▣",
  },
];

const RUN_STATUSES = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
];

/* ============================================================
   HELPERS
============================================================ */

function getStepLabel(type) {
  return (
    STEP_TYPES.find((item) => item.value === type)?.label ||
    type
  );
}

function getTriggerLabel(type) {
  return (
    TRIGGER_TYPES.find((item) => item.value === type)?.label ||
    type
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function safeConfig(config) {
  if (!config) return {};

  if (typeof config === "object") {
    return config;
  }

  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

function defaultStepConfig(type) {
  switch (type) {
    case "llm_call":
      return {
        model: "default",
        prompt: "",
      };

    case "http_request":
      return {
        method: "GET",
        url: "",
        headers: {},
        body: "",
      };

    case "db_write":
      return {
        table: "",
        operation: "insert",
        data: {},
      };

    case "notify":
      return {
        channel: "email",
        recipient: "",
        message: "",
      };

    case "conditional_branch":
      return {
        condition: "",
      };

    case "approval_gate":
      return {
        approver: "",
        message: "",
      };

    default:
      return {};
  }
}

function defaultTriggerConfig(type) {
  switch (type) {
    case "webhook":
      return {
        path: "",
        method: "POST",
      };

    case "scheduled":
      return {
        cron: "0 * * * *",
      };

    case "database_event":
      return {
        table: "",
        event: "INSERT",
      };

    case "manual":
    default:
      return {};
  }
}

/* ============================================================
   AUTH
============================================================ */

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
          {mode === "signin"
            ? "Welcome back"
            : "Create your account"}
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
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
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
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 9 characters"
              autoComplete={
                mode === "signin"
                  ? "current-password"
                  : "new-password"
              }
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {success && (
            <div className="auth-success">{success}</div>
          )}

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

/* ============================================================
   SIDEBAR
============================================================ */

function Sidebar({
  page,
  setPage,
  user,
  onLogout,
}) {
  return (
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
          className={`nav-item ${
            page === "workflows" || page === "editor"
              ? "active"
              : ""
          }`}
          type="button"
          onClick={() => setPage("workflows")}
        >
          <span>⌘</span>
          Workflows
        </button>

        <button
          className={`nav-item ${
            page === "runs" ? "active" : ""
          }`}
          type="button"
          onClick={() => setPage("runs")}
        >
          <span>▶</span>
          Runs
        </button>

        <button
          className={`nav-item ${
            page === "settings" ? "active" : ""
          }`}
          type="button"
          onClick={() => setPage("settings")}
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

      <button
        type="button"
        className="logout-button"
        onClick={onLogout}
        style={{
          width: "100%",
          marginTop: 12,
        }}
      >
        Logout
      </button>
    </aside>
  );
}

/* ============================================================
   WORKFLOWS DASHBOARD
============================================================ */

function WorkflowsPage({
  organizationId,
  workflows,
  loading,
  error,
  onNewWorkflow,
  onOpenWorkflow,
}) {
  return (
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
            onClick={onNewWorkflow}
            disabled={!organizationId}
          >
            + &nbsp; New Workflow
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

      <section className="workflow-section">
        <div className="section-heading">
          <div>
            <h2>Your workflows</h2>
            <p>
              Select a workflow to configure and run it.
            </p>
          </div>

          <span className="count">{workflows.length}</span>
        </div>

        {loading && (
          <p className="status">Loading workspace...</p>
        )}

        {error && !loading && (
          <div className="error">
            <h3>GraphQL error</h3>
            <pre>{error}</pre>
          </div>
        )}

        {!loading &&
          !error &&
          workflows.length === 0 && (
            <div className="status">
              <p>
                No workflows yet. Create your first workflow
                to get started.
              </p>

              <button
                className="new-workflow"
                type="button"
                onClick={onNewWorkflow}
              >
                + Create your first workflow
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

                  <button
                    className="open-workflow"
                    type="button"
                    onClick={() =>
                      onOpenWorkflow(workflow.id)
                    }
                  >
                    Open workflow →
                  </button>
                </article>
              ))}
            </div>
          )}
      </section>
    </main>
  );
}

/* ============================================================
   CREATE WORKFLOW
============================================================ */

function CreateWorkflowPanel({
  onCancel,
  onCreated,
  organizationId,
}) {
  const [createWorkflow, { loading }] =
    useMutation(CREATE_WORKFLOW);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    setError("");

    if (!organizationId) {
      setError("Workspace is still loading.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a workflow name.");
      return;
    }

    try {
      const result = await createWorkflow({
        variables: {
          orgId: organizationId,
          name: name.trim(),
          description: description.trim() || null,
        },
      });

      if (result.errors?.length) {
        throw new Error(result.errors[0].message);
      }

      const created =
        result.data?.insert_workflows_one;

      if (!created?.id) {
        throw new Error("Workflow was not created.");
      }

      onCreated(created.id);
    } catch (err) {
      setError(
        err.message || "Unable to create workflow."
      );
    }
  }

  return (
    <section className="workflow-create">
      <form onSubmit={submit}>
        <h2>Create workflow</h2>

        <label>
          Workflow name
          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="My AI workflow"
            autoFocus
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="What does this workflow do?"
            rows="4"
          />
        </label>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Creating..."
              : "Create workflow"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

/* ============================================================
   WORKFLOW EDITOR
============================================================ */

function WorkflowEditor({
  workflow,
  onBack,
  onRun,
}) {
  const [name, setName] = useState(workflow.name || "");
  const [description, setDescription] = useState(
    workflow.description || ""
  );

  const [activeTab, setActiveTab] = useState("steps");

  const {
    data: stepsData,
    loading: stepsLoading,
    error: stepsError,
    refetch: refetchSteps,
  } = useQuery(GET_WORKFLOW_STEPS, {
    variables: {
      workflowId: workflow.id,
    },
  });

  const {
    data: triggersData,
    loading: triggersLoading,
    error: triggersError,
    refetch: refetchTriggers,
  } = useQuery(GET_WORKFLOW_TRIGGERS, {
    variables: {
      workflowId: workflow.id,
    },
  });

  const [updateWorkflow] =
    useMutation(UPDATE_WORKFLOW);

  const [createStep] =
    useMutation(CREATE_WORKFLOW_STEP);

  const [updateStep] =
    useMutation(UPDATE_WORKFLOW_STEP);

  const [deleteStep] =
    useMutation(DELETE_WORKFLOW_STEP);

  const [createTrigger] =
    useMutation(CREATE_WORKFLOW_TRIGGER);

  const [updateTrigger] =
    useMutation(UPDATE_WORKFLOW_TRIGGER);

  const [deleteTrigger] =
    useMutation(DELETE_WORKFLOW_TRIGGER);

  const [steps, setSteps] = useState([]);
  const [trigger, setTrigger] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loaded =
      stepsData?.workflow_steps || [];

    setSteps(
      loaded.map((step) => ({
        ...step,
        config: safeConfig(step.config),
      }))
    );
  }, [stepsData]);

  useEffect(() => {
    const loaded =
      triggersData?.workflow_triggers || [];

    if (loaded.length > 0) {
      setTrigger({
        ...loaded[0],
        config: safeConfig(loaded[0].config),
      });
    } else {
      setTrigger({
        id: null,
        workflow_id: workflow.id,
        type: "manual",
        config: {},
        enabled: true,
      });
    }
  }, [triggersData, workflow.id]);

  function addStep() {
    const nextType = "llm_call";

    setSteps((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        workflow_id: workflow.id,
        position: current.length,
        type: nextType,
        config: defaultStepConfig(nextType),
        isNew: true,
      },
    ]);
  }

  function updateLocalStep(id, patch) {
    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              ...patch,
            }
          : step
      )
    );
  }

  function removeLocalStep(id) {
    setSteps((current) =>
      current.filter((step) => step.id !== id)
    );
  }

  function moveStep(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= steps.length) {
      return;
    }

    const copy = [...steps];

    [copy[index], copy[target]] = [
      copy[target],
      copy[index],
    ];

    setSteps(
      copy.map((step, position) => ({
        ...step,
        position,
      }))
    );
  }

  async function saveWorkflow() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateWorkflow({
        variables: {
          id: workflow.id,
          name: name.trim() || "Untitled workflow",
          description: description.trim() || null,
        },
      });

      /*
       * Save trigger.
       */
      if (trigger) {
        const triggerConfig =
          safeConfig(trigger.config);

        if (trigger.id) {
          await updateTrigger({
            variables: {
              id: trigger.id,
              type: trigger.type,
              config: triggerConfig,
              enabled: Boolean(trigger.enabled),
            },
          });
        } else {
          await createTrigger({
            variables: {
              workflowId: workflow.id,
              type: trigger.type,
              config: triggerConfig,
              enabled: Boolean(trigger.enabled),
            },
          });
        }
      }

      /*
       * Save steps.
       */
      const existingIds = new Set(
        (stepsData?.workflow_steps || []).map(
          (step) => step.id
        )
      );

      const currentIds = new Set(
        steps
          .filter((step) => !step.isNew)
          .map((step) => step.id)
      );

      /*
       * Delete steps removed from editor.
       */
      for (const oldStep of stepsData?.workflow_steps ||
        []) {
        if (!currentIds.has(oldStep.id)) {
          await deleteStep({
            variables: {
              id: oldStep.id,
            },
          });
        }
      }

      /*
       * Create/update current steps.
       */
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];

        const variables = {
          workflowId: workflow.id,
          position: index,
          type: step.type,
          config: safeConfig(step.config),
        };

        if (
          !step.isNew &&
          existingIds.has(step.id)
        ) {
          await updateStep({
            variables: {
              id: step.id,
              position: index,
              type: step.type,
              config: safeConfig(step.config),
            },
          });
        } else {
          await createStep({
            variables,
          });
        }
      }

      await refetchSteps();
      await refetchTriggers();

      setMessage("Workflow saved successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to save workflow."
      );
    } finally {
      setSaving(false);
    }
  }

  if (stepsLoading || triggersLoading) {
    return (
      <main className="workspace">
        <p className="status">
          Loading workflow editor...
        </p>
      </main>
    );
  }

  if (stepsError || triggersError) {
    return (
      <main className="workspace">
        <button
          className="open-workflow"
          type="button"
          onClick={onBack}
        >
          ← Back to workflows
        </button>

        <div className="error">
          <h3>Unable to load workflow editor</h3>
          <pre>
            {stepsError?.message ||
              triggersError?.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <button
            type="button"
            onClick={onBack}
            style={backButtonStyle}
          >
            ← Back to workflows
          </button>

          <p
            className="eyebrow"
            style={{ marginTop: 18 }}
          >
            WORKFLOW EDITOR
          </p>

          <h1>{name || "Untitled workflow"}</h1>

          <p>
            Configure the trigger and workflow steps.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="new-workflow"
            type="button"
            onClick={saveWorkflow}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save workflow"}
          </button>

          <button
            className="logout-button"
            type="button"
            onClick={onRun}
          >
            ▶ Run
          </button>
        </div>
      </header>

      {message && (
        <div
          className="auth-success"
          style={{ marginBottom: 20 }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="auth-error"
          style={{ marginBottom: 20 }}
        >
          {error}
        </div>
      )}

      <section style={editorPanelStyle}>
        <div style={editorTabsStyle}>
          <button
            type="button"
            onClick={() => setActiveTab("steps")}
            style={
              activeTab === "steps"
                ? activeTabStyle
                : tabStyle
            }
          >
            Workflow steps
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trigger")}
            style={
              activeTab === "trigger"
                ? activeTabStyle
                : tabStyle
            }
          >
            Trigger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("details")}
            style={
              activeTab === "details"
                ? activeTabStyle
                : tabStyle
            }
          >
            Details
          </button>
        </div>

        {activeTab === "details" && (
          <div style={editorContentStyle}>
            <h2>Workflow details</h2>

            <label style={fieldLabelStyle}>
              Workflow name
              <input
                style={editorInputStyle}
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Workflow name"
              />
            </label>

            <label style={fieldLabelStyle}>
              Description
              <textarea
                style={editorTextareaStyle}
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Describe what this workflow does..."
                rows={5}
              />
            </label>
          </div>
        )}

        {activeTab === "trigger" && trigger && (
          <div style={editorContentStyle}>
            <div style={editorTitleRowStyle}>
              <div>
                <h2>Workflow trigger</h2>
                <p style={mutedStyle}>
                  Choose how this workflow starts.
                </p>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(trigger.enabled)}
                  onChange={(event) =>
                    setTrigger({
                      ...trigger,
                      enabled: event.target.checked,
                    })
                  }
                />
                Enabled
              </label>
            </div>

            <div style={triggerGridStyle}>
              {TRIGGER_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setTrigger({
                      ...trigger,
                      type: item.value,
                      config:
                        defaultTriggerConfig(
                          item.value
                        ),
                    })
                  }
                  style={{
                    ...triggerCardStyle,
                    ...(trigger.type === item.value
                      ? selectedCardStyle
                      : {}),
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {item.icon}
                  </span>

                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>

            <div style={configBoxStyle}>
              <h3>
                {getTriggerLabel(trigger.type)} settings
              </h3>

              {trigger.type === "manual" && (
                <p style={mutedStyle}>
                  This workflow can be started manually
                  from the editor or Runs page.
                </p>
              )}

              {trigger.type === "webhook" && (
                <>
                  <label style={fieldLabelStyle}>
                    Webhook path
                    <input
                      style={editorInputStyle}
                      value={
                        trigger.config?.path || ""
                      }
                      onChange={(event) =>
                        setTrigger({
                          ...trigger,
                          config: {
                            ...trigger.config,
                            path: event.target.value,
                          },
                        })
                      }
                      placeholder="/webhooks/my-workflow"
                    />
                  </label>

                  <label style={fieldLabelStyle}>
                    Method
                    <select
                      style={editorInputStyle}
                      value={
                        trigger.config?.method || "POST"
                      }
                      onChange={(event) =>
                        setTrigger({
                          ...trigger,
                          config: {
                            ...trigger.config,
                            method:
                              event.target.value,
                          },
                        })
                      }
                    >
                      <option>POST</option>
                      <option>GET</option>
                    </select>
                  </label>
                </>
              )}

              {trigger.type === "scheduled" && (
                <label style={fieldLabelStyle}>
                  Cron expression
                  <input
                    style={editorInputStyle}
                    value={
                      trigger.config?.cron ||
                      "0 * * * *"
                    }
                    onChange={(event) =>
                      setTrigger({
                        ...trigger,
                        config: {
                          ...trigger.config,
                          cron: event.target.value,
                        },
                      })
                    }
                    placeholder="0 * * * *"
                  />
                </label>
              )}

              {trigger.type === "database_event" && (
                <>
                  <label style={fieldLabelStyle}>
                    Database table
                    <input
                      style={editorInputStyle}
                      value={
                        trigger.config?.table || ""
                      }
                      onChange={(event) =>
                        setTrigger({
                          ...trigger,
                          config: {
                            ...trigger.config,
                            table: event.target.value,
                          },
                        })
                      }
                      placeholder="public.users"
                    />
                  </label>

                  <label style={fieldLabelStyle}>
                    Event
                    <select
                      style={editorInputStyle}
                      value={
                        trigger.config?.event ||
                        "INSERT"
                      }
                      onChange={(event) =>
                        setTrigger({
                          ...trigger,
                          config: {
                            ...trigger.config,
                            event:
                              event.target.value,
                          },
                        })
                      }
                    >
                      <option>INSERT</option>
                      <option>UPDATE</option>
                      <option>DELETE</option>
                    </select>
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "steps" && (
          <div style={editorContentStyle}>
            <div style={editorTitleRowStyle}>
              <div>
                <h2>Workflow steps</h2>
                <p style={mutedStyle}>
                  Build the automation one step at a time.
                </p>
              </div>

              <button
                className="new-workflow"
                type="button"
                onClick={addStep}
              >
                + Add step
              </button>
            </div>

            {steps.length === 0 && (
              <div style={emptyEditorStyle}>
                <div style={{ fontSize: 36 }}>
                  ✦
                </div>

                <h3>No steps yet</h3>

                <p style={mutedStyle}>
                  Add your first workflow step.
                </p>

                <button
                  className="new-workflow"
                  type="button"
                  onClick={addStep}
                >
                  + Add first step
                </button>
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  style={stepCardStyle}
                >
                  <div style={stepHeaderStyle}>
                    <div style={stepNumberStyle}>
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong>
                        {getStepLabel(step.type)}
                      </strong>

                      <div style={mutedStyle}>
                        Step {index + 1}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        moveStep(index, -1)
                      }
                      disabled={index === 0}
                      style={smallButtonStyle}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        moveStep(index, 1)
                      }
                      disabled={
                        index === steps.length - 1
                      }
                      style={smallButtonStyle}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeLocalStep(step.id)
                      }
                      style={deleteButtonStyle}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={stepBodyStyle}>
                    <label style={fieldLabelStyle}>
                      Step type
                      <select
                        style={editorInputStyle}
                        value={step.type}
                        onChange={(event) => {
                          const nextType =
                            event.target.value;

                          updateLocalStep(step.id, {
                            type: nextType,
                            config:
                              defaultStepConfig(
                                nextType
                              ),
                          });
                        }}
                      >
                        {STEP_TYPES.map((item) => (
                          <option
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {step.type === "llm_call" && (
                      <>
                        <label
                          style={fieldLabelStyle}
                        >
                          Model
                          <input
                            style={editorInputStyle}
                            value={
                              step.config?.model ||
                              "default"
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    model:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                          />
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Prompt
                          <textarea
                            style={
                              editorTextareaStyle
                            }
                            value={
                              step.config?.prompt ||
                              ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    prompt:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            placeholder="Enter the prompt for the AI model..."
                            rows={5}
                          />
                        </label>
                      </>
                    )}

                    {step.type === "http_request" && (
                      <>
                        <label
                          style={fieldLabelStyle}
                        >
                          HTTP method
                          <select
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config?.method ||
                              "GET"
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    method:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                          >
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>PATCH</option>
                            <option>DELETE</option>
                          </select>
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          URL
                          <input
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config?.url || ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    url: event.target
                                      .value,
                                  },
                                }
                              )
                            }
                            placeholder="https://api.example.com/..."
                          />
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Request body
                          <textarea
                            style={
                              editorTextareaStyle
                            }
                            value={
                              step.config?.body || ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    body: event.target
                                      .value,
                                  },
                                }
                              )
                            }
                            placeholder='{"key":"value"}'
                            rows={4}
                          />
                        </label>
                      </>
                    )}

                    {step.type === "db_write" && (
                      <>
                        <label
                          style={fieldLabelStyle}
                        >
                          Table
                          <input
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config?.table ||
                              ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    table:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            placeholder="public.my_table"
                          />
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Operation
                          <select
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config
                                ?.operation ||
                              "insert"
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    operation:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                          >
                            <option value="insert">
                              Insert
                            </option>
                            <option value="update">
                              Update
                            </option>
                            <option value="upsert">
                              Upsert
                            </option>
                          </select>
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Data JSON
                          <textarea
                            style={
                              editorTextareaStyle
                            }
                            value={JSON.stringify(
                              step.config?.data ||
                                {},
                              null,
                              2
                            )}
                            onChange={(event) => {
                              try {
                                const parsed =
                                  JSON.parse(
                                    event.target
                                      .value
                                  );

                                updateLocalStep(
                                  step.id,
                                  {
                                    config: {
                                      ...step.config,
                                      data: parsed,
                                    },
                                  }
                                );
                              } catch {
                                /*
                                 * Keep current data until
                                 * valid JSON is entered.
                                 */
                              }
                            }}
                            rows={6}
                          />
                        </label>
                      </>
                    )}

                    {step.type === "notify" && (
                      <>
                        <label
                          style={fieldLabelStyle}
                        >
                          Channel
                          <select
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config?.channel ||
                              "email"
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    channel:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                          >
                            <option value="email">
                              Email
                            </option>
                            <option value="slack">
                              Slack
                            </option>
                            <option value="webhook">
                              Webhook
                            </option>
                          </select>
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Recipient
                          <input
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config
                                ?.recipient ||
                              ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    recipient:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            placeholder="user@example.com"
                          />
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Message
                          <textarea
                            style={
                              editorTextareaStyle
                            }
                            value={
                              step.config?.message ||
                              ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    message:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            rows={4}
                          />
                        </label>
                      </>
                    )}

                    {step.type ===
                      "conditional_branch" && (
                      <label
                        style={fieldLabelStyle}
                      >
                        Condition
                        <textarea
                          style={
                            editorTextareaStyle
                          }
                          value={
                            step.config
                              ?.condition || ""
                          }
                          onChange={(event) =>
                            updateLocalStep(
                              step.id,
                              {
                                config: {
                                  ...step.config,
                                  condition:
                                    event.target
                                      .value,
                                },
                              }
                            )
                          }
                          placeholder="Example: output.status === 'approved'"
                          rows={4}
                        />
                      </label>
                    )}

                    {step.type === "approval_gate" && (
                      <>
                        <label
                          style={fieldLabelStyle}
                        >
                          Approver
                          <input
                            style={
                              editorInputStyle
                            }
                            value={
                              step.config
                                ?.approver || ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    approver:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            placeholder="Approver email"
                          />
                        </label>

                        <label
                          style={fieldLabelStyle}
                        >
                          Approval message
                          <textarea
                            style={
                              editorTextareaStyle
                            }
                            value={
                              step.config?.message ||
                              ""
                            }
                            onChange={(event) =>
                              updateLocalStep(
                                step.id,
                                {
                                  config: {
                                    ...step.config,
                                    message:
                                      event.target
                                        .value,
                                  },
                                }
                              )
                            }
                            rows={4}
                          />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {steps.length > 0 && (
              <button
                className="new-workflow"
                type="button"
                onClick={addStep}
                style={{ marginTop: 20 }}
              >
                + Add another step
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

/* ============================================================
   RUNS PAGE
============================================================ */

function RunsPage({
  workflows,
}) {
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_WORKFLOW_RUNS);

  const runs = data?.workflow_runs || [];

  function workflowName(workflowId) {
    return (
      workflows.find(
        (workflow) => workflow.id === workflowId
      )?.name || "Unknown workflow"
    );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">EXECUTION HISTORY</p>
          <h1>Runs</h1>
          <p>
            Monitor workflow executions and their status.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="new-workflow"
            type="button"
            onClick={() => refetch()}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <section style={editorPanelStyle}>
        {loading && (
          <p className="status">Loading runs...</p>
        )}

        {error && !loading && (
          <div className="error">
            <h3>Unable to load runs</h3>
            <pre>{error.message}</pre>
          </div>
        )}

        {!loading &&
          !error &&
          runs.length === 0 && (
            <div style={emptyEditorStyle}>
              <div style={{ fontSize: 40 }}>▶</div>
              <h2>No runs yet</h2>
              <p style={mutedStyle}>
                Start a workflow from the workflow editor
                and its execution will appear here.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          runs.length > 0 && (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      Workflow
                    </th>
                    <th style={tableHeaderStyle}>
                      Status
                    </th>
                    <th style={tableHeaderStyle}>
                      Trigger
                    </th>
                    <th style={tableHeaderStyle}>
                      Started
                    </th>
                    <th style={tableHeaderStyle}>
                      Completed
                    </th>
                    <th style={tableHeaderStyle}>
                      Error
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={tableCellStyle}>
                        <strong>
                          {workflowName(
                            run.workflow_id
                          )}
                        </strong>

                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.55,
                            marginTop: 4,
                          }}
                        >
                          {run.id}
                        </div>
                      </td>

                      <td style={tableCellStyle}>
                        <span
                          style={{
                            ...statusBadgeStyle,
                            ...(run.status ===
                            "completed"
                              ? {
                                  background:
                                    "#e9f8ef",
                                  color: "#18794e",
                                }
                              : run.status ===
                                  "failed"
                                ? {
                                    background:
                                      "#fff0f0",
                                    color: "#c62828",
                                  }
                                : run.status ===
                                    "running"
                                  ? {
                                      background:
                                        "#eef4ff",
                                      color:
                                        "#356ae6",
                                    }
                                  : {
                                      background:
                                        "#f3f4f6",
                                      color:
                                        "#555",
                                    }),
                          }}
                        >
                          {run.status}
                        </span>
                      </td>

                      <td style={tableCellStyle}>
                        {getTriggerLabel(
                          run.trigger_type
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {formatDate(run.started_at)}
                      </td>

                      <td style={tableCellStyle}>
                        {formatDate(
                          run.completed_at
                        )}
                      </td>

                      <td style={tableCellStyle}>
                        {run.error || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </main>
  );
}

/* ============================================================
   SETTINGS PAGE
============================================================ */

function SettingsPage({
  user,
  organization,
  onLogout,
}) {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>Settings</h1>
          <p>
            Manage your workspace and account information.
          </p>
        </div>
      </header>

      <section style={settingsGridStyle}>
        <div style={settingsCardStyle}>
          <div style={settingsIconStyle}>◎</div>

          <div>
            <h2>Account</h2>
            <p style={mutedStyle}>
              Your authenticated Nhost account.
            </p>
          </div>

          <div style={settingsFieldStyle}>
            <span>Name</span>
            <strong>
              {user?.displayName || "Not set"}
            </strong>
          </div>

          <div style={settingsFieldStyle}>
            <span>Email</span>
            <strong>{user?.email || "—"}</strong>
          </div>

          <div style={settingsFieldStyle}>
            <span>User ID</span>
            <code>{user?.id || "—"}</code>
          </div>
        </div>

        <div style={settingsCardStyle}>
          <div style={settingsIconStyle}>⌘</div>

          <div>
            <h2>Workspace</h2>
            <p style={mutedStyle}>
              Current organization information.
            </p>
          </div>

          <div style={settingsFieldStyle}>
            <span>Workspace name</span>
            <strong>
              {organization?.name || "My Workspace"}
            </strong>
          </div>

          <div style={settingsFieldStyle}>
            <span>Organization ID</span>
            <code>
              {organization?.id || "—"}
            </code>
          </div>

          <div style={settingsFieldStyle}>
            <span>Quota</span>
            <strong>
              {organization?.quota_used ?? 0}
              {" / "}
              {organization?.quota_allowed ?? "—"}
            </strong>
          </div>
        </div>

        <div style={settingsCardStyle}>
          <div style={settingsIconStyle}>⚙</div>

          <div>
            <h2>Session</h2>
            <p style={mutedStyle}>
              Sign out of the current account.
            </p>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={onLogout}
            style={{
              width: "fit-content",
              marginTop: 12,
            }}
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   WORKSPACE
============================================================ */

function Workspace() {
  const nhost = useNhostClient();
  const user = useUserData();

  const [page, setPage] = useState("workflows");
  const [selectedWorkflowId, setSelectedWorkflowId] =
    useState(null);

  const [organizationId, setOrganizationId] =
    useState(null);

  const [organizationError, setOrganizationError] =
    useState("");

  const {
    data: organizationData,
    loading: organizationsLoading,
    error: organizationsError,
  } = useQuery(GET_MY_ORGANIZATIONS);

  const [createOrganization] =
    useMutation(CREATE_ORGANIZATION);

  const {
    data: workflowsData,
    loading: workflowsLoading,
    error: workflowsError,
    refetch: refetchWorkflows,
  } = useQuery(GET_WORKFLOWS, {
    skip: !organizationId,
  });

  const [showCreateWorkflow, setShowCreateWorkflow] =
    useState(false);

  const workflows =
    workflowsData?.workflows || [];

  const organization =
    organizationData?.organizations?.[0] || null;

  useEffect(() => {
    let cancelled = false;

    async function initializeOrganization() {
      if (!user?.id || organizationsLoading) {
        return;
      }

      setOrganizationError("");

      try {
        if (organizationsError) {
          throw new Error(
            organizationsError.message
          );
        }

        const organizations =
          organizationData?.organizations || [];

        if (organizations.length > 0) {
          if (!cancelled) {
            setOrganizationId(
              organizations[0].id
            );
          }

          return;
        }

        const result = await createOrganization({
          variables: {
            name:
              user.displayName?.trim() ||
              "My Workspace",
          },
        });

        if (result.errors?.length) {
          throw new Error(
            result.errors[0].message
          );
        }

        const created =
          result.data?.insert_organizations_one;

        if (!created?.id) {
          throw new Error(
            "Organization was not created."
          );
        }

        if (!cancelled) {
          setOrganizationId(created.id);
        }
      } catch (err) {
        if (!cancelled) {
          setOrganizationError(
            err.message ||
              "Unable to initialize your workspace."
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

  function openWorkflow(id) {
    setSelectedWorkflowId(id);
    setPage("editor");
  }

  function openRuns() {
    setPage("runs");
  }

  function openSettings() {
    setPage("settings");
  }

  const selectedWorkflow =
    workflows.find(
      (workflow) =>
        workflow.id === selectedWorkflowId
    ) || null;

  const workspaceLoading =
    organizationsLoading ||
    !organizationId;

  const workspaceError =
    organizationError ||
    organizationsError?.message ||
    workflowsError?.message ||
    "";

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={(nextPage) => {
          if (nextPage === "runs") {
            openRuns();
            return;
          }

          if (nextPage === "settings") {
            openSettings();
            return;
          }

          setPage(nextPage);
        }}
        user={user}
        onLogout={handleLogout}
      />

      {page === "workflows" && (
        <>
          {showCreateWorkflow ? (
            <main className="workspace">
              <header className="workspace-header">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateWorkflow(false)
                    }
                    style={backButtonStyle}
                  >
                    ← Back to workflows
                  </button>

                  <p
                    className="eyebrow"
                    style={{
                      marginTop: 18,
                    }}
                  >
                    NEW WORKFLOW
                  </p>

                  <h1>Create workflow</h1>

                  <p>
                    Create a workflow and configure it
                    in the editor.
                  </p>
                </div>
              </header>

              <CreateWorkflowPanel
                organizationId={organizationId}
                onCancel={() =>
                  setShowCreateWorkflow(false)
                }
                onCreated={async (workflowId) => {
                  await refetchWorkflows();
                  setShowCreateWorkflow(false);
                  setSelectedWorkflowId(
                    workflowId
                  );
                  setPage("editor");
                }}
              />
            </main>
          ) : (
            <WorkflowsPage
              organizationId={organizationId}
              workflows={workflows}
              loading={
                workspaceLoading ||
                workflowsLoading
              }
              error={workspaceError}
              onNewWorkflow={() =>
                setShowCreateWorkflow(true)
              }
              onOpenWorkflow={openWorkflow}
            />
          )}
        </>
      )}

      {page === "editor" &&
        selectedWorkflow && (
          <WorkflowEditor
            workflow={selectedWorkflow}
            onBack={() => {
              setPage("workflows");
              refetchWorkflows();
            }}
            onRun={() => {
              setPage("runs");
            }}
          />
        )}

      {page === "editor" &&
        !selectedWorkflow && (
          <main className="workspace">
            <button
              type="button"
              onClick={() => setPage("workflows")}
              style={backButtonStyle}
            >
              ← Back to workflows
            </button>

            <div className="status">
              Please select a workflow first.
            </div>
          </main>
        )}

      {page === "runs" && (
        <RunsPage workflows={workflows} />
      )}

      {page === "settings" && (
        <SettingsPage
          user={user}
          organization={organization}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

/* ============================================================
   STYLES USED BY NEW PAGES
   These are inline so you do NOT need to modify CSS.
============================================================ */

const mutedStyle = {
  color: "#727786",
  fontSize: 14,
  lineHeight: 1.6,
};

const backButtonStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  color: "inherit",
  fontWeight: 600,
};

const editorPanelStyle = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(20,25,40,0.08)",
  borderRadius: 20,
  boxShadow: "0 12px 40px rgba(20,25,40,0.06)",
  overflow: "hidden",
};

const editorTabsStyle = {
  display: "flex",
  gap: 4,
  padding: 8,
  borderBottom: "1px solid rgba(20,25,40,0.08)",
  background: "rgba(248,249,252,0.8)",
};

const tabStyle = {
  border: "none",
  background: "transparent",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  color: "#666b78",
  fontWeight: 600,
};

const activeTabStyle = {
  ...tabStyle,
  background: "#ffffff",
  color: "#161923",
  boxShadow: "0 2px 8px rgba(20,25,40,0.08)",
};

const editorContentStyle = {
  padding: 28,
};

const editorTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
};

const fieldLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 18,
};

const editorInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #dfe2e8",
  background: "#fafbfc",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
};

const editorTextareaStyle = {
  ...editorInputStyle,
  resize: "vertical",
  lineHeight: 1.5,
};

const triggerGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

const triggerCardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  padding: 18,
  minHeight: 110,
  textAlign: "left",
  border: "1px solid #e2e5ea",
  background: "#fff",
  borderRadius: 14,
  cursor: "pointer",
};

const selectedCardStyle = {
  border: "1px solid #5b63f6",
  boxShadow:
    "0 0 0 3px rgba(91,99,246,0.10)",
};

const configBoxStyle = {
  background: "#f8f9fb",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
};

const stepCardStyle = {
  border: "1px solid #e2e5ea",
  borderRadius: 16,
  background: "#fff",
  overflow: "hidden",
};

const stepHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  background: "#fafbfc",
  borderBottom: "1px solid #e8e9ed",
};

const stepBodyStyle = {
  padding: 20,
};

const stepNumberStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#161923",
  color: "#fff",
  fontWeight: 700,
};

const smallButtonStyle = {
  border: "1px solid #dfe2e8",
  background: "#fff",
  borderRadius: 8,
  width: 34,
  height: 34,
  cursor: "pointer",
};

const deleteButtonStyle = {
  border: "1px solid #f0caca",
  background: "#fff7f7",
  color: "#b42318",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
};

const emptyEditorStyle = {
  textAlign: "center",
  padding: "60px 20px",
  border: "1px dashed #dfe2e8",
  borderRadius: 16,
  marginBottom: 20,
};

const tableHeaderStyle = {
  textAlign: "left",
  padding: "14px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#727786",
};

const tableCellStyle = {
  padding: "16px 12px",
  borderBottom: "1px solid #eef0f3",
  verticalAlign: "top",
  fontSize: 14,
};

const statusBadgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "capitalize",
};

const settingsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 18,
};

const settingsCardStyle = {
  background: "#fff",
  border: "1px solid rgba(20,25,40,0.08)",
  borderRadius: 18,
  padding: 24,
  boxShadow:
    "0 10px 30px rgba(20,25,40,0.05)",
};

const settingsIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f1f3f8",
  fontSize: 20,
  marginBottom: 18,
};

const settingsFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  paddingTop: 16,
  marginTop: 16,
  borderTop: "1px solid #eef0f3",
};

/* ============================================================
   APP
============================================================ */

export default function App() {
  const isAuthenticated = useAuthenticated();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <Workspace />;
}