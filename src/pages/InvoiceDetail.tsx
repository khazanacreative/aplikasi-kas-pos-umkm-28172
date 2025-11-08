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
  Share2,
  Download,
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
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

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
      navigate("/pos?tab=invoice");
      return;
    }

    setInvoice(data);

    const { data: transactionsData } = await supabase
      .from("transaksi")
      .select("*")
      .eq("invoice_id", id)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (transactionsData) setTransactions(transactionsData);

    // Fetch invoice items
    const { data: itemsData } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true });

    if (itemsData) setInvoiceItems(itemsData);

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

  const handleShare = async () => {
    const shareData = {
      title: `Invoice ${invoice?.nomor_invoice}`,
      text: `Invoice untuk ${invoice?.pelanggan} - ${formatCurrency(invoice?.nominal || 0)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link disalin",
        description: "Link invoice telah disalin ke clipboard",
      });
    }
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    const element = document.getElementById("invoice-pdf-template");
    if (!element || !invoice) return;

    // Temporarily show the hidden PDF template
    element.style.display = "block";

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 800,
        windowWidth: 800,
      });

      // Hide the template again
      element.style.display = "none";

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice_${invoice.nomor_invoice}.pdf`);

      toast({
        title: "Berhasil",
        description: "Invoice berhasil diunduh sebagai PDF",
      });
    } catch (error) {
      element.style.display = "none";
      toast({
        title: "Error",
        description: "Gagal mengunduh PDF",
        variant: "destructive",
      });
    }
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
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/pos?tab=invoice")}
              className="justify-start"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Hidden PDF Template - Desktop Layout */}
        <div id="invoice-pdf-template" style={{ display: "none", width: "800px", padding: "40px", backgroundColor: "#ffffff" }}>
          <div style={{ marginBottom: "30px", borderBottom: "2px solid #e5e7eb", paddingBottom: "20px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px", color: "#1a1a1a" }}>{invoice.nomor_invoice}</h1>
            <span style={{ 
              display: "inline-block", 
              fontSize: "14px", 
              padding: "6px 16px", 
              borderRadius: "20px",
              backgroundColor: invoice.status === "Lunas" ? "#dcfce7" : "#fef3c7",
              color: invoice.status === "Lunas" ? "#16a34a" : "#ca8a04",
              fontWeight: "600"
            }}>
              {invoice.status}
            </span>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Pelanggan</p>
              <p style={{ fontSize: "20px", fontWeight: "600", color: "#1a1a1a" }}>{invoice.pelanggan}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Tanggal Invoice</p>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a" }}>
                {new Date(invoice.tanggal).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>Nominal</p>
              <p style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed" }}>
                {formatCurrency(invoice.nominal)}
              </p>
            </div>
          </div>

          {invoiceItems.length > 0 && (
            <div style={{ marginTop: "30px", borderTop: "2px solid #e5e7eb", paddingTop: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#1a1a1a" }}>Detail Item Penjualan</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "12px 8px", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Nama Item</th>
                    <th style={{ textAlign: "right", padding: "12px 8px", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Jumlah</th>
                    <th style={{ textAlign: "right", padding: "12px 8px", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Harga Satuan</th>
                    <th style={{ textAlign: "right", padding: "12px 8px", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 8px" }}>
                        <p style={{ fontWeight: "500", color: "#1a1a1a" }}>{item.nama_item}</p>
                        {item.keterangan && (
                          <p style={{ fontSize: "14px", color: "#6b7280" }}>{item.keterangan}</p>
                        )}
                      </td>
                      <td style={{ textAlign: "right", padding: "12px 8px", fontWeight: "500", color: "#1a1a1a" }}>{item.jumlah}</td>
                      <td style={{ textAlign: "right", padding: "12px 8px", color: "#1a1a1a" }}>{formatCurrency(item.harga_satuan)}</td>
                      <td style={{ textAlign: "right", padding: "12px 8px", fontWeight: "bold", color: "#7c3aed" }}>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                    <td colSpan={3} style={{ textAlign: "right", padding: "12px 8px", fontWeight: "bold", color: "#1a1a1a" }}>Total:</td>
                    <td style={{ textAlign: "right", padding: "12px 8px", fontWeight: "bold", fontSize: "20px", color: "#7c3aed" }}>
                      {formatCurrency(invoice.nominal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
              <div>
                <p style={{ color: "#6b7280", marginBottom: "4px" }}>Dibuat pada</p>
                <p style={{ fontWeight: "500", color: "#1a1a1a" }}>
                  {new Date(invoice.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <div>
                <p style={{ color: "#6b7280", marginBottom: "4px" }}>Terakhir diubah</p>
                <p style={{ fontWeight: "500", color: "#1a1a1a" }}>
                  {new Date(invoice.updated_at).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visible Invoice Content - Responsive */}
        <div id="invoice-content">
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

          {invoiceItems.length > 0 && (
            <Card className="p-6 shadow-lg mb-6">
              <h3 className="text-lg font-bold mb-4">Detail Item Penjualan</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-muted-foreground">Nama Item</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">Jumlah</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">Harga Satuan</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <p className="font-medium">{item.nama_item}</p>
                          {item.keterangan && (
                            <p className="text-sm text-muted-foreground">{item.keterangan}</p>
                          )}
                        </td>
                        <td className="text-right py-3 px-2 font-medium">{item.jumlah}</td>
                        <td className="text-right py-3 px-2">{formatCurrency(item.harga_satuan)}</td>
                        <td className="text-right py-3 px-2 font-bold text-primary">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={3} className="text-right py-3 px-2 font-bold">Total:</td>
                      <td className="text-right py-3 px-2 font-bold text-xl text-primary">
                        {formatCurrency(invoice.nominal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>


        {transactions.length > 0 && (
          <Card className="p-6 shadow-lg mb-6">
            <h3 className="text-lg font-bold mb-4">Riwayat Transaksi Terkait</h3>
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
