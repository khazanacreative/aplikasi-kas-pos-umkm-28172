import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Upload, Package, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Header from "@/components/Header";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

const POS = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem("pos_products");
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem("pos_products", JSON.stringify(products));
    }
  }, [products]);

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from("invoice")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user?.id]);

  const addProduct = () => {
    if (!productName || !productPrice || !productStock) {
      toast({
        title: "Error",
        description: "Mohon isi semua field produk",
        variant: "destructive",
      });
      return;
    }

    const newProduct: Product = {
      id: Date.now().toString(),
      name: productName,
      price: parseFloat(productPrice),
      stock: parseInt(productStock),
    };

    setProducts([...products, newProduct]);
    setProductName("");
    setProductPrice("");
    setProductStock("");
    
    toast({
      title: "Produk Ditambahkan",
      description: `${newProduct.name} berhasil ditambahkan ke katalog`,
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importedProducts: Product[] = data.map((row: any, index: number) => ({
          id: `imported-${Date.now()}-${index}`,
          name: row.nama || row.Nama || row.name || row.Name || "",
          price: parseFloat(row.harga || row.Harga || row.price || row.Price || 0),
          stock: parseInt(row.stok || row.Stok || row.stock || row.Stock || 0),
        }));

        setProducts([...products, ...importedProducts]);
        toast({
          title: "Import Berhasil",
          description: `${importedProducts.length} produk berhasil diimport`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal membaca file Excel",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: "Stok Tidak Cukup",
          description: `Stok ${product.name} hanya ${product.stock}`,
          variant: "destructive",
        });
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock < 1) {
        toast({
          title: "Stok Habis",
          description: `${product.name} tidak tersedia`,
          variant: "destructive",
        });
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        if (newQuantity > product.stock) {
          toast({
            title: "Stok Tidak Cukup",
            description: `Stok ${product.name} hanya ${product.stock}`,
            variant: "destructive",
          });
          return item;
        }
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Keranjang Kosong",
        description: "Tambahkan produk terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Nama Pelanggan Diperlukan",
        description: "Mohon isi nama pelanggan",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = getTotalAmount();
      const today = new Date().toISOString().split('T')[0];
      const invoiceNumber = `INV-${Date.now()}`;
      const posCode = `POS-${Date.now()}`;
      const branchId = userRole?.branch_id || null;
      
      // Always create invoice (branch_id can be null and synced later)
      const { error: invoiceError } = await supabase.from("invoice").insert({
        branch_id: branchId,
        user_id: user?.id,
        nomor_invoice: invoiceNumber,
        tanggal: today,
        pelanggan: customerName,
        nominal: totalAmount,
        status: "Lunas",
      });

      if (invoiceError) throw invoiceError;

      // Save to POS transactions and transaksi only if branch exists
      if (branchId) {
        const { error: posError } = await supabase.from("pos_transaksi").insert({
          branch_id: branchId,
          kode_pos: posCode,
          tanggal: today,
          total: totalAmount,
          sumber: JSON.stringify(cart),
        });

        if (posError) throw posError;

        // Save as transaksi (debet/pemasukan)
        const { error: transaksiError } = await supabase.from("transaksi").insert({
          branch_id: branchId,
          user_id: user?.id,
          tanggal: today,
          keterangan: `Penjualan POS - ${posCode}`,
          kategori: "Penjualan",
          jenis: "Debet",
          nominal: totalAmount,
        });

        if (transaksiError) throw transaksiError;
      }

      // Update product stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      });
      setProducts(updatedProducts);

      toast({
        title: "Transaksi Berhasil",
        description: `Invoice ${invoiceNumber} - Total: Rp ${totalAmount.toLocaleString("id-ID")}`,
      });

      setCart([]);
      setCustomerName("");
      fetchInvoices(); // Refresh invoice list
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan transaksi",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast({
      title: "Produk Dihapus",
      description: "Produk berhasil dihapus dari katalog",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      {/* Header */}
      <Header
        title="KasirKu"
        subtitle="Point of Sale System"
      />

      <div className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        <Tabs defaultValue="kasir" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kasir">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Kasir
            </TabsTrigger>
            <TabsTrigger value="katalog">
              <Package className="h-4 w-4 mr-2" />
              Katalog
            </TabsTrigger>
            <TabsTrigger value="invoice">
              <FileText className="h-4 w-4 mr-2" />
              Invoice
            </TabsTrigger>
          </TabsList>

          {/* Kasir Tab */}
          <TabsContent value="kasir" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Pelanggan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Nama Pelanggan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Keranjang */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Keranjang Belanja
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Keranjang masih kosong</p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Rp {item.price.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Products Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Pilih Produk</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada produk. Tambahkan di tab Katalog.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map((product) => (
                      <Card 
                        key={product.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4 text-center">
                          <Package className="h-12 w-12 mx-auto mb-2 text-primary" />
                          <p className="font-medium mb-1">{product.name}</p>
                          <p className="text-sm text-muted-foreground mb-1">
                            Rp {product.price.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stok: {product.stock}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total & Checkout */}
            {cart.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold">Total</span>
                    <span className="text-3xl font-bold text-primary">
                      Rp {getTotalAmount().toLocaleString("id-ID")}
                    </span>
                  </div>
                  <Button onClick={handleCheckout} size="lg" className="w-full gap-2">
                    <FileText className="h-5 w-5" />
                    Proses Pembayaran & Buat Invoice
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Katalog Tab */}
          <TabsContent value="katalog" className="space-y-4">
            {/* Add Product Form */}
            <Card>
              <CardHeader>
                <CardTitle>Tambah Produk Manual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nama Produk</label>
                  <Input
                    placeholder="Contoh: Kopi Susu"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Harga</label>
                  <Input
                    type="number"
                    placeholder="15000"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Stok</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                  />
                </div>
                <Button onClick={addProduct} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Button>
                
                {/* Import Excel Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Import dari Excel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Produk dari Excel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Format Excel: Kolom <strong>nama</strong>, <strong>harga</strong>, <strong>stok</strong>
                      </p>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <label htmlFor="excel-upload" className="cursor-pointer">
                          <Button asChild>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Pilih File Excel
                            </span>
                          </Button>
                          <input
                            id="excel-upload"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleExcelImport}
                          />
                        </label>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Products List */}
            <Card>
              <CardHeader>
                <CardTitle>Daftar Produk ({products.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada produk</p>
                ) : (
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Rp {product.price.toLocaleString("id-ID")} • Stok: {product.stock}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => deleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Daftar Invoice
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada invoice yang dibuat
                  </p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <Card key={invoice.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-lg">{invoice.nomor_invoice}</p>
                              <p className="text-sm text-muted-foreground">{invoice.pelanggan}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              invoice.status === "Lunas" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            }`}>
                              {invoice.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                              {new Date(invoice.tanggal).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </p>
                            <p className="text-xl font-bold text-primary">
                              Rp {invoice.nominal.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default POS;