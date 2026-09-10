CREATE POLICY "Public can resolve digital menu tables"
  ON public.restaurant_tables FOR SELECT TO anon
  USING (true);