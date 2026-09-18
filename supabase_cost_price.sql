-- Script de Migración para Costo Unitario y Margen de Rentabilidad por Producto
-- Ejecutar en el Editor SQL de tu proyecto en Supabase (SQL Editor)

-- 1. Agregar columna cost_price a la tabla menu_items si aún no existe
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- 2. Notificación de éxito
COMMENT ON COLUMN public.menu_items.cost_price IS 'Costo de elaboración o compra unitaria del producto (ingredientes, insumos o compra mayorista)';
