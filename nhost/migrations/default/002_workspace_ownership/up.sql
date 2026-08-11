BEGIN;

ALTER TABLE public.organizations
ADD COLUMN created_by UUID
REFERENCES auth.users(id)
ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_organization_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.org_members (
      org_id,
      user_id,
      role
    )
    VALUES (
      NEW.id,
      NEW.created_by,
      'owner'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_create_owner
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_organization_owner();

COMMIT;
