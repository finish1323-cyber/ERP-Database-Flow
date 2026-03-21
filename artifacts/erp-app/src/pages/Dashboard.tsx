import { useGetDashboardStats } from "@workspace/api-client-react";
import { Users, Package, ShoppingCart, FileText, AlertTriangle, Clock, TrendingUp, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const statCards = [
    { title: "إجمالي الموردين", value: stats?.suppliersCount || 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "الأصناف المعرفة", value: stats?.itemsCount || 0, icon: Package, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "قاعدة العملاء", value: stats?.customersCount || 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "إجمالي الطلبات", value: stats?.ordersCount || 0, icon: ShoppingCart, color: "text-violet-600", bg: "bg-violet-100" },
    { title: "الفواتير المصدرة", value: stats?.invoicesCount || 0, icon: FileText, color: "text-fuchsia-600", bg: "bg-fuchsia-100" },
    { title: "إجمالي الإيرادات", value: formatCurrency(stats?.totalRevenue), icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { title: "طلبات قيد الانتظار", value: stats?.pendingOrdersCount || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "نواقص المخزون", value: stats?.lowStockCount || 0, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-100" },
  ];

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl overflow-hidden shadow-lg mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/60 z-10 mix-blend-multiply" />
        <img 
          src={`${import.meta.env.BASE_URL}images/dashboard-bg.png`} 
          alt="Dashboard Hero" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">مرحباً بك في نظام الإدارة</h1>
          <p className="text-white/80 max-w-2xl text-lg">نظرة عامة على أداء المؤسسة وحالة الأقسام المختلفة اليوم.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
