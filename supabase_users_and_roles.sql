-- ==============================================================================
-- MIGRACIÓN / SCRIPT: MÓDULO DE USUARIOS, PERSONAL Y ROLES
-- Ejecutar en Supabase -> SQL Editor
-- ==============================================================================

-- 1. Asegurar políticas RLS para restaurant_members (lectura, inserción, actualización, eliminación)
DO $$
BEGIN
  -- Política para que admins y gerentes puedan insertar miembros
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'restaurant_members' 
      AND policyname = 'Admins and managers can manage restaurant members'
  ) THEN
    CREATE POLICY "Admins and managers can manage restaurant members"
      ON public.restaurant_members
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.restaurant_members rm
          WHERE rm.restaurant_id = restaurant_members.restaurant_id
            AND rm.user_id = auth.uid()
            AND rm.role IN ('admin', 'gerente')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.restaurant_members rm
          WHERE rm.restaurant_id = restaurant_members.restaurant_id
            AND rm.user_id = auth.uid()
            AND rm.role IN ('admin', 'gerente')
        )
      );
  END IF;
END;
$$;

-- 2. Función RPC para registrar o asignar un miembro con su rol
CREATE OR REPLACE FUNCTION public.add_restaurant_member(
  p_restaurant_id UUID,
  p_member_email TEXT,
  p_member_name TEXT,
  p_member_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_authorized BOOLEAN := false;
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Verificar autorización
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = p_restaurant_id
      AND user_id = v_caller_id
      AND role IN ('admin', 'gerente')
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'No tienes permisos de Administrador o Gerente para gestionar miembros.';
  END IF;

  -- Buscar si el usuario ya está registrado en auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_member_email));

  -- Si no está en auth.users, buscar en profiles o generar un ID de perfil
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE lower(full_name) = lower(trim(p_member_name))
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (v_user_id, trim(p_member_name), p_member_role);
    END IF;
  ELSE
    -- Asegurar que el perfil tenga el nombre correcto
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_user_id, trim(p_member_name), p_member_role)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END IF;

  -- Insertar o actualizar la membresía
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (p_restaurant_id, v_user_id, p_member_role)
  ON CONFLICT (restaurant_id, user_id)
  DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO v_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'user_id', v_user_id,
    'role', p_member_role,
    'name', trim(p_member_name)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_restaurant_member(UUID, TEXT, TEXT, TEXT) TO authenticated;
