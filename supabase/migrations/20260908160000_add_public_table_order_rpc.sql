CREATE OR REPLACE FUNCTION public.submit_public_table_order(
  p_table_id UUID,
  p_customer_name TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS TABLE (order_id UUID, total INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_table public.restaurant_tables%ROWTYPE;
  target_item public.menu_items%ROWTYPE;
  line JSONB;
  line_product_id UUID;
  line_quantity INTEGER;
  calculated_total INTEGER := 0;
  new_order_id UUID;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'The order must contain at least one item';
  END IF;

  SELECT * INTO target_table
  FROM public.restaurant_tables
  WHERE id = p_table_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    line_product_id := (line->>'product_id')::UUID;
    line_quantity := (line->>'quantity')::INTEGER;

    IF line_quantity IS NULL OR line_quantity < 1 OR line_quantity > 50 THEN
      RAISE EXCEPTION 'Invalid item quantity';
    END IF;

    SELECT * INTO target_item
    FROM public.menu_items
    WHERE id = line_product_id
      AND restaurant_id = target_table.restaurant_id
      AND available = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the selected items is no longer available';
    END IF;

    calculated_total := calculated_total + (target_item.price * line_quantity);
  END LOOP;

  INSERT INTO public.orders (restaurant_id, table_id, status, total, waiter_name, notes)
  VALUES (
    target_table.restaurant_id,
    target_table.id,
    'pendiente',
    calculated_total,
    'Pedido desde QR',
    NULLIF(trim(COALESCE(p_customer_name, '') || CASE WHEN NULLIF(trim(COALESCE(p_notes, '')), '') IS NULL THEN '' ELSE ' - ' || trim(p_notes) END), '')
  )
  RETURNING id INTO new_order_id;

  FOR line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    line_product_id := (line->>'product_id')::UUID;
    line_quantity := (line->>'quantity')::INTEGER;

    SELECT * INTO target_item
    FROM public.menu_items
    WHERE id = line_product_id
      AND restaurant_id = target_table.restaurant_id
      AND available = true;

    INSERT INTO public.order_items (restaurant_id, order_id, menu_item_id, quantity, price_at_order)
    VALUES (target_table.restaurant_id, new_order_id, target_item.id, line_quantity, target_item.price);
  END LOOP;

  RETURN QUERY SELECT new_order_id, calculated_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_table_order(UUID, TEXT, TEXT, JSONB) TO anon, authenticated;
