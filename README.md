# AI Agent Workflow Builder

Full-stack AI workflow automation platform built with **Next.js/React, Nhost, Hasura, PostgreSQL and GraphQL**.

The project is designed as a small n8n-style workflow builder for chaining AI-agent steps while enforcing organization isolation and role-based permissions.

## Overview

Core relationship:

```text
Organization
  ├── org_members
  └── workflows
        ├── workflow_steps
        ├── workflow_triggers
        └── workflow_runs
              └── step_runs
```

The security model has two layers:

1. **Organization + role isolation** — a user can only access data belonging to an organization in which they are a member.
2. **Step-level authorization** — sensitive workflow operations are additionally checked by role in the execution/action layer.

## Technology

- Next.js / React
- Nhost Authentication
- Nhost PostgreSQL
- Hasura GraphQL
- GraphQL queries, mutations and subscriptions
- Nhost Functions / Hasura Actions
- External LLM API such as Groq, OpenRouter or Gemini

## Data Model

### organizations

Stores organization and quota information:

```text
id
name
created_by
quota_allowed
quota_used
quota_period_start
created_at
updated_at
```

### org_members

Associates users with organizations:

```text
id
org_id
user_id
role
created_at
updated_at
```

Roles:

| Role | Access |
|---|---|
| owner | Full organization/workflow control |
| editor | Create/edit workflows and trigger runs |
| viewer | Read-only |

A unique constraint prevents duplicate membership for the same `(org_id, user_id)`.

### workflows

```text
id
org_id
name
description
created_by
created_at
updated_at
```

### workflow_steps

Ordered workflow nodes:

```text
id
workflow_id
position
type
config
created_at
updated_at
```

Supported node types:

- `llm_call`
- `http_request`
- `db_write`
- `notify`
- `conditional_branch`
- `approval_gate`

### workflow_triggers

Triggers associated with a workflow:

- manual
- webhook
- scheduled
- database event

### workflow_runs

Represents one workflow execution:

```text
id
workflow_id
status
trigger_type
created_by
started_at
completed_at
error
created_at
```

The run lifecycle includes a `paused` state for approval gates.

### step_runs

Represents execution of each step and stores status/input/output/error/attempt and approval information.

## Database Migrations

Migrations are in:

```text
nhost/migrations/default/
```

Current migrations include:

```text
001_initial_schema/
002_workspace_ownership/
```

`001_initial_schema` creates the core application tables, constraints, indexes and timestamp triggers.

`002_workspace_ownership` adds `created_by` to organizations and creates a database trigger that automatically creates the organization creator as an `owner`.

## Hasura Metadata

Metadata is in:

```text
nhost/metadata/databases/default/tables/
```

Important files:

```text
public_organizations.yaml
public_org_members.yaml
public_workflows.yaml
public_workflow_steps.yaml
public_workflow_triggers.yaml
public_workflow_runs.yaml
public_step_runs.yaml
public_organization_usage_monthly.yaml
```

These define relationships and Hasura insert/select/update/delete permissions.

## Organization Isolation

The critical security boundary is:

```text
workflow
  -> organization
      -> org_members
          -> user_id
```

A typical workflow select filter is:

```yaml
filter:
  organization:
    org_members:
      user_id:
        _eq: X-Hasura-User-Id
```

The same organization-membership boundary must be applied to workflow steps, triggers, runs and step runs.

This prevents an Org B user from reading Org A data even when they know an Org A UUID.

Frontend button hiding is **not** considered security.

## Role Permissions

### Owner

Can:

- manage organization membership
- create/edit workflows
- manage workflow steps
- manage triggers
- trigger workflows
- perform owner-only operations

### Editor

Can:

- create/edit workflows
- edit workflow steps
- trigger runs

Cannot manage organization membership.

### Viewer

Can read permitted data but cannot:

- create/edit workflows
- trigger runs
- manage members

## Step-Level Gating

The following operations are owner-only:

- adding `db_write`
- adding a webhook trigger
- adding a `notify` step

These checks should be enforced by the backend/action layer rather than only by the UI.

Approval is also checked in the Action/function layer because approval is a mid-execution decision.

## Workflow Execution

The main execution flow is intended to use:

```text
triggerWorkflowRun(workflow_id)
```

The handler should:

