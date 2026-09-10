CREATE OR REPLACE FUNCTION public.charge_order(
  p_order_id UUID,
  p_subtotal INTEGER,
  p_discount INTEGER,
  p_discount_type TEXT,
  p_iva_rate NUMERIC,
  p_iva INTEGER,
  p_total INTEGER,
  p_payments JSONB
)
RETURNS TABLE (invoice_id UUID, invoice_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order public.orders%ROWTYPE;
  new_invoice_id UUID;
  new_invoice_number TEXT;
  payment JSONB;
BEGIN
  SELECT * INTO target_order
  FROM public.orders
  WHERE id = p_order_id
    AND public.current_user_has_restaurant(restaurant_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;
  IF target_order.status IN ('pagada', 'cancelado') THEN
    RAISE EXCEPTION 'Order cannot be charged in its current status';
  END IF;
  IF p_total <= 0 OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'Invalid charge data';
  END IF;
  IF COALESCE((SELECT SUM((value->>'amount')::INTEGER) FROM jsonb_array_elements(p_payments)), 0) < p_total THEN
    RAISE EXCEPTION 'Payments do not cover the order total';
  END IF;

  new_invoice_number := public.generate_invoice_number();
  INSERT INTO public.invoices (invoice_number, order_id, client_id, restaurant_id, subtotal, discount, discount_type, iva_rate, iva, total)
  VALUES (new_invoice_number, target_order.id, target_order.client_id, target_order.restaurant_id, p_subtotal, p_discount, p_discount_type, p_iva_rate, p_iva, p_total)
  RETURNING id INTO new_invoice_id;

  FOR payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    INSERT INTO public.payments (invoice_id, restaurant_id, method, amount)
    VALUES (new_invoice_id, target_order.restaurant_id, payment->>'method', (payment->>'amount')::INTEGER);
  END LOOP;

  INSERT INTO public.cash_movements (restaurant_id, type, description, amount, reference_id)
  VALUES (target_order.restaurant_id, 'INGRESO', 'Cobro de orden ' || target_order.id, p_total, new_invoice_id);

  UPDATE public.orders SET status = 'pagada', total = p_total WHERE id = target_order.id;
  RETURN QUERY SELECT new_invoice_id, new_invoice_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.charge_order(UUID, INTEGER, INTEGER, TEXT, NUMERIC, INTEGER, INTEGER, JSONB) TO authenticated;
