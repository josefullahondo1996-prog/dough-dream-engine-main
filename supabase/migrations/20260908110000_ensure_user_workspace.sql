CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_restaurant_id UUID;
  new_restaurant_id UUID;
  profile_name TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT restaurant_id INTO existing_restaurant_id
  FROM public.restaurant_members
  WHERE user_id = current_user_id
  ORDER BY created_at
  LIMIT 1;

  IF existing_restaurant_id IS NOT NULL THEN
    RETURN existing_restaurant_id;
  END IF;

  SELECT COALESCE(NULLIF(full_name, ''), 'Mi restaurante') INTO profile_name
  FROM public.profiles
  WHERE id = current_user_id;

  INSERT INTO public.restaurants (name, slug)
  VALUES (profile_name, 'restaurant-' || replace(current_user_id::TEXT, '-', ''))
  RETURNING id INTO new_restaurant_id;

  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  SELECT new_restaurant_id, current_user_id, COALESCE(role, 'admin')
  FROM public.profiles
  WHERE id = current_user_id;

  RETURN new_restaurant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;
