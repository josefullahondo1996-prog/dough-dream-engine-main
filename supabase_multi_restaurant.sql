-- ==============================================================================
-- MIGRACIÓN / SCRIPT: SISTEMA MULTI-EMPRESA GASTRONÓMICA (MULTI-TENANT SAAS)
-- Ejecutar en Supabase -> SQL Editor
-- ==============================================================================

-- 1. Políticas RLS para inserción de restaurantes por usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'restaurants' 
      AND policyname = 'Authenticated users can create restaurants'
  ) THEN
    CREATE POLICY "Authenticated users can create restaurants"
      ON public.restaurants FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'restaurant_members' 
      AND policyname = 'Authenticated users can insert memberships'
  ) THEN
    CREATE POLICY "Authenticated users can insert memberships"
      ON public.restaurant_members FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

-- 2. Función RPC para crear un nuevo restaurante y asignar la membresía de admin
CREATE OR REPLACE FUNCTION public.create_restaurant_workspace(
  restaurant_name TEXT,
  restaurant_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_restaurant_id UUID;
  final_slug TEXT;
  created_restaurant RECORD;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  IF restaurant_name IS NULL OR trim(restaurant_name) = '' THEN
    RAISE EXCEPTION 'El nombre de la empresa gastronómica es obligatorio.';
  END IF;

  -- Generar slug único limpio
  final_slug := COALESCE(
    NULLIF(trim(restaurant_slug), ''),
    'rest-' || lower(regexp_replace(trim(restaurant_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(gen_random_uuid()::text from 1 for 6)
  );

  -- Insertar el nuevo restaurante
  INSERT INTO public.restaurants (name, slug)
  VALUES (trim(restaurant_name), final_slug)
  RETURNING id, name, slug, created_at INTO created_restaurant;

  new_restaurant_id := created_restaurant.id;

  -- Asignar al usuario como admin de la nueva empresa
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (new_restaurant_id, current_user_id, 'admin')
  ON CONFLICT (restaurant_id, user_id) DO NOTHING;

  -- Crear área por defecto para comenzar a operar mesas
  INSERT INTO public.restaurant_areas (name, restaurant_id)
  VALUES ('Salón Principal', new_restaurant_id);

  RETURN jsonb_build_object(
    'id', created_restaurant.id,
    'name', created_restaurant.name,
    'slug', created_restaurant.slug,
    'created_at', created_restaurant.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_restaurant_workspace(TEXT, TEXT) TO authenticated;
