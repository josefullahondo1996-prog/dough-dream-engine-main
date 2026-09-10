
-- Add 'pagada' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pagada';

-- Add stock column to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 100;

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  iva_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  iva INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'emitida' CHECK (status IN ('emitida', 'anulada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_order_invoice UNIQUE (order_id)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('efectivo', 'tarjeta', 'transferencia', 'qr')),
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cash movements table
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('INGRESO', 'EGRESO')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access" ON public.cash_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cash register table
CREATE TABLE public.cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  initial_amount INTEGER NOT NULL DEFAULT 0,
  final_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada'))
);
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access" ON public.cash_register FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('public.invoice_number_seq') INTO next_val;
  RETURN 'FAC-' || LPAD(next_val::TEXT, 6, '0');
END;
$$;
