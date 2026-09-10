CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT
)
RETURNS TABLE (order_id UUID, invoice_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order public.orders%ROWTYPE;
  target_invoice public.invoices%ROWTYPE;
BEGIN
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A cancellation reason is required';
  END IF;

  SELECT * INTO target_order
  FROM public.orders
  WHERE id = p_order_id
    AND public.current_user_has_restaurant(restaurant_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE user_id = auth.uid()
      AND restaurant_id = target_order.restaurant_id
      AND role IN ('admin', 'gerente', 'cajero')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to cancel orders';
  END IF;

  SELECT * INTO target_invoice
  FROM public.invoices
  WHERE order_id = target_order.id
  FOR UPDATE;

  IF target_order.status = 'cancelado' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  IF FOUND THEN
    UPDATE public.invoices SET status = 'anulada' WHERE id = target_invoice.id;
    INSERT INTO public.cash_movements (restaurant_id, type, description, amount, reference_id)
    VALUES (target_order.restaurant_id, 'EGRESO', 'Reembolso de orden ' || target_order.id || ': ' || trim(p_reason), target_invoice.total, target_invoice.id);
  END IF;

  UPDATE public.orders SET status = 'cancelado' WHERE id = target_order.id;
  RETURN QUERY SELECT target_order.id, target_invoice.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;