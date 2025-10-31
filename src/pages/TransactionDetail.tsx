import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, Calendar, Tag, TrendingUp, TrendingDown, FileText } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TransactionData {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  jenis: string;
  nominal: number;
  invoice_id: string | null;
  created_at: string;
}

interface InvoiceData {
  nomor_invoice: string;
  pelanggan: string;
}

const TransactionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchTransactionDetail();
    }
  }, [user, id]);

  const fetchTransactionDetail = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("transaksi")
      .select("*")
      .eq("id", id)
      .eq("user_id", user?.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat detail transaksi",
        variant: "destructive",
      });
      navigate("/transactions");
      return;
    }

    setTransaction(data);

    // Fetch invoice if exists
    if (data.invoice_id) {
      const { data: invoiceData } = await supabase
        .from("invoice")
        .select("nomor_invoice, pelanggan")
        .eq("id", data.invoice_id)
        .single();

      if (invoiceData) {
        setInvoice(invoiceData);
      }
    }

    setLoadingData(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!transaction) return null;

  const isDebet = transaction.jenis === "Debet";

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      <Header 
        title="Detail Transaksi" 
        subtitle="Informasi lengkap transaksi"
      />

      <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        <Card className="p-4 shadow-lg mb-6 bg-card">
          <Button
            variant="ghost"
            onClick={() => navigate("/transactions")}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Card>

        <Card className="p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                isDebet ? "bg-success/10" : "bg-destructive/10"
              }`}>
                {isDebet ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{transaction.keterangan}</h2>
                <span className={`inline-block mt-1 text-xs px-3 py-1 rounded-full ${
                  isDebet 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {transaction.jenis}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Transaksi</p>
                <p className="font-semibold">{new Date(transaction.tanggal).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kategori</p>
                <p className="font-semibold">{transaction.kategori}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="w-full">
                <p className="text-sm text-muted-foreground">Keterangan</p>
                <p className="font-medium bg-muted/50 p-3 rounded-lg mt-1">{transaction.keterangan}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Nominal</p>
                <p className={`font-bold text-2xl ${
                  isDebet ? "text-success" : "text-destructive"
                }`}>
                  {isDebet ? "+" : "-"} {formatCurrency(transaction.nominal)}
                </p>
              </div>
            </div>

            {invoice && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Terkait Invoice</p>
                  <p className="font-semibold">{invoice.nomor_invoice}</p>
                  <p className="text-sm text-muted-foreground">{invoice.pelanggan}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Dibuat pada</p>
              <p className="font-medium">{new Date(transaction.created_at).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default TransactionDetail;
