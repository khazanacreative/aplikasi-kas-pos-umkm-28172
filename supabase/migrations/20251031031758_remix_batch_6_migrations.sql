
-- Migration: 20251028004410

-- Migration: 20251025095957
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin_pusat', 'admin_cabang', 'staff');

-- Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_cabang TEXT NOT NULL,
  alamat TEXT,
  nomor_telepon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's branch
CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create transactions table
CREATE TABLE public.transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  keterangan TEXT NOT NULL,
  kategori TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Debet', 'Kredit')),
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;

-- Create invoices table
CREATE TABLE public.invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nomor_invoice TEXT NOT NULL,
  pelanggan TEXT NOT NULL,
  tanggal DATE NOT NULL,
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal >= 0),
  status TEXT NOT NULL CHECK (status IN ('Belum Dibayar', 'Lunas')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;

-- Create POS transactions table
CREATE TABLE public.pos_transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  kode_pos TEXT NOT NULL,
  total DECIMAL(15,2) NOT NULL CHECK (total >= 0),
  tanggal DATE NOT NULL,
  sumber TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_transaksi ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
-- Admin pusat can view all branches
CREATE POLICY "Admin pusat can view all branches"
ON public.branches FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- Admin cabang and staff can view their own branch
CREATE POLICY "Users can view their branch"
ON public.branches FOR SELECT
TO authenticated
USING (id = public.get_user_branch(auth.uid()));

-- Admin pusat can insert branches
CREATE POLICY "Admin pusat can insert branches"
ON public.branches FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin_pusat'));

-- Admin pusat can update all branches
CREATE POLICY "Admin pusat can update branches"
ON public.branches FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- RLS Policies for user_roles
-- Admin pusat can view all user roles
CREATE POLICY "Admin pusat can view all user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- Users can view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admin pusat can manage user roles
CREATE POLICY "Admin pusat can insert user roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin_pusat'));

CREATE POLICY "Admin pusat can update user roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- RLS Policies for transaksi
-- Admin pusat can view all transactions
CREATE POLICY "Admin pusat can view all transactions"
ON public.transaksi FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- Users can view transactions from their branch
CREATE POLICY "Users can view their branch transactions"
ON public.transaksi FOR SELECT
TO authenticated
USING (branch_id = public.get_user_branch(auth.uid()));

-- Users can insert transactions for their branch
CREATE POLICY "Users can insert transactions"
ON public.transaksi FOR INSERT
TO authenticated
WITH CHECK (
  branch_id = public.get_user_branch(auth.uid()) 
  AND user_id = auth.uid()
);

-- Users can update their own transactions
CREATE POLICY "Users can update their transactions"
ON public.transaksi FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own transactions
CREATE POLICY "Users can delete their transactions"
ON public.transaksi FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for invoice
-- Admin pusat can view all invoices
CREATE POLICY "Admin pusat can view all invoices"
ON public.invoice FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- Users can view invoices from their branch
CREATE POLICY "Users can view their branch invoices"
ON public.invoice FOR SELECT
TO authenticated
USING (branch_id = public.get_user_branch(auth.uid()));

-- Users can insert invoices for their branch
CREATE POLICY "Users can insert invoices"
ON public.invoice FOR INSERT
TO authenticated
WITH CHECK (
  branch_id = public.get_user_branch(auth.uid())
  AND user_id = auth.uid()
);

-- Users can update their own invoices
CREATE POLICY "Users can update their invoices"
ON public.invoice FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for pos_transaksi
-- Admin pusat can view all POS transactions
CREATE POLICY "Admin pusat can view all POS transactions"
ON public.pos_transaksi FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_pusat'));

-- Users can view POS transactions from their branch
CREATE POLICY "Users can view their branch POS transactions"
ON public.pos_transaksi FOR SELECT
TO authenticated
USING (branch_id = public.get_user_branch(auth.uid()));

-- Users can insert POS transactions for their branch
CREATE POLICY "Users can insert POS transactions"
ON public.pos_transaksi FOR INSERT
TO authenticated
WITH CHECK (branch_id = public.get_user_branch(auth.uid()));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_updated_at
BEFORE UPDATE ON public.invoice
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251028005736
-- Trigger types regeneration by adding comments to existing tables
COMMENT ON TABLE public.branches IS 'Branch locations for the organization';
COMMENT ON TABLE public.user_roles IS 'User role assignments and permissions';
COMMENT ON TABLE public.transaksi IS 'Financial transactions (debit/credit)';
COMMENT ON TABLE public.invoice IS 'Invoice records';
COMMENT ON TABLE public.pos_transaksi IS 'Point of sale transactions';

-- Migration: 20251029095851
-- Make branch_id nullable in invoice table so invoices can be created without branch assignment
ALTER TABLE public.invoice 
ALTER COLUMN branch_id DROP NOT NULL;

-- Migration: 20251029101233
-- Allow creating invoices without branch and allow users to view their own invoices
-- 1) Replace INSERT policy
DROP POLICY IF EXISTS "Users can insert invoices" ON public.invoice;
CREATE POLICY "Users can insert invoices (branch optional)"
ON public.invoice
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (branch_id IS NULL OR branch_id = public.get_user_branch(auth.uid()))
);

-- 2) Add SELECT policy so users can see their own invoices regardless of branch
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'invoice' AND policyname = 'Users can view their own invoices'
  ) THEN
    CREATE POLICY "Users can view their own invoices"
    ON public.invoice
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Migration: 20251030002111
-- Allow transactions without branch and link to invoices
-- 1) Make branch_id nullable in transaksi table
ALTER TABLE public.transaksi ALTER COLUMN branch_id DROP NOT NULL;

-- 2) Add invoice_id column to link transactions with invoices
ALTER TABLE public.transaksi ADD COLUMN invoice_id uuid REFERENCES public.invoice(id) ON DELETE SET NULL;

-- 3) Update INSERT policy to allow null branch_id
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transaksi;
CREATE POLICY "Users can insert transactions (branch optional)"
ON public.transaksi
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (branch_id IS NULL OR branch_id = public.get_user_branch(auth.uid()))
);

-- Migration: 20251031011402
-- Add SELECT policy so users can view their own transactions (even without branch)
CREATE POLICY "Users can view their own transactions"
ON public.transaksi
FOR SELECT
USING (user_id = auth.uid());
