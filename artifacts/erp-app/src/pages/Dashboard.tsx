import { useState, useEffect } from "react";
import {
  useGetDashboardStats,
  useGetDashboardMonthlySales,
  useGetDashboardMonthlyPurchases,
  useGetDashboardTopItems,
  useGetDashboardTopCustomers,
} from "@workspace/api-client-react";
import { Users, Package, ShoppingCart, FileText, AlertTriangle, Clock, TrendingUp, Briefcase, CheckSquare, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { useAuthState } from "@/hooks/use-auth";
import { getAuthToken } from "@/lib/auth";
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

const BASE = import.meta.env.BASE_URL;

function authHeaders() {
  const token = getAuthToken();
  return { ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

const ARABIC_MONTHS: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function formatMonth(yyyyMM: string): string {
  const [, mm] = yyyyMM.split("-");
  return ARABIC_MONTHS[mm] ?? yyyyMM;
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
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

function getGreeting(name: string): string {
  const h = new Date().getHours();
  let g = "مرحباً";
  if (h >= 5 && h < 12) g = "صباح الخير";
  else if (h >= 12 && h < 17) g = "مساء الخير";
  else if (h >= 17 && h < 21) g = "مساء النور";
  else g = "طابت ليلتك";
  return name ? `${g}، ${name}` : g;
}

function getArabicDate(): string {
  return new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

interface PersonalData {
  overdueTasks: { id: number; title: string; priority: string; dueDate: string; assigneeName: string | null }[];
  upcomingTasks: { id: number; title: string; priority: string; dueDate: string; assigneeName: string | null }[];
  lowStockCount: number;
  pendingOrdersCount: number;
  unpaidInvoicesCount: number;
  todaySales: number;
  monthSales: number;
  sevenDaySales: { day: string; total: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفض", medium: "متوسط", high: "عالي", urgent: "عاجل",
};

function ActionCard({
  kind,
  title,
  count,
  href,
  children,
}: {
  kind: "red" | "yellow" | "green";
  title: string;
  count?: number;
  href?: string;
  children?: React.ReactNode;
}) {
  const colors = {
    red: "bg-red-50 border-red-200",
    yellow: "bg-amber-50 border-amber-200",
    green: "bg-green-50 border-green-200",
  };
  const textColors = { red: "text-red-700", yellow: "text-amber-700", green: "text-green-700" };
  const badgeColors = { red: "bg-red-100 text-red-800", yellow: "bg-amber-100 text-amber-800", green: "bg-green-100 text-green-800" };

  return (
    <div className={`rounded-2xl border p-4 ${colors[kind]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold text-sm ${textColors[kind]}`}>{title}</span>
        {count !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[kind]}`}>{count}</span>
        )}
        {href && (
          <Link href={href}>
            <LinkIcon className={`w-3.5 h-3.5 ${textColors[kind]} opacity-70 hover:opacity-100`} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function Dashboard() {
  const authState = useAuthState();
  const role = authState.status === "authenticated" ? authState.info.role : "sales";
  const userName = authState.status === "authenticated" ? authState.info.name : "";

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: monthlySales } = useGetDashboardMonthlySales();
  const { data: monthlyPurchases } = useGetDashboardMonthlyPurchases();
  const { data: topItems } = useGetDashboardTopItems();
  const { data: topCustomers } = useGetDashboardTopCustomers();

  const [personal, setPersonal] = useState<PersonalData | null>(null);

  useEffect(() => {
    fetch(`${BASE}api/dashboard/personal`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setPersonal(d))
      .catch(() => {});
  }, []);

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

  const salesData = (monthlySales ?? []).map((p) => ({ name: formatMonth(p.month), الإيرادات: p.total }));
  const purchasesData = (monthlyPurchases ?? []).map((p) => ({ name: formatMonth(p.month), الكميات: p.quantity }));
  const topItemsData = (topItems ?? []).map((p) => ({ name: p.itemName, value: p.totalQuantity }));
  const topCustomersData = (topCustomers ?? []).map((p) => ({ name: p.customerName, الإيرادات: p.totalRevenue }));
  const sevenDayData = (personal?.sevenDaySales ?? []).map((d) => ({
    name: new Date(d.day).toLocaleDateString("ar-EG", { weekday: "short" }),
    الإيرادات: d.total,
  }));

  const overdueCount = personal?.overdueTasks.length ?? 0;
  const upcomingCount = personal?.upcomingTasks.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/60 z-10 mix-blend-multiply" />
        <img
          src={`${BASE}images/dashboard-bg.png`}
          alt="Dashboard Hero"
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 z-20 p-8 flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{getGreeting(userName)}</h1>
          <p className="text-white/80 text-base">{getArabicDate()}</p>
          {(role === "admin" || role === "sales") && personal && (
            <div className="flex gap-4 mt-3 flex-wrap">
              <span className="text-white/90 text-sm">مبيعات اليوم: <strong>{formatCurrency(personal.todaySales)}</strong></span>
              <span className="text-white/90 text-sm">هذا الشهر: <strong>{formatCurrency(personal.monthSales)}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Personal action cards */}
      {personal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Red — action required */}
          {overdueCount > 0 && (
            <ActionCard kind="red" title="مهام متأخرة — تتطلب تدخلاً" count={overdueCount} href="/tasks">
              <ul className="space-y-1 mt-1">
                {personal.overdueTasks.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-xs text-red-800">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{t.title}</span>
                    <span className={`text-[10px] px-1.5 rounded-full ${PRIORITY_COLORS[t.priority] ?? ""}`}>{PRIORITY_LABELS[t.priority]}</span>
                  </li>
                ))}
              </ul>
            </ActionCard>
          )}
          {personal.lowStockCount > 0 && (
            <ActionCard kind="red" title="مخزون تحت الحد الأدنى" count={personal.lowStockCount} href="/warehouse">
              <p className="text-xs text-red-700 mt-1">يتطلب إعادة تعبئة عاجلة</p>
            </ActionCard>
          )}
          {(role === "admin" || role === "sales") && personal.unpaidInvoicesCount > 0 && (
            <ActionCard kind="red" title="فواتير غير مدفوعة" count={personal.unpaidInvoicesCount} href="/sales">
              <p className="text-xs text-red-700 mt-1">تحتاج إلى متابعة مع العملاء</p>
            </ActionCard>
          )}

          {/* Yellow — follow up */}
          {personal.pendingOrdersCount > 0 && (
            <ActionCard kind="yellow" title="أوامر شراء معلقة" count={personal.pendingOrdersCount} href="/purchasing">
              <p className="text-xs text-amber-700 mt-1">بانتظار المعالجة أو الاستلام</p>
            </ActionCard>
          )}
          {upcomingCount > 0 && (
            <ActionCard kind="yellow" title="مهام قريبة الموعد" count={upcomingCount} href="/tasks">
              <ul className="space-y-1 mt-1">
                {personal.upcomingTasks.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-xs text-amber-800">
                    <Clock className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{t.title}</span>
                    {t.dueDate && <span className="text-[10px] text-amber-600">{formatShortDate(t.dueDate)}</span>}
                  </li>
                ))}
              </ul>
            </ActionCard>
          )}

          {/* Green — all good */}
          {overdueCount === 0 && (
            <ActionCard kind="green" title="المهام">
              <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> لا توجد مهام متأخرة
              </p>
            </ActionCard>
          )}
          {personal.lowStockCount === 0 && (
            <ActionCard kind="green" title="المخزون">
              <p className="text-xs text-green-700 mt-1">جميع الأصناف فوق الحد الأدنى</p>
            </ActionCard>
          )}
        </div>
      )}

      {/* Stat cards */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="الإيرادات الشهرية (آخر 12 شهراً)">
          {salesData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات مبيعات بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "الإيرادات"]} contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }} />
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
                <Tooltip formatter={(value: number) => [value, "الكميات المستلمة"]} contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }} />
                <Line type="monotone" dataKey="الكميات" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
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
                <Pie data={topItemsData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}٪)`} labelLine={false}>
                  {topItemsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, "الكمية"]} contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }} />
                <Legend formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="أفضل العملاء من حيث الإيرادات">
          {topCustomersData.length === 0 ? (
            <EmptyChart message="لا توجد بيانات عملاء بعد" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCustomersData} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={90} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "الإيرادات"]} contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="الإيرادات" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Admin: 7-day sales chart */}
      {role === "admin" && sevenDayData.length > 0 && (
        <ChartCard title="مبيعات آخر 7 أيام">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sevenDayData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => formatCurrency(v)} width={70} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "الإيرادات"]} contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="الإيرادات" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
