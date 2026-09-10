CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'gerente', 'cajero', 'mesero', 'cocina')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Members can read their restaurants"
  ON public.restaurants FOR SELECT TO authenticated
  USING (public.current_user_has_restaurant(id));

CREATE POLICY "Members can read restaurant membership"
  ON public.restaurant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_has_restaurant(restaurant_id));

CREATE OR REPLACE FUNCTION public.provision_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_restaurant_id UUID;
  restaurant_name TEXT;
BEGIN
  restaurant_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'restaurant_name', ''), 'Mi restaurante');

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.restaurants (name, slug)
  VALUES (restaurant_name, 'restaurant-' || replace(NEW.id::TEXT, '-', ''))
  RETURNING id INTO new_restaurant_id;

  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (new_restaurant_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.provision_user_workspace();

DO $$
DECLARE
  existing_profile RECORD;
  new_restaurant_id UUID;
BEGIN
  FOR existing_profile IN SELECT id, full_name, role FROM public.profiles LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_members WHERE user_id = existing_profile.id
    ) THEN
      INSERT INTO public.restaurants (name, slug)
      VALUES (
        COALESCE(NULLIF(existing_profile.full_name, ''), 'Mi restaurante'),
        'restaurant-' || replace(existing_profile.id::TEXT, '-', '')
      )
      RETURNING id INTO new_restaurant_id;

      INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
      VALUES (new_restaurant_id, existing_profile.id, existing_profile.role);
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.menu_categories ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.menu_items ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.restaurant_areas ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.restaurant_tables ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.clients ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.orders ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.order_items ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.invoices ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.payments ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.cash_movements ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.cash_register ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

DO $$
DECLARE
  default_restaurant_id UUID;
BEGIN
  SELECT id INTO default_restaurant_id FROM public.restaurants ORDER BY created_at LIMIT 1;

  IF default_restaurant_id IS NOT NULL THEN
    UPDATE public.menu_categories SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.menu_items SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.restaurant_areas SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.restaurant_tables SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.clients SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.orders SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.order_items SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.invoices SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.payments SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.cash_movements SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
    UPDATE public.cash_register SET restaurant_id = default_restaurant_id WHERE restaurant_id IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.menu_categories ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.menu_items ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.restaurant_areas ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.restaurant_tables ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.cash_movements ALTER COLUMN restaurant_id SET NOT NULL;
ALTER TABLE public.cash_register ALTER COLUMN restaurant_id SET NOT NULL;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'menu_categories', 'menu_items', 'restaurant_areas', 'restaurant_tables',
    'clients', 'orders', 'order_items', 'invoices', 'payments',
    'cash_movements', 'cash_register'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff full access" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Members access restaurant data" ON public.%I FOR ALL TO authenticated USING (public.current_user_has_restaurant(restaurant_id)) WITH CHECK (public.current_user_has_restaurant(restaurant_id))',
      table_name
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (restaurant_id)', table_name || '_restaurant_id_idx', table_name);
  END LOOP;
END;
$$;
