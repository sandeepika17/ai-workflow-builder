BEGIN;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE public.org_role AS ENUM (
  'owner',
  'editor',
  'viewer'
);

CREATE TYPE public.workflow_step_type AS ENUM (
  'llm_call',
  'http_request',
  'db_write',
  'notify',
  'conditional_branch',
  'approval_gate'
);

CREATE TYPE public.workflow_trigger_type AS ENUM (
  'manual',
  'webhook',
  'scheduled',
  'database_event'
);

CREATE TYPE public.workflow_run_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed'
);

CREATE TYPE public.step_run_status AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'skipped'
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,

  quota_allowed INTEGER NOT NULL DEFAULT 1000,
  quota_used INTEGER NOT NULL DEFAULT 0,
  quota_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT organizations_name_not_blank
    CHECK (length(trim(name)) > 0),

  CONSTRAINT organizations_quota_allowed_nonnegative
    CHECK (quota_allowed >= 0),

  CONSTRAINT organizations_quota_used_nonnegative
    CHECK (quota_used >= 0)
);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================

CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  role public.org_role NOT NULL DEFAULT 'viewer',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT org_members_org_user_unique
    UNIQUE (org_id, user_id)
);

CREATE INDEX org_members_user_org_idx
  ON public.org_members(user_id, org_id);

CREATE INDEX org_members_org_role_idx
  ON public.org_members(org_id, role);

-- ============================================================
-- WORKFLOWS
-- ============================================================

CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id UUID NOT NULL
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  created_by UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT workflows_name_not_blank
    CHECK (length(trim(name)) > 0)
);

CREATE INDEX workflows_org_id_idx
  ON public.workflows(org_id);

CREATE INDEX workflows_org_updated_idx
  ON public.workflows(org_id, updated_at DESC);

-- ============================================================
-- WORKFLOW STEPS
-- ============================================================

CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_id UUID NOT NULL
    REFERENCES public.workflows(id)
    ON DELETE CASCADE,

  position INTEGER NOT NULL,

  type public.workflow_step_type NOT NULL,

  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT workflow_steps_position_positive
    CHECK (position >= 0),

  CONSTRAINT workflow_steps_workflow_position_unique
    UNIQUE (workflow_id, position)
);

CREATE INDEX workflow_steps_workflow_position_idx
  ON public.workflow_steps(workflow_id, position);

-- ============================================================
-- WORKFLOW TRIGGERS
-- ============================================================

CREATE TABLE public.workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_id UUID NOT NULL
    REFERENCES public.workflows(id)
    ON DELETE CASCADE,

  type public.workflow_trigger_type NOT NULL,

  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_triggers_workflow_idx
  ON public.workflow_triggers(workflow_id);

CREATE INDEX workflow_triggers_enabled_idx
  ON public.workflow_triggers(enabled);

-- ============================================================
-- WORKFLOW RUNS
-- ============================================================

CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_id UUID NOT NULL
    REFERENCES public.workflows(id)
    ON DELETE CASCADE,

  status public.workflow_run_status NOT NULL DEFAULT 'pending',

  trigger_type public.workflow_trigger_type NOT NULL DEFAULT 'manual',

  created_by UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT workflow_runs_completed_after_started
    CHECK (
      completed_at IS NULL
      OR started_at IS NULL
      OR completed_at >= started_at
    )
);

CREATE INDEX workflow_runs_workflow_created_idx
  ON public.workflow_runs(workflow_id, created_at DESC);

CREATE INDEX workflow_runs_workflow_status_idx
  ON public.workflow_runs(workflow_id, status);

-- ============================================================
-- STEP RUNS
-- ============================================================

CREATE TABLE public.step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_run_id UUID NOT NULL
    REFERENCES public.workflow_runs(id)
    ON DELETE CASCADE,

  workflow_step_id UUID NOT NULL
    REFERENCES public.workflow_steps(id)
    ON DELETE CASCADE,

  status public.step_run_status NOT NULL DEFAULT 'pending',

  input JSONB,
  output JSONB,
  error TEXT,

  attempt_count INTEGER NOT NULL DEFAULT 0,

  approved_by UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  approved_at TIMESTAMPTZ,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT step_runs_attempt_count_nonnegative
    CHECK (attempt_count >= 0),

  CONSTRAINT step_runs_approved_consistency
    CHECK (
      (approved_by IS NULL AND approved_at IS NULL)
      OR
      (approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),

  CONSTRAINT step_runs_completed_after_started
    CHECK (
      completed_at IS NULL
      OR started_at IS NULL
      OR completed_at >= started_at
    ),

  CONSTRAINT step_runs_run_step_unique
    UNIQUE (workflow_run_id, workflow_step_id)
);

CREATE INDEX step_runs_workflow_run_idx
  ON public.step_runs(workflow_run_id);

CREATE INDEX step_runs_workflow_run_status_idx
  ON public.step_runs(workflow_run_id, status);

CREATE INDEX step_runs_approval_idx
  ON public.step_runs(status)
  WHERE status = 'paused';

-- ============================================================
-- MONTHLY ORGANIZATION USAGE VIEW
-- ============================================================

CREATE VIEW public.organization_usage_monthly AS
SELECT
  o.id AS org_id,
  o.name AS organization_name,
  date_trunc('month', wr.created_at) AS usage_month,
  COUNT(wr.id)::BIGINT AS runs_used,
  o.quota_allowed
FROM public.organizations o
LEFT JOIN public.workflows w
  ON w.org_id = o.id
LEFT JOIN public.workflow_runs wr
  ON wr.workflow_id = w.id
 AND wr.created_at >= date_trunc('month', now())
GROUP BY
  o.id,
  o.name,
  date_trunc('month', wr.created_at),
  o.quota_allowed;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER org_members_set_updated_at
BEFORE UPDATE ON public.org_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workflows_set_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workflow_steps_set_updated_at
BEFORE UPDATE ON public.workflow_steps
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER workflow_triggers_set_updated_at
BEFORE UPDATE ON public.workflow_triggers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
