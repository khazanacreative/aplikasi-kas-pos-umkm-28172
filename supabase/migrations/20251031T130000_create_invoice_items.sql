-- ===================================================================
-- TABLE: invoice_items
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoice(id) ON DELETE CASCADE,
  nama_item text,
  jumlah numeric,
  harga numeric,
  subtotal numeric GENERATED ALWAYS AS (jumlah * harga) STORED,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- DROP OLD POLICIES (if exist)
-- ===================================================================

DROP POLICY IF EXISTS "Users can view their invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admin pusat can view all invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update their invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete their invoice items" ON public.invoice_items;

-- ===================================================================
-- POLICIES
-- ===================================================================

-- 🔹 Users dapat melihat item invoice mereka sendiri
CREATE POLICY "Users can view their invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND invoice.user_id = auth.uid()
  )
);

-- 🔹 Admin pusat dapat melihat semua item invoice
CREATE POLICY "Admin pusat can view all invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'::app_role));

-- 🔹 Users dapat menambahkan item invoice (hanya milik mereka)
CREATE POLICY "Users can insert invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND invoice.user_id = auth.uid()
  )
);

-- 🔹 Users dapat memperbarui item invoice mereka sendiri
CREATE POLICY "Users can update their invoice items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND invoice.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND invoice.user_id = auth.uid()
  )
);

-- 🔹 Users dapat menghapus item invoice mereka sendiri
CREATE POLICY "Users can delete their invoice items"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
      AND invoice.user_id = auth.uid()
  )
);

-- ===================================================================
-- GRANTS
-- ===================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoice_items_id_seq TO authenticated;
