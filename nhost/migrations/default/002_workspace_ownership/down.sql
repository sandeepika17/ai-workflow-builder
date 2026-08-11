BEGIN;

DROP TRIGGER IF EXISTS organizations_create_owner
ON public.organizations;

DROP FUNCTION IF EXISTS public.create_organization_owner();

ALTER TABLE public.organizations
DROP COLUMN IF EXISTS created_by;

COMMIT;
