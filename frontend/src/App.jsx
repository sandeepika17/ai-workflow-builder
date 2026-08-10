import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows {
      id
      name
      description
    }
  }
`;

function App() {
  const { loading, error, data } = useQuery(GET_WORKFLOWS);

  if (loading) {
    return (
      <div className="app">
        <h1>AI Workflow Builder</h1>
        <p>Loading workflows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <h1>AI Workflow Builder</h1>

        <div className="error">
          <h2>GraphQL error</h2>
          <pre>{error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>AI Workflow Builder</h1>
          <p>Create and manage AI-powered workflows</p>
        </div>

        <button>+ New Workflow</button>
      </header>

      <main>
        <section className="stats">
          <div className="card">
            <span>Total Workflows</span>
            <strong>{data?.workflows?.length ?? 0}</strong>
          </div>

          <div className="card">
            <span>Status</span>
            <strong>Ready</strong>
          </div>

          <div className="card">
            <span>Platform</span>
            <strong>Nhost</strong>
          </div>
        </section>

        <section className="workflow-section">
          <h2>Workflows</h2>

          {data?.workflows?.length === 0 ? (
            <div className="empty">
              <h3>No workflows yet</h3>
              <p>Create your first workflow to get started.</p>
            </div>
          ) : (
            <div className="workflow-grid">
              {data.workflows.map((workflow) => (
                <div className="workflow-card" key={workflow.id}>
                  <h3>{workflow.name}</h3>

                  <p>
                    {workflow.description || "No description provided."}
                  </p>

                  <div className="workflow-footer">
                    <span>Workflow</span>
                    <button>Open</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;