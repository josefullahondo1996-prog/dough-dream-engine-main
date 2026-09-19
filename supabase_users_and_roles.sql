-- ==============================================================================
-- FIX DEFINITIVO: AUTOCONFIRMACIÓN DE USUARIOS, ROLES Y RECURSIÓN
-- Ejecutar en Supabase -> SQL Editor (Presionar "Run")
-- ==============================================================================

-- 1. Limpiar triggers y funciones antiguas problemáticas
DROP FUNCTION IF EXISTS public.create_restaurant_staff_account(UUID, TEXT, TEXT, TEXT, TEXT);

-- 2. Limpiar usuario de prueba previo si quedó con datos corruptos
DELETE FROM auth.identities WHERE identity_data ->> 'email' = 'adicubilla@gmail.com';
DELETE FROM auth.users WHERE email = 'adicubilla@gmail.com';
DELETE FROM public.profiles WHERE email = 'adicubilla@gmail.com';

-- 3. Auto-confirmar SIEMPRE el correo de cualquier usuario (Cajeros, Admins, etc.)
--    Esto permite entrar inmediatamente sin requerir confirmación por correo
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();

-- 4. Trigger al crear nuevo usuario: Crear Perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1), 'Usuario'),
    NEW.email,
    'cajero'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Quitar restricciones FK rígidas en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.restaurant_members DROP CONSTRAINT IF EXISTS restaurant_members_user_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 6. Recrear FK apuntando a profiles
ALTER TABLE public.restaurant_members
  ADD CONSTRAINT restaurant_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. Políticas RLS para profiles (Lectura, Inserción y Actualización para autenticados)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Políticas RLS para restaurant_members (Sin recursión)
DROP POLICY IF EXISTS "Admins and managers can manage restaurant members" ON public.restaurant_members;
DROP POLICY IF EXISTS "Authenticated users can insert memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Members can read restaurant membership" ON public.restaurant_members;
DROP POLICY IF EXISTS "Users can read their own or co-members memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Users can insert membership for themselves or admins can insert for others" ON public.restaurant_members;
DROP POLICY IF EXISTS "Admins can update memberships in their restaurant" ON public.restaurant_members;
DROP POLICY IF EXISTS "Admins can delete memberships in their restaurant" ON public.restaurant_members;
DROP POLICY IF EXISTS "Users can read memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Users and admins can insert memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.restaurant_members;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.restaurant_members;

CREATE OR REPLACE FUNCTION public.is_restaurant_admin(target_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_members
    WHERE restaurant_id = target_restaurant_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'gerente')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_restaurant(target_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_members
    WHERE restaurant_id = target_restaurant_id
      AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Users can read memberships"
  ON public.restaurant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_has_restaurant(restaurant_id));

CREATE POLICY "Users and admins can insert memberships"
  ON public.restaurant_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_restaurant_admin(restaurant_id));

CREATE POLICY "Admins can update memberships"
  ON public.restaurant_members FOR UPDATE TO authenticated
  USING (public.is_restaurant_admin(restaurant_id))
  WITH CHECK (public.is_restaurant_admin(restaurant_id));

CREATE POLICY "Admins can delete memberships"
  ON public.restaurant_members FOR DELETE TO authenticated
  USING (public.is_restaurant_admin(restaurant_id));
