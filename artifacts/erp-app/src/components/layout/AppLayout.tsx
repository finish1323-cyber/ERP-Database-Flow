import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, PackageSearch, Users, FileText,
  LogOut, Building2, Menu, Settings,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/auth";
import { useAuthState, type UserRole } from "@/hooks/use-auth";
import { getCompanyProfile, type CompanyProfile } from "@/lib/settings-api";

type NavItem = { href: string; label: string; icon: React.ElementType; roles: UserRole[] };

const ALL_ROLES: UserRole[] = ["admin", "purchasing", "sales", "warehouse"];

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/purchasing", label: "المشتريات والموردين", icon: ShoppingCart, roles: ["admin", "purchasing"] },
  { href: "/warehouse", label: "المخزن واللوجستيات", icon: PackageSearch, roles: ["admin", "purchasing", "warehouse"] },
  { href: "/crm", label: "خدمة العملاء (CRM)", icon: Users, roles: ["admin", "sales"] },
  { href: "/sales", label: "المبيعات والفواتير", icon: FileText, roles: ["admin", "sales"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["admin"] },
];

function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  useEffect(() => {
    getCompanyProfile().then(setProfile).catch(() => {});
  }, []);
  return profile;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const profile = useCompanyProfile();

  const role = authState.status === "authenticated" ? authState.info.role : "sales";
  const userName = authState.status === "authenticated" ? authState.info.name : "";

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const companyName = profile?.name || "إدارة مؤسسة";
  const logoData = profile?.logoData;

  const handleSignOut = () => {
    clearAuth();
    queryClient.clear();
  };

  const LogoBlock = ({ size = "md" }: { size?: "sm" | "md" }) => (
    <div className={`flex items-center gap-2 ${size === "sm" ? "gap-2" : "gap-3"}`}>
      <div className={`bg-primary/10 rounded-lg text-primary flex items-center justify-center overflow-hidden ${size === "sm" ? "p-1.5 w-9 h-9" : "p-2 w-11 h-11"}`}>
        {logoData
          ? <img src={logoData} alt="logo" className="w-full h-full object-contain" />
          : <Building2 className={size === "sm" ? "w-5 h-5" : "w-6 h-6"} />
        }
      </div>
      <div>
        <h1 className={`font-bold text-foreground leading-tight ${size === "sm" ? "text-lg" : "text-xl"}`}>
          {companyName.length > 20 ? companyName.slice(0, 20) + "…" : companyName}
        </h1>
      </div>
    </div>
  );

  const NavLinks = () => (
    <div className="flex flex-col gap-1 mt-6 w-full">
      {visibleItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="w-full">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}>
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary-foreground" : ""}`} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  const UserBlock = () => (
    <div className="px-3 pb-2">
      {userName && (
        <div className="text-xs text-muted-foreground mb-2 truncate">
          مرحباً، <span className="font-medium text-foreground">{userName}</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        data-testid="button-sign-out"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">تسجيل الخروج</span>
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans text-right" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-l border-border shadow-sm">
        <div className="p-4 border-b border-border/50">
          <LogoBlock />
        </div>
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="border-t border-border/50 pt-2">
          <UserBlock />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border shadow-sm">
          <LogoBlock size="sm" />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-64 flex flex-col" dir="rtl">
              <div className="p-4 border-b border-border">
                <LogoBlock size="sm" />
              </div>
              <nav className="flex-1 px-3 py-3 overflow-y-auto">
                <NavLinks />
              </nav>
              <div className="border-t border-border/50 pt-2 pb-2">
                <div className="px-3 pb-1">
                  {userName && (
                    <div className="text-xs text-muted-foreground mb-2 truncate">
                      مرحباً، <span className="font-medium text-foreground">{userName}</span>
                    </div>
                  )}
                </div>
                <div className="px-3">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    data-testid="button-sign-out-mobile"
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
