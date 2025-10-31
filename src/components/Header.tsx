import { Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  subtitle: string;
  showBranchSelector?: boolean;
  selectedBranch?: string;
  branches?: Array<{ id: string; nama_cabang: string }>;
  onBranchChange?: (branchId: string) => void;
}

const Header = ({ 
  title, 
  subtitle, 
  showBranchSelector = false,
  selectedBranch,
  branches = [],
  onBranchChange 
}: HeaderProps) => {
  return (
    <>
      {/* Header utama */}
      <header className="gradient-primary text-white pb-20 relative z-0 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-6 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm opacity-90 mt-0.5">{subtitle}</p>
              </div>
            </div>

            {showBranchSelector && branches.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                    size="sm"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {branches.find(b => b.id === selectedBranch)?.nama_cabang || "Pilih Cabang"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {branches.map((branch) => (
                    <DropdownMenuItem
                      key={branch.id}
                      onClick={() => onBranchChange?.(branch.id)}
                      className={selectedBranch === branch.id ? "bg-accent" : ""}
                    >
                      {branch.nama_cabang}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Spacer kecil agar konten di bawah tidak menabrak total */}
      <div className="h-8 md:h-10"></div>
    </>
  );
};

export default Header;
