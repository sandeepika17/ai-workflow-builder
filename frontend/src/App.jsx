import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_WORKFLOWS = gql`
  query GetWorkflows {
    workflows {
      id
      name
    }
  }
`;

export default function App() {
  const { loading, error, data } = useQuery(GET_WORKFLOWS);

  return (
    <main className="page">
      <div className="container">
        <header className="hero">
          <h1>AI Workflow Builder</h1>
          <p>Create and manage AI-powered workflows.</p>
        </header>

        <section className="card">
          <div className="section-header">
            <h2>Workflows</h2>
            {!loading && !error && (
              <span className="count">{data?.workflows?.length ?? 0}</span>
            )}
          </div>

          {loading && <p className="status">Loading workflows...</p>}

          {error && (
            <div className="error">
              <h3>GraphQL error</h3>
              <pre>{error.message}</pre>
            </div>
          )}

          {!loading && !error && (
            <div className="workflow-list">
              {data?.workflows?.length === 0 ? (
                <p className="status">No workflows yet.</p>
              ) : (
                data.workflows.map((workflow) => (
                  <article className="workflow" key={workflow.id}>
                    <h3>{workflow.name}</h3>
                    <p>{workflow.id}</p>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
