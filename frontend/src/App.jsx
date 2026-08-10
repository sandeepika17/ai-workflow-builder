import { gql, useQuery } from "@apollo/client";
import "./App.css";

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows {
      id
      name
    }
  }
`;

function App() {
  const { loading, error, data } = useQuery(GET_WORKFLOWS);

  return (
    <main className="app">
      <div className="container">
        <h1>AI Workflow Builder</h1>

        <p className="subtitle">
          Create and manage AI-powered workflows.
        </p>

        {loading && (
          <div className="card">
            <div className="loading">Loading workflows...</div>
          </div>
        )}

        {error && (
          <div className="card">
            <div className="error">
              <strong>GraphQL error</strong>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <section className="card">
            <div className="section-header">
              <h2>Workflows</h2>
              <span className="workflow-count">
                {data?.workflows?.length ?? 0}
              </span>
            </div>

            <div className="workflow-list">
              {data?.workflows?.map((workflow) => (
                <article className="workflow-item" key={workflow.id}>
                  <h3 className="workflow-name">
                    {workflow.name}
                  </h3>

                  <p className="workflow-id">
                    {workflow.id}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;