1. Authenticate the caller.
2. Load the workflow.
3. Verify organization membership.
4. Verify owner/editor role.
5. Check organization quota.
6. Create a `workflow_run`.
7. Execute steps in order.
8. Update `step_runs`.
9. Retry failed external calls at least once.
10. Pause on `approval_gate`.
11. Resume only after an authorized approval.
12. Complete/fail the workflow run.
13. Update usage.

## Approval Gate

Expected lifecycle:

```text
running
  ↓
approval_gate
  ↓
workflow_run = paused
  ↓
await approval
  ↓
approveStep
  ↓
verify approver role + organization
  ↓
resume
  ↓
continue remaining steps
```

Only an authorized user from the same organization can approve.

## Step Types

### llm_call

Calls a real LLM API. API keys must be stored in environment variables and never committed to Git.

### http_request

Calls an external HTTP API with error handling and retry behavior.

### db_write

Writes workflow output into application-owned database tables. Owner-restricted.

### notify

Sends Slack/email or another notification. Owner-restricted.

### conditional_branch

Chooses a path based on the previous step's output.

Example:

```text
LLM output
  ├── condition true  -> branch A
  └── condition false -> branch B
```

### approval_gate

Pauses execution until an authorized user approves.

## Triggers

### Manual

User presses Run.

### Webhook

External systems start a workflow through a Hasura Action/inbound endpoint.

### Scheduled

A cron/scheduled function starts a workflow.

### Database Event

A Hasura Event Trigger starts a workflow after a watched database change.

At least one non-manual trigger should be demonstrated in the final assignment scenario.

## GraphQL

Required application operations include:

### Workflow query

Returns workflows for the user's organization with:

- steps
- triggers
- latest run status

### Workflow mutation

Creates/edits:

- workflow
- steps
- triggers

### Approval operation

Approves a paused approval step.

### Live subscription

Subscribes to `step_runs`, filtered by `workflow_run_id`, so the UI can show live execution status without refresh.

## Frontend

Main application areas include:

```text
Workflows
Runs
Settings
Workflow Editor
```

The editor should support:

- adding steps
- configuring steps
- reordering steps
- attaching triggers
- running workflows

The execution UI should show states such as:

```text
pending
running
completed
failed
paused
```

The Run control should not be available to viewers.

## Usage / Quota

Organizations contain:

```text
quota_allowed
quota_used
quota_period_start
```

Before execution, the backend checks available quota. Usage updates should be concurrency-safe so simultaneous executions cannot exceed the organization's allowance.

## Repository Structure

Typical structure:

```text
ai-workflow-builder/
├── nhost/
│   ├── migrations/
│   │   └── default/
│   │       ├── 001_initial_schema/
│   │       └── 002_workspace_ownership/
│   └── metadata/
│       └── databases/
│           └── default/
│               └── tables/
├── functions/
├── public/
├── package.json
├── package-lock.json
└── README.md
```

Frontend directory names may differ depending on the current Next.js structure.

## Local Setup

### Requirements

- Node.js 22
- npm
- Git
- Nhost CLI
- Nhost project

### Clone

```bash
git clone <YOUR_GITHUB_REPOSITORY>
cd ai-workflow-builder
```

### Install

```bash
npm install
```

If functions have their own package:

```bash
cd functions
npm install
cd ..
```

### Environment Variables

Create the appropriate `.env.local` file.

Example:

```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=ap-south-1
```

For an LLM provider, use a server-side secret such as:

```env
GROQ_API_KEY=...
```

Do not commit real secrets.

## Nhost Deployment

Example:

```bash
nhost deployments new main \
  --subdomain <NHOST_SUBDOMAIN> \
  --ref "$(git rev-parse HEAD)" \
  --message "deployment" \
  --user <NHOST_USER> \
  --follow
```

A successful deployment should report:

```text
✓ Migrations applied
✓ Metadata applied
✓ Metadata reloaded
```

## Useful Commands

List migrations:

```bash
find nhost/migrations -type f | sort
```

List table metadata:

```bash
find nhost/metadata/databases/default/tables -maxdepth 1 -type f | sort
```

Inspect organization schema:

```bash
sed -n '45,120p' nhost/migrations/default/001_initial_schema/up.sql
```

Inspect permissions:

```bash
cat nhost/metadata/databases/default/tables/public_org_members.yaml
cat nhost/metadata/databases/default/tables/public_workflows.yaml
cat nhost/metadata/databases/default/tables/public_workflow_steps.yaml
cat nhost/metadata/databases/default/tables/public_workflow_triggers.yaml
cat nhost/metadata/databases/default/tables/public_workflow_runs.yaml
```

