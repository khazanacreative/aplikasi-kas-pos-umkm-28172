import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Reports = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  
  // All hooks must be at the top, before any returns
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<"weekly" | "monthly" | "yearly">("monthly");

  // Define fetchTransactions before using it in useEffect
  const fetchTransactions = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    let query = supabase
      .from("transaksi")
      .select("*")
      .eq("user_id", user.id)
      .gte("tanggal", startDate)
      .lte("tanggal", endDate)
      .order("tanggal", { ascending: false });
    
    // Show user's transactions: either their branch transactions or their own transactions without branch
    if (userRole?.branch_id) {
      query = query.or(`branch_id.eq.${userRole.branch_id},branch_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data transaksi",
        variant: "destructive",
      });
    } else {
      setTransactions(data || []);
    }
    setIsLoading(false);
  };

  // All useEffect hooks together
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id]);

  // NOW conditional returns
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate totals from real data
  const totalPemasukan = transactions
    .filter(t => t.jenis === "Debet")
    .reduce((sum, t) => sum + Number(t.nominal), 0);
  
  const totalPengeluaran = transactions
    .filter(t => t.jenis === "Kredit")
    .reduce((sum, t) => sum + Number(t.nominal), 0);
  
  const selisih = totalPemasukan - totalPengeluaran;

  // Group by day for weekly view (last 7 days)
  const weeklyData = transactions.reduce((acc: any[], t) => {
    const date = new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const existing = acc.find(m => m.periode === date);
    
    if (existing) {
      if (t.jenis === "Debet") existing.pemasukan += Number(t.nominal);
      if (t.jenis === "Kredit") existing.pengeluaran += Number(t.nominal);
    } else {
      acc.push({
        periode: date,
        pemasukan: t.jenis === "Debet" ? Number(t.nominal) : 0,
        pengeluaran: t.jenis === "Kredit" ? Number(t.nominal) : 0,
      });
    }
    return acc;
  }, []).slice(-7);

  // Group by week for monthly view (last 4-5 weeks)
  const monthlyData = transactions.reduce((acc: any[], t) => {
    const date = new Date(t.tanggal);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekLabel = `Minggu ${weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`;
    const existing = acc.find(m => m.periode === weekLabel);
    
    if (existing) {
      if (t.jenis === "Debet") existing.pemasukan += Number(t.nominal);
      if (t.jenis === "Kredit") existing.pengeluaran += Number(t.nominal);
    } else {
      acc.push({
        periode: weekLabel,
        pemasukan: t.jenis === "Debet" ? Number(t.nominal) : 0,
        pengeluaran: t.jenis === "Kredit" ? Number(t.nominal) : 0,
      });
    }
    return acc;
  }, []).slice(-5);

  // Group by month for yearly view (last 12 months)
  const yearlyData = transactions.reduce((acc: any[], t) => {
    const month = new Date(t.tanggal).toLocaleString('id-ID', { month: 'short', year: 'numeric' });
    const existing = acc.find(m => m.periode === month);
    
    if (existing) {
      if (t.jenis === "Debet") existing.pemasukan += Number(t.nominal);
      if (t.jenis === "Kredit") existing.pengeluaran += Number(t.nominal);
    } else {
      acc.push({
        periode: month,
        pemasukan: t.jenis === "Debet" ? Number(t.nominal) : 0,
        pengeluaran: t.jenis === "Kredit" ? Number(t.nominal) : 0,
      });
    }
    return acc;
  }, []).slice(-12);

  const getFilteredData = () => {
    switch (periodFilter) {
      case "weekly":
        return weeklyData;
      case "yearly":
        return yearlyData;
      default:
        return monthlyData;
    }
  };

  // Group by category
  const kategoriData = transactions.reduce((acc: any[], t) => {
    const existing = acc.find(k => k.kategori === t.kategori);
    if (existing) {
      existing.jumlah += Number(t.nominal);
    } else {
      acc.push({ kategori: t.kategori, jumlah: Number(t.nominal) });
    }
    return acc;
  }, []);

  const maxKategori = Math.max(...kategoriData.map(k => k.jumlah), 1);
  const kategoriBelanja = kategoriData.map(k => ({
    ...k,
    persentase: (k.jumlah / maxKategori) * 100
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada transaksi untuk diekspor",
        variant: "destructive",
      });
      return;
    }

    // Sort transactions by date ascending for proper balance calculation
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    // Prepare data with running balance
    let runningBalance = 0;
    const exportData = sortedTransactions.map((t, index) => {
      const debet = t.jenis === "Debet" ? Number(t.nominal) : 0;
      const kredit = t.jenis === "Kredit" ? Number(t.nominal) : 0;
      runningBalance += debet - kredit;

      return {
        No: index + 1,
        "Invoice/Tanggal": t.invoice_id ? `${t.invoice_id.substring(0, 8)}... / ${t.tanggal}` : t.tanggal,
        Keterangan: t.keterangan,
        Debet: debet || "",
        Kredit: kredit || "",
        Saldo: runningBalance,
      };
    });

    // Add summary row
    exportData.push({} as any);
    exportData.push({
      No: "",
      "Invoice/Tanggal": "",
      Keterangan: "TOTAL",
      Debet: totalPemasukan,
      Kredit: totalPengeluaran,
      Saldo: selisih,
    } as any);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    
    const fileName = `Laporan_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Berhasil",
      description: "Laporan berhasil diekspor ke Excel",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      <Header 
        title="Laporan" 
        subtitle="Analisis keuangan usaha"
      />

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        {/* Filter Date Range */}
        <Card className="p-5 shadow-lg mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Pilih Periode</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-xs">Dari Tanggal</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-xs">Sampai Tanggal</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            className="w-full gradient-primary border-0" 
            size="sm"
            onClick={fetchTransactions}
            disabled={isLoading}
          >
            {isLoading ? "Memuat..." : "Tampilkan Laporan"}
          </Button>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <p className="text-xs sm:text-sm text-muted-foreground">Total Pemasukan</p>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-success break-words">{formatCurrency(totalPemasukan)}</h3>
          </Card>

          <Card className="p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <p className="text-xs sm:text-sm text-muted-foreground">Total Pengeluaran</p>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-destructive break-words">{formatCurrency(totalPengeluaran)}</h3>
          </Card>

          <Card className="p-4 shadow-card gradient-card">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <p className="text-xs sm:text-sm text-muted-foreground">Selisih</p>
            </div>
            <h3 className={`text-base sm:text-xl font-bold break-words ${selisih >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(selisih)}
            </h3>
          </Card>
        </div>

        {/* Filtered Bar Chart */}
        <Card className="p-5 shadow-lg mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Grafik Per Periode
            </h3>
            <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="weekly" className="text-xs sm:text-sm">Mingguan</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">Bulanan</TabsTrigger>
                <TabsTrigger value="yearly" className="text-xs sm:text-sm">Tahunan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getFilteredData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periode" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="pemasukan" fill="hsl(var(--success))" name="Pemasukan" />
              <Bar dataKey="pengeluaran" fill="hsl(var(--destructive))" name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Breakdown */}
        <Card className="p-5 shadow-lg mb-6">
          <h3 className="font-semibold mb-4">Breakdown per Kategori</h3>
          
          <div className="space-y-4">
            {kategoriBelanja.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-xs sm:text-sm font-medium truncate">{item.kategori}</span>
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{formatCurrency(item.jumlah)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="gradient-primary h-full transition-all"
                    style={{ width: `${item.persentase}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          className="w-full py-5 sm:py-6 text-base sm:text-lg font-semibold gradient-secondary border-0 shadow-md"
          size="lg"
        >
          <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Export ke Excel
        </Button>
      </main>
    </div>
  );
};

export default Reports;
