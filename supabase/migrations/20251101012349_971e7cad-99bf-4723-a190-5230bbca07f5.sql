-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  nama_item TEXT NOT NULL,
  jumlah NUMERIC NOT NULL,
  harga_satuan NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoice items
CREATE POLICY "Users can view their own invoice items"
ON public.invoice_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
    AND invoice.user_id = auth.uid()
  )
);

-- Users can view their branch invoice items
CREATE POLICY "Users can view their branch invoice items"
ON public.invoice_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
    AND invoice.branch_id = get_user_branch(auth.uid())
  )
);

-- Admin pusat can view all invoice items
CREATE POLICY "Admin pusat can view all invoice items"
ON public.invoice_items
FOR SELECT
USING (has_role(auth.uid(), 'admin_pusat'::app_role));

-- Users can insert invoice items for their own invoices
CREATE POLICY "Users can insert their invoice items"
ON public.invoice_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
    AND invoice.user_id = auth.uid()
  )
);

-- Users can update their own invoice items
CREATE POLICY "Users can update their invoice items"
ON public.invoice_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
    AND invoice.user_id = auth.uid()
  )
);

-- Users can delete their own invoice items
CREATE POLICY "Users can delete their invoice items"
ON public.invoice_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.invoice
    WHERE invoice.id = invoice_items.invoice_id
    AND invoice.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();