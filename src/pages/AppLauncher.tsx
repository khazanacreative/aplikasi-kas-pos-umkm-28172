import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ShoppingCart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const AppLauncher = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">Selamat Datang di LapKeu</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden md:block">Pilih aplikasi yang ingin Anda gunakan</p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Keluar</span>
          </Button>
        </div>

        {/* App Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
          {/* KasKu App */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm
                      flex flex-col items-center text-center"
            onClick={() => navigate("/dashboard")}
          >
            <CardHeader className="space-y-3 md:space-y-4 p-4 md:p-6 w-full flex flex-col items-center">
              <div className="flex flex-col items-center gap-3 md:flex-col md:text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Wallet className="h-8 w-8 md:h-12 md:w-12 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-2xl mb-1 md:mb-2">KasKu</CardTitle>
                  <CardDescription className="text-xs md:text-base font-medium">
                    Aplikasi Pencatatan Keuangan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4 w-full">
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Kelola transaksi debet kredit, invoice, dan laporan keuangan Bisnis Anda
              </p>
              <Button className="w-full text-sm shadow-lg hover:shadow-xl transition-all" size="lg">
                Buka Aplikasi
              </Button>
            </CardContent>
          </Card>

          {/* KasirKu App */}
          <Card 
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-accent bg-gradient-to-br from-card via-card to-accent/5 backdrop-blur-sm
                      flex flex-col items-center text-center"
            onClick={() => navigate("/pos")}
          >
            <CardHeader className="space-y-3 md:space-y-4 p-4 md:p-6 w-full flex flex-col items-center">
              <div className="flex flex-col items-center gap-3 md:flex-col md:text-center">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-accent via-accent to-accent/80 flex items-center justify-center shadow-lg shadow-accent/20">
                  <ShoppingCart className="h-8 w-8 md:h-12 md:w-12 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-2xl mb-1 md:mb-2">KasirKu</CardTitle>
                  <CardDescription className="text-xs md:text-base font-medium">
                    Aplikasi Point of Sale
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4 w-full">
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Sistem kasir untuk penjualan, stok barang, dan laporan penjualan
              </p>
              <Button className="w-full text-sm shadow-lg hover:shadow-xl transition-all" size="lg" variant="secondary">
                Buka Aplikasi
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppLauncher;
