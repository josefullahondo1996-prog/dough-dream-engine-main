-- Script de Migración para Módulo de Unidades de Medida y Combos
-- Ejecutar en el Editor SQL de tu proyecto en Supabase

-- 1. Tabla para Unidades de Medida
CREATE TABLE IF NOT EXISTS public.units_of_measure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,          -- ej: Litro, Mililitro, Kilogramo, Gramo, Unidad, Porción, Chopp, Copa
    symbol TEXT NOT NULL,        -- ej: L, ml, kg, g, unid, porc
    unit_type TEXT NOT NULL DEFAULT 'volume', -- 'volume', 'weight', 'unit', 'portion'
    base_multiplier NUMERIC NOT NULL DEFAULT 1.0, -- ej: 1.0 para Litro, 1000.0 para ml respecto a base
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en units_of_measure
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los miembros del restaurante pueden ver sus unidades" ON public.units_of_measure
    FOR SELECT USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden insertar unidades" ON public.units_of_measure
    FOR INSERT WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden actualizar unidades" ON public.units_of_measure
    FOR UPDATE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden eliminar unidades" ON public.units_of_measure
    FOR DELETE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );


-- 2. Modificar menu_items para incluir unidad y marca de combo
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unit_value NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;


-- 3. Tabla para los Componentes de un Combo
CREATE TABLE IF NOT EXISTS public.combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    parent_menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE, -- El combo
    child_menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,  -- El producto incluido
    quantity NUMERIC NOT NULL DEFAULT 1,                                                  -- Cantidad de ese producto en el combo
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en combo_items
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los miembros del restaurante pueden ver combo_items" ON public.combo_items
    FOR SELECT USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden insertar combo_items" ON public.combo_items
    FOR INSERT WITH CHECK (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden actualizar combo_items" ON public.combo_items
    FOR UPDATE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Los miembros del restaurante pueden eliminar combo_items" ON public.combo_items
    FOR DELETE USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid()
        )
    );
