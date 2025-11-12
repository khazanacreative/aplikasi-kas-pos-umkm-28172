import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Calendar, Plus, History, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Invoice {
  id: string;
  nomor_invoice: string;
  pelanggan: string;
  nominal: number;
  tanggal: string;
}

interface Transaction {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  jenis: string;
  nominal: number;
  invoice_id: string | null;
  created_at: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "tambah";
  const prefilledInvoiceId = searchParams.get("invoice_id");

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionItemsPerPage = 5;
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: "",
    kategori: "",
    jenis: "",
    nominal: "",
    invoice_id: "",
  });

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      setTransactionPage(1);
    }
  }, [filterDate]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from("invoice")
      .select("id, nomor_invoice, pelanggan, nominal, tanggal")
      .eq("user_id", user?.id)
      .order("tanggal", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return;
    }

    setInvoices(data || []);
    
    // Auto-fill form if invoice_id is in URL
    if (prefilledInvoiceId && data) {
      const selectedInvoice = data.find(inv => inv.id === prefilledInvoiceId);
      if (selectedInvoice) {
        setFormData({
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: `Penjualan - ${selectedInvoice.pelanggan} (${selectedInvoice.nomor_invoice})`,
          kategori: "Penjualan Tunai",
          jenis: "Debet",
          nominal: selectedInvoice.nominal.toString(),
          invoice_id: prefilledInvoiceId,
        });
        toast({
          title: "Invoice Dipilih",
          description: `Data dari ${selectedInvoice.nomor_invoice} telah diisi otomatis`,
        });
      }
    }
  };

  const fetchTransactions = async () => {
    let query = supabase
      .from("transaksi")
      .select("*")
      .eq("user_id", user?.id)
      .eq("tanggal", filterDate)
      .order("created_at", { ascending: false });

    if (userRole?.branch_id) {
      query = query.or(`branch_id.eq.${userRole.branch_id},branch_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    setTransactions(data || []);
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from("transaksi")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus transaksi",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: "Transaksi berhasil dihapus",
    });

    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tanggal || !formData.keterangan || !formData.kategori || !formData.jenis || !formData.nominal) {
      toast({
        title: "Error",
        description: "Semua field harus diisi!",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("transaksi").insert({
      branch_id: userRole?.branch_id || null,
      user_id: user?.id,
      tanggal: formData.tanggal,
      keterangan: formData.keterangan,
      kategori: formData.kategori,
      jenis: formData.jenis,
      nominal: parseFloat(formData.nominal),
      invoice_id: formData.invoice_id || null,
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
      description: "Transaksi berhasil ditambahkan!",
    });

    // If this transaction was linked to an invoice, show success message
    if (formData.invoice_id) {
      toast({
        title: "Invoice Tercatat",
        description: "Invoice telah berubah status menjadi Lunas",
      });
    }

    setFilterDate(formData.tanggal);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: "",
      kategori: "",
      jenis: "",
      nominal: "",
      invoice_id: "",
    });

    fetchTransactions();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const kategoriJenisMap: Record<string, "Debet" | "Kredit"> = {
    "Modal Awal / Setoran Pemilik": "Debet",
    "Penjualan Tunai": "Debet",
    "Piutang": "Debet",
    "Pembelian Barang / Belanja": "Kredit",
    "Gaji": "Kredit",
    "Operasional": "Kredit",
    "Pembelian Aset": "Kredit",
    "Pembayaran Utang": "Kredit",
    "Penerimaan Pinjaman / Utang Baru": "Debet",
    "Pengambilan Pemilik": "Kredit",
    "Pendapatan Jasa Lain-lain": "Debet",
  };

  const kategoris = Object.keys(kategoriJenisMap);

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      <Header 
        title="Transaksi" 
        subtitle="Tambah dan kelola transaksi"
      />

      <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tambah" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Riwayat Transaksi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tambah">
            <Card className="p-6 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">Tambah Transaksi Baru</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="tanggal" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Tanggal
                  </Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Input
                    id="keterangan"
                    type="text"
                    placeholder="Contoh: Penjualan Produk A"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kategori">Kategori</Label>
                  <Select
                    value={formData.kategori}
                    onValueChange={(value) => {
                      const suggestedJenis = kategoriJenisMap[value];
                      setFormData({ 
                        ...formData, 
                        kategori: value, 
                        jenis: suggestedJenis,
                        invoice_id: "" 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoris.map((kategori) => (
                        <SelectItem key={kategori} value={kategori}>
                          {kategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.kategori === "Penjualan Tunai" && (
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Pilih Invoice (Opsional)</Label>
                    <Select
                      value={formData.invoice_id}
                      onValueChange={(value) => {
                        const selectedInvoice = invoices.find(inv => inv.id === value);
                        if (selectedInvoice) {
                          setFormData({ 
                            ...formData, 
                            invoice_id: value,
                            nominal: selectedInvoice.nominal.toString(),
                            keterangan: `Penjualan - ${selectedInvoice.pelanggan} (${selectedInvoice.nomor_invoice})`
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih dari invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.nomor_invoice} - {invoice.pelanggan} (Rp {invoice.nominal.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis Transaksi</Label>
                  <Select
                    value={formData.jenis}
                    onValueChange={(value) => setFormData({ ...formData, jenis: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.kategori && kategoriJenisMap[formData.kategori] === "Debet" ? (
                        <>
                          <SelectItem value="Debet">
                            <span className="text-success font-medium">✓ Debet (Pemasukan)</span>
                          </SelectItem>
                          <SelectItem value="Kredit">
                            <span className="text-destructive font-medium">Kredit (Pengeluaran)</span>
                          </SelectItem>
                        </>
                      ) : formData.kategori && kategoriJenisMap[formData.kategori] === "Kredit" ? (
                        <>
                          <SelectItem value="Kredit">
                            <span className="text-destructive font-medium">✓ Kredit (Pengeluaran)</span>
                          </SelectItem>
                          <SelectItem value="Debet">
                            <span className="text-success font-medium">Debet (Pemasukan)</span>
                          </SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Debet">
                            <span className="text-success font-medium">Debet (Pemasukan)</span>
                          </SelectItem>
                          <SelectItem value="Kredit">
                            <span className="text-destructive font-medium">Kredit (Pengeluaran)</span>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nominal">Nominal (Rp)</Label>
                  <Input
                    id="nominal"
                    type="number"
                    placeholder="0"
                    value={formData.nominal}
                    onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                    className="w-full"
                    min="0"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full py-6 text-lg font-semibold gradient-primary border-0"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Simpan
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="riwayat">
            <Card className="p-6 shadow-lg animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <History className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">Riwayat Transaksi</h2>
              </div>

              <div className="space-y-2 mb-6">
                <Label htmlFor="filterDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filter Tanggal
                </Label>
                <Input
                  id="filterDate"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {transactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Tidak ada transaksi pada tanggal {new Date(filterDate).toLocaleDateString('id-ID')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {transactions.slice(
                      (transactionPage - 1) * transactionItemsPerPage,
                      transactionPage * transactionItemsPerPage
                    ).map((transaction) => (
                    <Card 
                      key={transaction.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/transactions/${transaction.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.jenis === "Debet" 
                                ? "bg-success/10 text-success" 
                                : "bg-destructive/10 text-destructive"
                            }`}>
                              {transaction.jenis}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {transaction.kategori}
                            </span>
                          </div>
                          <p className="font-medium mb-1">{transaction.keterangan}</p>
                          <p className={`text-lg font-bold ${
                            transaction.jenis === "Debet" ? "text-success" : "text-destructive"
                          }`}>
                            {formatCurrency(transaction.nominal)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction.id);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  </div>

                  {/* Transaction Pagination */}
                  {transactions.length > transactionItemsPerPage && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                            className={transactionPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.ceil(transactions.length / transactionItemsPerPage) }, (_, i) => i + 1).map(page => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setTransactionPage(page)}
                              isActive={transactionPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setTransactionPage(p => Math.min(Math.ceil(transactions.length / transactionItemsPerPage), p + 1))}
                            className={transactionPage === Math.ceil(transactions.length / transactionItemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Transactions;
