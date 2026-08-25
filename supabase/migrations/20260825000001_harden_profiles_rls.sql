-- Add proper RLS policies for profiles table so OWNER can read, update, and delete staff accounts

-- Drop existing restricted policy if it exists to replace with a comprehensive one
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read own profile or admins to read all" ON public.profiles;
DROP POLICY IF EXISTS "Allow owners to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow owners to delete profiles" ON public.profiles;

-- Create a helper function to bypass RLS for role checks to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Read policy: Users can read their own profile, OR Owners/Staff can read all profiles
CREATE POLICY "Allow users to read own profile or admins to read all" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR 
    public.get_user_role(auth.uid()) IN ('OWNER', 'STAFF')
  );

-- Update policy: Users can update their own profile (except role/is_active), OR Owners can update any
CREATE POLICY "Allow owners to update profiles" ON public.profiles
  FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) = 'OWNER'
  );

-- Delete policy: Owners can delete any profile
CREATE POLICY "Allow owners to delete profiles" ON public.profiles
  FOR DELETE
  USING (
    public.get_user_role(auth.uid()) = 'OWNER'
  );
