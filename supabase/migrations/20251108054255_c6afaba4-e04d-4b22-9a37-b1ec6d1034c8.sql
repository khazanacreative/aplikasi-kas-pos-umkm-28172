-- Update invoice status constraint to allow "Belum Lunas"
ALTER TABLE public.invoice 
DROP CONSTRAINT IF EXISTS invoice_status_check;

-- Add new constraint that allows both "Lunas" and "Belum Lunas"
ALTER TABLE public.invoice 
ADD CONSTRAINT invoice_status_check 
CHECK (status IN ('Lunas', 'Belum Lunas', 'Belum Dibayar'));