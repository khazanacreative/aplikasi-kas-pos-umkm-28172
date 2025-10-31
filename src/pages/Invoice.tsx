import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, CheckCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceItem {
  id: number;
  nomorInvoice: string;
  pelanggan: string;
  tanggal: string;
  nominal: number;
  status: "Belum Dibayar" | "Lunas";
}

const Invoice = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;
  const [showForm, setShowForm] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoice")
      .select("*")
      .eq("user_id", user?.id)
      .order("tanggal", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return;
    }

    setInvoices(data || []);
  };

  const [formData, setFormData] = useState({
    nomorInvoice: "",
    pelanggan: "",
    tanggal: new Date().toISOString().split('T')[0],
    nominal: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nomorInvoice || !formData.pelanggan || !formData.tanggal || !formData.nominal) {
      toast({
        title: "Error",
        description: "Semua field harus diisi!",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("invoice").insert({
      user_id: user?.id,
      branch_id: userRole?.branch_id || null,
      nomor_invoice: formData.nomorInvoice,
      pelanggan: formData.pelanggan,
      tanggal: formData.tanggal,
      nominal: parseFloat(formData.nominal),
      status: "Belum Dibayar",
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Berhasil",
      description: "Invoice berhasil dibuat!",
    });

    setFormData({
      nomorInvoice: "",
      pelanggan: "",
      tanggal: new Date().toISOString().split('T')[0],
      nominal: "",
    });
    setShowForm(false);
    fetchInvoices();
  };

  const updateStatus = async (id: string, newStatus: "Belum Dibayar" | "Lunas") => {
    const { error } = await supabase
      .from("invoice")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status",
        variant: "destructive",
      });
      return;
    }

    if (newStatus === "Lunas") {
      toast({
        title: "Status Diperbarui",
        description: "Invoice telah ditandai sebagai Lunas dan otomatis menambah pemasukan.",
      });
    }

    fetchInvoices();
  };

  const totalBelumDibayar = invoices
    .filter(inv => inv.status === "Belum Dibayar")
    .reduce((sum, inv) => sum + inv.nominal, 0);

  const totalLunas = invoices
    .filter(inv => inv.status === "Lunas")
    .reduce((sum, inv) => sum + inv.nominal, 0);

  // ✅ Tambahkan log di sini:
  console.log("User info:", user);
  console.log("Invoices:", invoices);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Invoice" 
        subtitle="Kelola invoice pelanggan"
      />

       {/* Main Content */}
       <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-secondary" />
              <p className="text-sm text-muted-foreground">Belum Dibayar</p>
            </div>
            <h3 className="text-xl font-bold text-secondary">{formatCurrency(totalBelumDibayar)}</h3>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-sm text-muted-foreground">Lunas</p>
            </div>
            <h3 className="text-xl font-bold text-success">{formatCurrency(totalLunas)}</h3>
          </Card>
        </div>

        {/* Add Invoice Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full py-6 mb-6 text-lg font-semibold gradient-primary border-0 shadow-md"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Buat Invoice Baru
          </Button>
        )}

        {/* Invoice Form */}
        {showForm && (
          <Card className="p-6 shadow-lg mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">Buat Invoice Baru</h2>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nomorInvoice">Nomor Invoice</Label>
                <Input
                  id="nomorInvoice"
                  type="text"
                  placeholder="INV-001"
                  value={formData.nomorInvoice}
                  onChange={(e) => setFormData({ ...formData, nomorInvoice: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pelanggan">Nama Pelanggan</Label>
                <Input
                  id="pelanggan"
                  type="text"
                  placeholder="PT Contoh Pelanggan"
                  value={formData.pelanggan}
                  onChange={(e) => setFormData({ ...formData, pelanggan: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nominal">Nominal (Rp)</Label>
                <Input
                  id="nominal"
                  type="number"
                  placeholder="0"
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                  min="0"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-lg font-semibold gradient-primary border-0"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Simpan Invoice
              </Button>
            </form>
          </Card>
        )}

        {/* Invoice List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Daftar Invoice</h3>

          <div className="space-y-3">
            {invoices.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Belum ada invoice</p>
              </Card>
            ) : (
              invoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className="p-4 shadow-card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    console.log("Klik invoice:", invoice.id);
                    navigate(`/invoice/${invoice.id}`);
                  }}
                >

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{invoice.nomor_invoice}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.pelanggan} •{" "}
                        {new Date(invoice.tanggal).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatCurrency(invoice.nominal)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          invoice.status === "Lunas"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Tombol tetap bisa diklik tanpa ikut membuka detail */}
                  {invoice.status === "Belum Dibayar" && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation(); // mencegah klik card
                        updateStatus(invoice.id, "Lunas");
                      }}
                      className="w-full mt-3 bg-success hover:bg-success/90"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tandai Lunas
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Invoice;
