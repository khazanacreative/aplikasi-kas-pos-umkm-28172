import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Upload, Package, FileText, Search, Edit, PlusCircle, Receipt, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import Header from "@/components/Header";
import { useSearchParams } from "react-router-dom";
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
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "kasir";
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Invoice Pagination & Filter
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceFilterDate, setInvoiceFilterDate] = useState<string>("");
  const invoiceItemsPerPage = 5;
  
  // Edit Product Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  
  // Add Stock Dialog
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null);
  const [addStockAmount, setAddStockAmount] = useState("");

  // Auth protection
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
    
    let query = supabase
      .from("invoice")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: false });
    
    if (invoiceFilterDate) {
      query = query.eq("tanggal", invoiceFilterDate);
    }
    
    const { data: invoicesData, error: invoicesError } = await query;

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      return;
    }

    // Check which invoices have been recorded in transactions
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("transaksi")
      .select("invoice_id")
      .eq("user_id", user.id)
      .not("invoice_id", "is", null);

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
    }

    const recordedInvoiceIds = new Set(transactionsData?.map(t => t.invoice_id) || []);

    // Update invoice status based on whether it's been recorded
    const invoicesWithStatus = invoicesData?.map(invoice => ({
      ...invoice,
      status: recordedInvoiceIds.has(invoice.id) ? "Lunas" : "Belum Lunas"
    })) || [];

    setInvoices(invoicesWithStatus);
  };

  useEffect(() => {
    fetchInvoices();
  }, [user?.id, invoiceFilterDate]);

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
      const { data: invoiceData, error: invoiceError } = await supabase.from("invoice").insert({
        branch_id: branchId,
        user_id: user?.id,
        nomor_invoice: invoiceNumber,
        tanggal: today,
        pelanggan: customerName,
        nominal: totalAmount,
        status: "Belum Lunas",
      }).select().single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from cart
      const invoiceItems = cart.map(item => ({
        invoice_id: invoiceData.id,
        nama_item: item.name,
        jumlah: item.quantity,
        harga_satuan: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) throw itemsError;

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

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditDialogOpen(true);
  };

  const saveEditProduct = () => {
    if (!editingProduct || !editName || !editPrice || !editStock) {
      toast({
        title: "Error",
        description: "Mohon isi semua field",
        variant: "destructive",
      });
      return;
    }

    setProducts(products.map(p => 
      p.id === editingProduct.id 
        ? { ...p, name: editName, price: parseFloat(editPrice), stock: parseInt(editStock) }
        : p
    ));

    toast({
      title: "Produk Diperbarui",
      description: `${editName} berhasil diperbarui`,
    });

    setEditDialogOpen(false);
    setEditingProduct(null);
  };

  const openAddStockDialog = (product: Product) => {
    setAddStockProduct(product);
    setAddStockAmount("");
    setAddStockDialogOpen(true);
  };

  const saveAddStock = () => {
    if (!addStockProduct || !addStockAmount) {
      toast({
        title: "Error",
        description: "Mohon isi jumlah stok",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(addStockAmount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Jumlah stok harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    setProducts(products.map(p => 
      p.id === addStockProduct.id 
        ? { ...p, stock: p.stock + amount }
        : p
    ));

    toast({
      title: "Stok Ditambahkan",
      description: `${amount} stok berhasil ditambahkan ke ${addStockProduct.name}`,
    });

    setAddStockDialogOpen(false);
    setAddStockProduct(null);
  };

  // Filter & Pagination
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20 relative z-0">
      {/* Header */}
      <Header title="KasirKu" subtitle="Point of Sale System" />
        <div className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
          <Tabs defaultValue={tabParam} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="kasir">
                <ShoppingCart className="h-4 w-4 mr-2" /> Kasir
              </TabsTrigger>
              <TabsTrigger value="katalog">
                <Package className="h-4 w-4 mr-2" /> Katalog
              </TabsTrigger>
              <TabsTrigger value="invoice">
                <FileText className="h-4 w-4 mr-2" /> Invoice
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
                <div className="flex items-center justify-between">
                  <CardTitle>Pilih Produk</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari produk..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "Produk tidak ditemukan" : "Belum ada produk. Tambahkan di tab Katalog."}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {paginatedProducts.map((product) => (
                        <Card 
                          key={product.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addToCart(product)}
                        >
                          <CardContent className="p-4 text-center">
                            <Package className="h-12 w-12 mx-auto mb-2 text-primary" />
                            <p className="font-medium mb-1 line-clamp-2">{product.name}</p>
                            <p className="text-sm text-muted-foreground mb-1">
                              Rp {product.price.toLocaleString("id-ID")}
                            </p>
                            <p className={`text-xs font-medium ${product.stock < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Stok: {product.stock}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {totalPages > 1 && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Daftar Produk ({filteredProducts.length})</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari produk..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "Produk tidak ditemukan" : "Belum ada produk"}
                  </p>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nama Produk</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-right">Stok</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right">
                                Rp {product.price.toLocaleString("id-ID")}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={product.stock < 10 ? "text-destructive font-semibold" : ""}>
                                  {product.stock}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => openEditDialog(product)}
                                    title="Edit Produk"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={() => deleteProduct(product.id)}
                                    title="Hapus Produk"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {totalPages > 1 && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Edit Product Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Produk</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nama Produk</label>
                    <Input
                      placeholder="Nama produk"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Harga</label>
                    <Input
                      type="number"
                      placeholder="Harga"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stok</label>
                    <Input
                      type="number"
                      placeholder="Stok"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveEditProduct} className="flex-1">
                      Simpan Perubahan
                    </Button>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                      Batal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Add Stock Dialog */}
            <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Stok</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {addStockProduct && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">{addStockProduct.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Stok saat ini: {addStockProduct.stock}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Jumlah Stok Ditambahkan</label>
                    <Input
                      type="number"
                      placeholder="Contoh: 50"
                      value={addStockAmount}
                      onChange={(e) => setAddStockAmount(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveAddStock} className="flex-1">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Tambah Stok
                    </Button>
                    <Button variant="outline" onClick={() => setAddStockDialogOpen(false)} className="flex-1">
                      Batal
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                {/* Date Filter */}
                <div className="space-y-2 mb-6">
                  <Label htmlFor="invoiceFilterDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Filter Tanggal (Opsional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="invoiceFilterDate"
                      type="date"
                      value={invoiceFilterDate}
                      onChange={(e) => {
                        setInvoiceFilterDate(e.target.value);
                        setInvoicePage(1);
                      }}
                      className="flex-1"
                    />
                    {invoiceFilterDate && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setInvoiceFilterDate("");
                          setInvoicePage(1);
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {invoiceFilterDate 
                      ? `Tidak ada invoice pada tanggal ${new Date(invoiceFilterDate).toLocaleDateString('id-ID')}`
                      : "Belum ada invoice yang dibuat"}
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {invoices.slice(
                        (invoicePage - 1) * invoiceItemsPerPage,
                        invoicePage * invoiceItemsPerPage
                      ).map((invoice) => (
                      <Card
                        key={invoice.id}
                        onClick={() => navigate(`/invoice/${invoice.id}`)}
                        className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base sm:text-lg truncate">{invoice.nomor_invoice}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{invoice.pelanggan}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  invoice.status === "Lunas"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                }`}
                              >
                                {invoice.status}
                              </span>
                              {invoice.status !== "Lunas" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/transactions?tab=tambah&invoice_id=${invoice.id}`);
                                  }}
                                  className="gap-1 whitespace-nowrap"
                                >
                                  <Receipt className="h-3 w-3" />
                                  <span className="hidden xs:inline">Catat</span>
                                  <span className="inline xs:hidden">📝</span>
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(invoice.tanggal).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-lg sm:text-xl font-bold text-primary break-words">
                              Rp {invoice.nominal.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    </div>

                    {/* Invoice Pagination */}
                    {invoices.length > invoiceItemsPerPage && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                              className={invoicePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.ceil(invoices.length / invoiceItemsPerPage) }, (_, i) => i + 1).map(page => (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setInvoicePage(page)}
                                isActive={invoicePage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setInvoicePage(p => Math.min(Math.ceil(invoices.length / invoiceItemsPerPage), p + 1))}
                              className={invoicePage === Math.ceil(invoices.length / invoiceItemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
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