CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'camarero' CHECK (request_type IN ('camarero', 'cuenta', 'ayuda')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'atendida', 'cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attended_at TIMESTAMPTZ
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage service requests"
  ON public.service_requests FOR ALL TO authenticated
  USING (public.current_user_has_restaurant(restaurant_id))
  WITH CHECK (public.current_user_has_restaurant(restaurant_id));

CREATE POLICY "Public can read own table requests"
  ON public.service_requests FOR SELECT TO anon
  USING (true);

CREATE OR REPLACE FUNCTION public.submit_service_request(
  p_table_id UUID,
  p_request_type TEXT DEFAULT 'camarero'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_table public.restaurant_tables%ROWTYPE;
  request_id UUID;
BEGIN
  SELECT * INTO target_table FROM public.restaurant_tables WHERE id = p_table_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table not found'; END IF;
  IF p_request_type NOT IN ('camarero', 'cuenta', 'ayuda') THEN RAISE EXCEPTION 'Invalid request type'; END IF;

  SELECT id INTO request_id
  FROM public.service_requests
  WHERE table_id = p_table_id AND request_type = p_request_type AND status = 'pendiente'
  LIMIT 1;

  IF request_id IS NOT NULL THEN RETURN request_id; END IF;

  INSERT INTO public.service_requests (restaurant_id, table_id, request_type)
  VALUES (target_table.restaurant_id, target_table.id, p_request_type)
  RETURNING id INTO request_id;
  RETURN request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_service_request(UUID, TEXT) TO anon, authenticated;
