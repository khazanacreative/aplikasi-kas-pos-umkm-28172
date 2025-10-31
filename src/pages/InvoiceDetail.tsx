import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InvoiceData {
  id: string;
  nomor_invoice: string;
  pelanggan: string;
  tanggal: string;
  nominal: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const InvoiceDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]); // ✅ Tambahan baru

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchInvoiceDetail();
    }
  }, [user, id]);

  const fetchInvoiceDetail = async () => {
    setLoadingData(true);

    // 🔹 Ambil data invoice utama
    const { data, error } = await supabase
      .from("invoice")
      .select("*")
      .eq("id", id)
      .eq("user_id", user?.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat detail invoice",
        variant: "destructive",
      });
      navigate("/invoice");
      return;
    }

    setInvoice(data);

    // 🔹 Ambil transaksi terkait
    const { data: transactionsData } = await supabase
      .from("transaksi")
      .select("*")
      .eq("invoice_id", id)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (transactionsData) setTransactions(transactionsData);

    // 🔹 Ambil item dalam invoice
    const { data: itemsData, error: itemsError } = await supabase
      .from("pos_transaksi")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      toast({
        title: "Error",
        description: "Gagal memuat item penjualan",
        variant: "destructive",
      });
      console.error("Fetch items error:", itemsError);
    } else {
      setItems(itemsData || []);
    }

    setLoadingData(false);
  };

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("invoice")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status invoice",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: `Invoice telah ditandai sebagai ${newStatus}`,
    });

    fetchInvoiceDetail();
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

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      <Header title="Detail Invoice" subtitle="Informasi lengkap invoice" />

      <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        <Card className="p-4 shadow-lg mb-6 bg-card">
          <Button
            variant="ghost"
            onClick={() => navigate("/invoice")}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </Card>

        <Card className="p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-xl">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{invoice.nomor_invoice}</h2>
                <span
                  className={`inline-block mt-1 text-xs px-3 py-1 rounded-full ${
                    invoice.status === "Lunas"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Pelanggan</p>
                <p className="font-semibold text-lg">{invoice.pelanggan}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Invoice</p>
                <p className="font-semibold">
                  {new Date(invoice.tanggal).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Nominal</p>
                <p className="font-bold text-2xl text-primary">
                  {formatCurrency(invoice.nominal)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Dibuat pada</p>
                <p className="font-medium">
                  {new Date(invoice.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Terakhir diubah</p>
                <p className="font-medium">
                  {new Date(invoice.updated_at).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>

          {invoice.status === "Belum Dibayar" && (
            <Button
              onClick={() => updateStatus("Lunas")}
              className="w-full mt-6 bg-success hover:bg-success/90"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Tandai Lunas
            </Button>
          )}
        </Card>

        {/* ✅ Item dalam Invoice dari pos_transaksi */}
        {items.length > 0 && (
          <Card className="p-6 shadow-lg mb-6">
            <h3 className="text-lg font-bold mb-4">Item dalam Invoice</h3>
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-semibold">{item.nama_barang}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.qty} × {formatCurrency(item.harga)}
                    </p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.total)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}


        {transactions.length > 0 && (
          <Card className="p-6 shadow-lg mb-6">
            <h3 className="text-lg font-bold mb-4">Detail Penjualan</h3>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate(`/transactions/${transaction.id}`)
                  }
                >
                  <div>
                    <p className="font-semibold">{transaction.keterangan}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.kategori}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.tanggal).toLocaleDateString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">
                      {formatCurrency(transaction.nominal)}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                      {transaction.jenis}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default InvoiceDetail;