Validate Git changes:

```bash
git status
git diff --check
git diff -- nhost/metadata/databases/default/tables/
```

## Hasura Metadata Troubleshooting

If Hasura reports:

```text
field 'workflow_id' not found in type: 'workflow_steps_bool_exp'
```

or:

```text
field 'workflow_id' not found in type: 'workflow_triggers_bool_exp'
```

the permission filter is likely referencing a field instead of the Hasura relationship.

Use the relationship path:

```yaml
workflow:
  organization:
    org_members:
      user_id:
        _eq: X-Hasura-User-Id
```

Do not reintroduce unsupported metadata keys such as:

```yaml
query_root_fields:
subscription_root_fields:
```

if the deployed Hasura version rejects them with:

```text
unexpected keys when parsing TableMetadata
```

## Security Test

Create two separate organizations:

```text
Org A
  User A = owner
  Workflow A

Org B
  User B = viewer/editor
  Workflow B
```

Log in as User B.

Expected:

```text
Workflow B -> visible
Workflow A -> invisible
```

Then take the UUID of Workflow A and attempt a direct GraphQL query while authenticated as User B.

Expected:

```text
Workflow A is not returned
```

Also verify User B cannot:

- trigger Workflow A
- access Workflow A steps
- access Workflow A triggers
- access Workflow A runs
- approve Workflow A

This direct-ID test is essential because it proves the security boundary is not merely frontend UI hiding.

## Final Assignment Demonstration

The target end-to-end demonstration is:

```text
Two organizations
       ↓
Org A owner creates workflow
       ↓
llm_call
       ↓
http_request
       ↓
conditional_branch
       ↓
approval_gate
       ↓
workflow pauses
       ↓
live subscription shows paused state
       ↓
authorized owner/editor approves
       ↓
workflow resumes
       ↓
workflow completes
```

The workflow should be startable both manually and through at least one non-manual trigger such as a webhook or database event.

Then:

```text
Log in as Org B user
       ↓
Org A workflow is inaccessible
       ↓
Known Org A UUID still cannot bypass permissions
```

## Architecture

```text
                    Next.js / React
                          │
                       GraphQL
                          │
                          ▼
                  Hasura GraphQL
                  permissions/API
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
 organizations       workflows        workflow_runs
       │                  │                  │
       ▼                  ▼                  ▼
 org_members       workflow_steps       step_runs
                          │
                          ▼
                  workflow_triggers
                          │
                          ▼
                  Actions / Functions
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
            LLM       External APIs   Notify
```

## Design Rationale

### Organization isolation

Roles alone are insufficient. Two users can both be `editor` while belonging to different organizations.

Authorization therefore evaluates:

```text
current user
+
organization membership
+
role
```

### Hasura as the data security boundary

Hasura permissions protect GraphQL access directly, preventing frontend-only authorization bypasses.

### Action layer for execution-time authorization

Approval and sensitive step execution require backend decisions that happen during workflow execution, so those checks belong in the Action/function layer as well as the appropriate database permissions.

## Production Considerations

Before production use, additionally address:

- webhook authentication/signatures
- secret management
- request timeouts
- retry backoff
- idempotency
- rate limiting
- concurrent quota updates
- audit logging
- structured logs
- external API failure handling
- safe validation of arbitrary HTTP destinations
- validation/sanitization of workflow configuration
- safe handling of LLM-generated content

## Submission Checklist

- [ ] GitHub repository is up to date
- [ ] README contains setup instructions
- [ ] Nhost migrations are committed
- [ ] Hasura metadata is committed
- [ ] Organization isolation is tested with two accounts
- [ ] Direct workflow UUID guessing is rejected
- [ ] Owner/editor/viewer behavior is verified
- [ ] Sensitive step types are role-gated
- [ ] Workflow execution is working
- [ ] LLM call is working or clearly documented as a stub
- [ ] HTTP request step is working
- [ ] Conditional branch is working
- [ ] Approval gate pauses and resumes
- [ ] Live step status subscription works
- [ ] At least one non-manual trigger works
- [ ] Usage/quota behavior is verified
- [ ] Hosted application URL is available
- [ ] Final end-to-end scenario is recorded

## License

Add the license required by the project owner/repository before public distribution.
