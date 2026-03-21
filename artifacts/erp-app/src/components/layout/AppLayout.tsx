import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  PackageSearch, 
  Users, 
  FileText,
  LogOut,
  Building2,
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/purchasing", label: "المشتريات والموردين", icon: ShoppingCart },
  { href: "/warehouse", label: "المخزن واللوجستيات", icon: PackageSearch },
  { href: "/crm", label: "خدمة العملاء (CRM)", icon: Users },
  { href: "/sales", label: "المبيعات والفواتير", icon: FileText },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <div className="flex flex-col gap-2 mt-8 w-full">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} className="w-full">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans text-right" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-card border-l border-border shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">إدارة <span className="text-primary">مؤسسة</span></h1>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-border/50">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground">إدارة <span className="text-primary">مؤسسة</span></h1>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 flex flex-col" dir="rtl">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">القائمة الرئيسية</h2>
              </div>
              <nav className="flex-1 px-4 py-2 overflow-y-auto">
                <NavLinks />
              </nav>
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
