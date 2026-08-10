import { gql, useQuery } from "@apollo/client";

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows {
      id
      name
      description
      created_at
    }
  }
`;

export default function App() {
  const { loading, error, data } = useQuery(GET_WORKFLOWS);

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <p>Loading workflows...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="container">
          <div className="card error">
            <h2>GraphQL error</h2>
            <pre>{error.message}</pre>
          </div>
        </div>
      </main>
    );
  }

  const workflows = data?.workflows ?? [];

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <p className="eyebrow">AI AUTOMATION</p>
            <h1>AI Workflow Builder</h1>
            <p className="subtitle">
              Create and manage AI-powered workflows.
            </p>
          </div>

          <button className="primaryButton">
            + New Workflow
          </button>
        </header>

        <section className="stats">
          <div className="statCard">
            <span>Total Workflows</span>
            <strong>{workflows.length}</strong>
          </div>
        </section>

        <section className="card">
          <div className="sectionHeader">
            <h2>Workflows</h2>
            <span>{workflows.length} total</span>
          </div>

          {workflows.length === 0 ? (
            <div className="empty">
              <h3>No workflows yet</h3>
              <p>Create your first workflow to get started.</p>
            </div>
          ) : (
            <div className="workflowGrid">
              {workflows.map((workflow) => (
                <article className="workflowCard" key={workflow.id}>
                  <div>
                    <h3>{workflow.name}</h3>
                    <p>
                      {workflow.description ||
                        "AI-powered workflow"}
                    </p>
                  </div>

                  <small>
                    {workflow.created_at
                      ? new Date(
                          workflow.created_at
                        ).toLocaleDateString()
                      : ""}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}