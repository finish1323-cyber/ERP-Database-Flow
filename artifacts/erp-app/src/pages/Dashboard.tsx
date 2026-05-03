import {
  useGetDashboardStats,
  useGetDashboardMonthlySales,
  useGetDashboardMonthlyPurchases,
  useGetDashboardTopItems,
  useGetDashboardTopCustomers,
} from "@workspace/api-client-react";
import { Users, Package, ShoppingCart, FileText, AlertTriangle, Clock, TrendingUp, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const ARABIC_MONTHS: Record<string, string> = {
  "01": "يناير",
  "02": "فبراير",
  "03": "مارس",
  "04": "أبريل",
  "05": "مايو",
  "06": "يونيو",
  "07": "يوليو",
  "08": "أغسطس",
  "09": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

function formatMonth(yyyyMM: string): string {
  const [, mm] = yyyyMM.split("-");
  return ARABIC_MONTHS[mm] ?? yyyyMM;
}

const PIE_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#93c5fd", "#7dd3fc", "#38bdf8",
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{message}</div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: monthlySales } = useGetDashboardMonthlySales();
  const { data: monthlyPurchases } = useGetDashboardMonthlyPurchases();
  const { data: topItems } = useGetDashboardTopItems();
  const { data: topCustomers } = useGetDashboardTopCustomers();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

  const salesData = (monthlySales ?? []).map((p) => ({
    name: formatMonth(p.month),
    الإيرادات: p.total,
  }));

  const purchasesData = (monthlyPurchases ?? []).map((p) => ({
    name: formatMonth(p.month),
    الكميات: p.quantity,
  }));

  const topItemsData = (topItems ?? []).map((p) => ({
    name: p.itemName,
    value: p.totalQuantity,
  }));

  const topCustomersData = (topCustomers ?? []).map((p) => ({
    name: p.customerName,
    الإيرادات: p.totalRevenue,
  }));

  return (
    <div className="space-y-8">
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="الإيرادات الشهرية (آخر 12 شهراً)">
          {salesData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات مبيعات بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "الإيرادات"]}
                  contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="الإيرادات" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="حركة المخزون الواردة (آخر 12 شهراً)">
          {purchasesData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات مشتريات بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={purchasesData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                <Tooltip
                  formatter={(value: number) => [value, "الكميات المستلمة"]}
                  contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }}
                />
                <Line
                  type="monotone"
                  dataKey="الكميات"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="أكثر الأصناف مبيعاً">
          {topItemsData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات مبيعات بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={topItemsData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}٪)`
                  }
                  labelLine={false}
                >
                  {topItemsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, "الكمية"]}
                  contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="أفضل العملاء من حيث الإيرادات">
          {topCustomersData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات عملاء بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topCustomersData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  width={90}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "الإيرادات"]}
                  contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="الإيرادات" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
