CREATE POLICY "Public can read restaurants for digital menus"
  ON public.restaurants FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can read menu categories"
  ON public.menu_categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "Public can read available menu items"
  ON public.menu_items FOR SELECT TO anon
  USING (available = true);