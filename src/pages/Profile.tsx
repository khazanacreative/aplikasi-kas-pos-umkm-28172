import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Store, MapPin, Phone, LogOut } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // 🔹 State untuk menyimpan data form
  const [formData, setFormData] = useState({
    namaUsaha: "",
    alamat: "",
    whatsapp: "",
  });

  // 🔹 State untuk kontrol read-only
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch existing profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setFormData({
          namaUsaha: data.nama_usaha || "",
          alamat: data.alamat || "",
          whatsapp: data.whatsapp || "",
        });
        setIsReadOnly(true);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user?.id) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        nama_usaha: formData.namaUsaha,
        alamat: formData.alamat,
        whatsapp: formData.whatsapp,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data profil",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Data profil berhasil disimpan",
      });
      setIsReadOnly(true);
    }

    setIsSaving(false);
  };

  const handleEdit = () => {
    setIsReadOnly(false);
  };

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
      <Header title="Profil" subtitle="Kelola informasi usaha Anda" />

      <main className="max-w-screen-xl mx-auto px-4 -mt-16 relative z-10">
        <Card className="p-6 shadow-lg animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="gradient-primary p-3 rounded-xl">
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Informasi Usaha</h2>
          </div>

          <form className="space-y-5" onSubmit={handleSave}>
            {/* ID Akun */}
            <div className="space-y-2">
              <Label htmlFor="accountId" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                ID Akun (untuk sinkronisasi)
              </Label>
              <Input
                id="accountId"
                type="text"
                value={user?.id || ""}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                ID ini digunakan untuk sinkronisasi dengan aplikasi admin pusat
              </p>
            </div>

            {/* Nama Usaha */}
            <div className="space-y-2">
              <Label htmlFor="namaUsaha" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Nama Usaha
              </Label>
              <Input
                id="namaUsaha"
                type="text"
                placeholder="Masukkan nama usaha"
                value={formData.namaUsaha}
                onChange={handleChange}
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            {/* Alamat */}
            <div className="space-y-2">
              <Label htmlFor="alamat" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Alamat
              </Label>
              <Input
                id="alamat"
                type="text"
                placeholder="Masukkan alamat usaha"
                value={formData.alamat}
                onChange={handleChange}
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            {/* Nomor WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Nomor WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="08123456789"
                value={formData.whatsapp}
                onChange={handleChange}
                readOnly={isReadOnly}
                className={isReadOnly ? "bg-muted" : ""}
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1 py-6 text-lg font-semibold gradient-primary border-0"
                size="lg"
                disabled={isSaving}
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>

              {isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="py-6 text-lg font-semibold"
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-6 shadow-lg mt-6">
          <h3 className="text-lg font-semibold mb-4">Pengaturan Lainnya</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" size="lg">
              Sinkronisasi Data
            </Button>
            <Button variant="outline" className="w-full justify-start" size="lg">
              API Integration
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              size="lg"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
