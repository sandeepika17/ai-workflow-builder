BEGIN;

DROP VIEW IF EXISTS public.organization_usage_monthly;

DROP TRIGGER IF EXISTS workflow_triggers_set_updated_at
  ON public.workflow_triggers;

DROP TRIGGER IF EXISTS workflow_steps_set_updated_at
  ON public.workflow_steps;

DROP TRIGGER IF EXISTS workflows_set_updated_at
  ON public.workflows;

DROP TRIGGER IF EXISTS org_members_set_updated_at
  ON public.org_members;

DROP TRIGGER IF EXISTS organizations_set_updated_at
  ON public.organizations;

DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TABLE IF EXISTS public.step_runs;
DROP TABLE IF EXISTS public.workflow_runs;
DROP TABLE IF EXISTS public.workflow_triggers;
DROP TABLE IF EXISTS public.workflow_steps;
DROP TABLE IF EXISTS public.workflows;
DROP TABLE IF EXISTS public.org_members;
DROP TABLE IF EXISTS public.organizations;

DROP TYPE IF EXISTS public.step_run_status;
DROP TYPE IF EXISTS public.workflow_run_status;
DROP TYPE IF EXISTS public.workflow_trigger_type;
DROP TYPE IF EXISTS public.workflow_step_type;
DROP TYPE IF EXISTS public.org_role;

COMMIT;
