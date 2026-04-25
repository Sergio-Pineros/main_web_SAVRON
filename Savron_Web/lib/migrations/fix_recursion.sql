-- Fix infinite recursion in user_roles policy
DROP POLICY IF EXISTS "Admin full access on user_roles" ON user_roles;
