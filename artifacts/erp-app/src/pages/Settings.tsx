import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, Users, Shield, Settings2, Download, Plus, Pencil, Power, Trash2,
  Save, Upload, Eye,
} from "lucide-react";
import {
  getCompanyProfile, updateCompanyProfile, listEmployees, createEmployee,
  updateEmployee, toggleEmployee, deleteEmployee, listAuditLog, downloadBackup,
  type CompanyProfile, type Employee, type AuditEntry, type CreateEmployeeInput,
} from "@/lib/settings-api";

const TABS = [
  { id: "company", label: "بيانات الشركة", icon: Building2 },
  { id: "employees", label: "الموظفون", icon: Users },
  { id: "audit", label: "سجل المراقبة", icon: Shield },
  { id: "system", label: "إعدادات النظام", icon: Settings2 },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  purchasing: "المشتريات",
  sales: "المبيعات",
  warehouse: "المخزن",
};

const ROLE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  purchasing: "secondary",
  sales: "outline",
  warehouse: "outline",
};

const CURRENCIES = ["EGP", "USD", "EUR", "SAR", "AED"];

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    create: { label: "إضافة", cls: "bg-green-100 text-green-700 border-green-200" },
    update: { label: "تعديل", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    delete: { label: "حذف", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const { label, cls } = map[action] ?? { label: action, cls: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cls}`}>{label}</span>;
}

// ─── Company Profile Tab ───────────────────────────────────────────────────
function CompanyTab() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<Partial<CompanyProfile>>({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCompanyProfile().then((p) => { setProfile(p); setForm(p); }).catch(() => {});
  }, []);

  function field(key: keyof CompanyProfile) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحد الأقصى 2 ميغابايت.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, logoData: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateCompanyProfile(form);
      setProfile(updated);
      setForm(updated);
      toast({ title: "تم الحفظ بنجاح", description: "تم تحديث بيانات الشركة." });
    } catch (err) {
      toast({ title: "خطأ في الحفظ", description: err instanceof Error ? err.message : "حدث خطأ.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <div className="flex items-center justify-center py-24 text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-lg">شعار الشركة</h3>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl border border-border bg-slate-50 flex items-center justify-center overflow-hidden">
            {form.logoData
              ? <img src={form.logoData} alt="logo" className="w-full h-full object-contain" />
              : <Building2 className="w-10 h-10 text-muted-foreground/40" />
            }
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 ml-2" />
              رفع شعار
            </Button>
            {form.logoData && (
              <Button variant="ghost" size="sm" onClick={() => setPreview(true)}>
                <Eye className="w-4 h-4 ml-2" />
                معاينة
              </Button>
            )}
            {form.logoData && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setForm((f) => ({ ...f, logoData: null }))}>
                <Trash2 className="w-4 h-4 ml-2" />
                إزالة الشعار
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG أو JPG — بحد أقصى 2 ميغابايت</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-lg">البيانات الأساسية</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>اسم الشركة *</Label>
            <Input value={form.name ?? ""} onChange={field("name")} placeholder="اسم الشركة أو المؤسسة" />
          </div>
          <div className="space-y-1.5">
            <Label>النشاط التجاري</Label>
            <Input value={form.activity ?? ""} onChange={field("activity")} placeholder="مثال: تجارة وتوريد" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>العنوان</Label>
            <Input value={form.address ?? ""} onChange={field("address")} placeholder="العنوان التفصيلي" />
          </div>
          <div className="space-y-1.5">
            <Label>رقم الهاتف</Label>
            <Input value={form.phone ?? ""} onChange={field("phone")} placeholder="01xxxxxxxxx" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>العملة الافتراضية</Label>
            <Select value={form.currency ?? "EGP"} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>رقم السجل التجاري</Label>
            <Input value={form.commercialReg ?? ""} onChange={field("commercialReg")} placeholder="رقم السجل التجاري" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label>رقم البطاقة الضريبية</Label>
            <Input value={form.taxId ?? ""} onChange={field("taxId")} placeholder="رقم البطاقة الضريبية" dir="ltr" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="w-4 h-4 ml-2" />
        {saving ? "جارٍ الحفظ..." : "حفظ البيانات"}
      </Button>

      {preview && form.logoData && (
        <Dialog open onOpenChange={() => setPreview(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>معاينة الشعار</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <img src={form.logoData} alt="preview" className="max-h-48 object-contain" />
              <div className="text-center">
                <div className="font-bold text-xl text-primary">{form.name || "اسم الشركة"}</div>
                <div className="text-sm text-muted-foreground">{form.activity || "النشاط التجاري"}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Employees Tab ────────────────────────────────────────────────────────
function EmployeesTab() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm: CreateEmployeeInput = { name: "", email: "", password: "", role: "sales", jobTitle: "" };
  const [addForm, setAddForm] = useState<CreateEmployeeInput>(emptyForm);
  const [editForm, setEditForm] = useState<Partial<CreateEmployeeInput & { isActive: boolean }>>({});

  function load() {
    setLoading(true);
    listEmployees().then(setEmployees).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!addForm.name || !addForm.email || !addForm.password) return;
    setSubmitting(true);
    try {
      await createEmployee(addForm);
      toast({ title: "تم إضافة الموظف", description: `تم إنشاء حساب ${addForm.name} بنجاح.` });
      setAddOpen(false);
      setAddForm(emptyForm);
      load();
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      await updateEmployee(editTarget.id, payload);
      toast({ title: "تم التعديل", description: "تم تحديث بيانات الموظف بنجاح." });
      setEditTarget(null);
      load();
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(emp: Employee) {
    try {
      await toggleEmployee(emp.id);
      toast({ title: emp.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب" });
      load();
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : "حدث خطأ.", variant: "destructive" });
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${emp.name}"؟`)) return;
    try {
      await deleteEmployee(emp.id);
      toast({ title: "تم حذف الموظف" });
      load();
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  }

  const EmployeeForm = ({ form, setForm, isEdit = false }: {
    form: Partial<CreateEmployeeInput>;
    setForm: (fn: (f: typeof form) => typeof form) => void;
    isEdit?: boolean;
  }) => (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-1.5">
        <Label>الاسم الكامل *</Label>
        <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="الاسم" />
      </div>
      <div className="space-y-1.5">
        <Label>البريد الإلكتروني *</Label>
        <Input type="email" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <Label>{isEdit ? "كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)" : "كلمة المرور *"}</Label>
        <Input type="password" value={form.password ?? ""} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" dir="ltr" />
      </div>
      <div className="space-y-1.5">
        <Label>الدور الوظيفي</Label>
        <Select value={form.role ?? "sales"} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>المسمى الوظيفي</Label>
        <Input value={form.jobTitle ?? ""} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} placeholder="مثال: مدير مشتريات" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">الموظفون ({employees.length})</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 ml-2" />إضافة موظف</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
            <EmployeeForm form={addForm} setForm={setAddForm as (fn: (f: Partial<CreateEmployeeInput>) => Partial<CreateEmployeeInput>) => void} />
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAdd} disabled={submitting || !addForm.name || !addForm.email || !addForm.password} className="flex-1">
                {submitting ? "جارٍ الإضافة..." : "إضافة"}
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">إلغاء</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">جارٍ التحميل...</div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          لا يوجد موظفون حتى الآن. أضف أول موظف.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id} className={emp.isActive ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{emp.email}</div>
                    {emp.jobTitle && <div className="text-xs text-muted-foreground">{emp.jobTitle}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE[emp.role] ?? "outline"}>{ROLE_LABELS[emp.role] ?? emp.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.isActive ? "default" : "secondary"}>
                      {emp.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        title="تعديل"
                        onClick={() => { setEditTarget(emp); setEditForm({ name: emp.name, email: emp.email, role: emp.role, jobTitle: emp.jobTitle ?? "", password: "" }); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title={emp.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                        onClick={() => handleToggle(emp)}
                        className={emp.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" title="حذف"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(emp)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>تعديل بيانات {editTarget?.name}</DialogTitle></DialogHeader>
          <EmployeeForm form={editForm} setForm={setEditForm as (fn: (f: Partial<CreateEmployeeInput>) => Partial<CreateEmployeeInput>) => void} isEdit />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleEdit} disabled={submitting} className="flex-1">
              {submitting ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Button variant="outline" onClick={() => setEditTarget(null)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────
function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAuditLog(200).then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const ENTITY_LABELS: Record<string, string> = {
    employees: "الموظفون",
    suppliers: "الموردون",
    items: "الأصناف",
    customers: "العملاء",
    orders: "الطلبات",
    invoices: "الفواتير",
    inventory: "المخزن",
    "stock-movements": "حركات المخزن",
    "price-comparisons": "مقارنات الأسعار",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">سجل النشاط والمراقبة</h3>
        <span className="text-sm text-muted-foreground">{entries.length} حدث</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">جارٍ التحميل...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          لا توجد أحداث مسجلة بعد.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الموظف</TableHead>
                <TableHead className="text-right">العملية</TableHead>
                <TableHead className="text-right">القسم</TableHead>
                <TableHead className="text-right">التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("ar-EG")}
                  </TableCell>
                  <TableCell className="font-medium">{entry.employeeName}</TableCell>
                  <TableCell><ActionBadge action={entry.action} /></TableCell>
                  <TableCell className="text-sm">{ENTITY_LABELS[entry.entity] ?? entry.entity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{entry.details ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── System Settings Tab ──────────────────────────────────────────────────
function SystemTab() {
  const { toast } = useToast();
  const [safetyLevel, setSafetyLevel] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCompanyProfile().then((p) => setSafetyLevel(p.defaultSafetyLevel ?? 5)).catch(() => {});
  }, []);

  async function saveSafetyLevel() {
    setSaving(true);
    try {
      await updateCompanyProfile({ defaultSafetyLevel: safetyLevel });
      toast({ title: "تم الحفظ", description: "تم تحديث مستوى التنبيه الافتراضي." });
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-lg">تنبيهات المخزن</h3>
        <p className="text-sm text-muted-foreground">
          القيمة الافتراضية لمستوى الأمان في المخزن. سيتم تنبيهك عند وصول أي صنف لهذا العدد.
        </p>
        <div className="flex items-center gap-3">
          <div className="space-y-1.5 flex-1">
            <Label>مستوى التنبيه الافتراضي (وحدة)</Label>
            <Input
              type="number" min={0} max={9999}
              value={safetyLevel}
              onChange={(e) => setSafetyLevel(parseInt(e.target.value) || 0)}
            />
          </div>
          <Button onClick={saveSafetyLevel} disabled={saving} className="mt-6">
            <Save className="w-4 h-4 ml-2" />
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-lg">النسخ الاحتياطي</h3>
        <p className="text-sm text-muted-foreground">
          تصدير جميع بيانات النظام (الموردين، الأصناف، العملاء، الطلبات، الفواتير، وسجل النشاط) في ملف JSON واحد.
        </p>
        <Button variant="outline" onClick={downloadBackup}>
          <Download className="w-4 h-4 ml-2" />
          تصدير نسخة احتياطية
        </Button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────
export function Settings() {
  const [tab, setTab] = useState("company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          إدارة <span className="text-primary">الصلاحيات والإعدادات</span>
        </h1>
        <p className="text-muted-foreground mt-1">تخصيص النظام، إدارة الفريق، ومراقبة الأمان</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-full max-w-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tab === "company" && <CompanyTab />}
        {tab === "employees" && <EmployeesTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "system" && <SystemTab />}
      </div>
    </div>
  );
}

export default Settings;
