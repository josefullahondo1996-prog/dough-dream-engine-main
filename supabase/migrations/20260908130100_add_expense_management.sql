CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'otros')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS expense_categories_restaurant_id_idx ON public.expense_categories (restaurant_id);
CREATE INDEX IF NOT EXISTS expenses_restaurant_id_idx ON public.expenses (restaurant_id);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON public.expenses (expense_date);

DROP POLICY IF EXISTS "Members access restaurant expense categories" ON public.expense_categories;
CREATE POLICY "Members access restaurant expense categories"
  ON public.expense_categories FOR ALL TO authenticated
  USING (public.current_user_has_restaurant(restaurant_id))
  WITH CHECK (public.current_user_has_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Members access restaurant expenses" ON public.expenses;
CREATE POLICY "Members access restaurant expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.current_user_has_restaurant(restaurant_id))
  WITH CHECK (public.current_user_has_restaurant(restaurant_id));
