import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, getListSuppliersQueryKey,
  useListItems, useCreateItem, useUpdateItem, useDeleteItem, getListItemsQueryKey,
  useListPriceComparisons, useCreatePriceComparison, useUpdatePriceComparison, useDeletePriceComparison, getListPriceComparisonsQueryKey,
  type Supplier, type Item, type PriceComparison,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Purchasing() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">المشتريات والموردين</h1>
      </div>

      <Tabs defaultValue="suppliers" className="w-full" dir="rtl">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="suppliers" className="rounded-lg">الموردين</TabsTrigger>
          <TabsTrigger value="items" className="rounded-lg">الأصناف</TabsTrigger>
          <TabsTrigger value="comparisons" className="rounded-lg">مقارنات الأسعار</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="items"><ItemsTab /></TabsContent>
        <TabsContent value="comparisons"><PriceComparisonsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

type SupplierForm = { name: string; contactName: string; phone: string; email: string; address: string };
const emptySupplierForm: SupplierForm = { name: "", contactName: "", phone: "", email: "", address: "" };

function SuppliersTab() {
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading } = useListSuppliers({ search });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierForm>(emptySupplierForm);

  const createMut = useCreateSupplier({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "تمت الإضافة" }); setAddOpen(false); } } });
  const deleteMut = useDeleteSupplier({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "تم الحذف" }); } } });
  const updateMut = useUpdateSupplier({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "تم التعديل" }); setEditOpen(false); } } });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: formData });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMut.mutate({ id: editingItem.id, data: formData });
  };

  const openEdit = (item: Supplier) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      contactName: item.contactName ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
    });
    setEditOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <div className="relative w-72">
          <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث عن مورد..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 rounded-xl" />
        </div>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); setFormData(emptySupplierForm); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md"><Plus className="w-4 h-4 ml-2" /> إضافة مورد</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader><DialogTitle>إضافة مورد جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2"><label className="text-sm font-medium">اسم المورد *</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">اسم المسؤول</label><Input value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">الهاتف</label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">البريد الإلكتروني</label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">اسم المورد</TableHead>
              <TableHead className="text-right">المسؤول</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">تاريخ الإضافة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow> :
              suppliers?.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد موردين</TableCell></TableRow> :
                suppliers?.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactName || "-"}</TableCell>
                    <TableCell>{s.phone || "-"}</TableCell>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("تأكيد الحذف؟")) deleteMut.mutate({ id: s.id }); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader><DialogTitle>تعديل المورد</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2"><label className="text-sm font-medium">اسم المورد *</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">اسم المسؤول</label><Input value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">الهاتف</label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">البريد الإلكتروني</label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
            <Button type="submit" disabled={updateMut.isPending} className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ItemForm = { name: string; category: string; description: string; defaultPrice: number };
const emptyItemForm: ItemForm = { name: "", category: "", description: "", defaultPrice: 0 };

function ItemsTab() {
  const { data: items, isLoading } = useListItems();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<ItemForm>(emptyItemForm);

  const createMut = useCreateItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() }); toast({ title: "تمت الإضافة" }); setAddOpen(false); } } });
  const updateMut = useUpdateItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() }); toast({ title: "تم التعديل" }); setEditOpen(false); } } });
  const deleteMut = useDeleteItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() }); toast({ title: "تم الحذف" }); } } });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: { ...formData, defaultPrice: formData.defaultPrice || 0 } });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMut.mutate({ id: editingItem.id, data: formData });
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category ?? "",
      description: item.description ?? "",
      defaultPrice: typeof item.defaultPrice === "string" ? parseFloat(item.defaultPrice) : (item.defaultPrice ?? 0),
    });
    setEditOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">قائمة الأصناف</h2>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); setFormData(emptyItemForm); }}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> إضافة صنف</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>صنف جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2"><label className="text-sm">الاسم *</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm">التصنيف</label><Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm">السعر الافتراضي</label><Input type="number" step="0.01" value={formData.defaultPrice} onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })} /></div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">التصنيف</TableHead>
              <TableHead className="text-right">السعر الافتراضي</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8">جاري التحميل...</TableCell></TableRow> :
              items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell>{formatCurrency(item.defaultPrice)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("حذف؟")) deleteMut.mutate({ id: item.id }); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل الصنف</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2"><label className="text-sm">الاسم *</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm">التصنيف</label><Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm">السعر الافتراضي</label><Input type="number" step="0.01" value={formData.defaultPrice} onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })} /></div>
            <Button type="submit" disabled={updateMut.isPending} className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type PriceForm = { itemId: number; supplierId: number; quotedPrice: number };
const emptyPriceForm: PriceForm = { itemId: 0, supplierId: 0, quotedPrice: 0 };

function PriceComparisonsTab() {
  const { data: comps, isLoading } = useListPriceComparisons();
  const { data: items } = useListItems();
  const { data: suppliers } = useListSuppliers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceComparison | null>(null);
  const [formData, setFormData] = useState<PriceForm>(emptyPriceForm);

  const createMut = useCreatePriceComparison({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPriceComparisonsQueryKey() }); toast({ title: "تمت الإضافة" }); setAddOpen(false); } } });
  const updateMut = useUpdatePriceComparison({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPriceComparisonsQueryKey() }); toast({ title: "تم التعديل" }); setEditOpen(false); } } });
  const deleteMut = useDeletePriceComparison({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPriceComparisonsQueryKey() }); toast({ title: "تم الحذف" }); } } });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.supplierId) { toast({ title: "الرجاء اختيار الصنف والمورد", variant: "destructive" }); return; }
    createMut.mutate({ data: formData });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMut.mutate({ id: editingItem.id, data: formData });
  };

  const openEdit = (c: PriceComparison) => {
    setEditingItem(c);
    setFormData({
      itemId: c.itemId,
      supplierId: c.supplierId,
      quotedPrice: typeof c.quotedPrice === "string" ? parseFloat(c.quotedPrice) : c.quotedPrice,
    });
    setEditOpen(true);
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">مقارنات عروض الأسعار</h2>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); setFormData(emptyPriceForm); }}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> عرض سعر جديد</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>تسجيل عرض سعر</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm">الصنف *</label>
                <Select value={formData.itemId.toString()} onValueChange={v => setFormData({ ...formData, itemId: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                  <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">المورد *</label>
                <Select value={formData.supplierId.toString()} onValueChange={v => setFormData({ ...formData, supplierId: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                  <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm">السعر المعروض *</label><Input type="number" step="0.01" required value={formData.quotedPrice} onChange={e => setFormData({ ...formData, quotedPrice: parseFloat(e.target.value) || 0 })} /></div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">المورد</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow> :
              comps?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.itemName}</TableCell>
                  <TableCell>{c.supplierName}</TableCell>
                  <TableCell className="font-bold text-primary">{formatCurrency(c.quotedPrice)}</TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit2 className="w-4 h-4 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("حذف؟")) deleteMut.mutate({ id: c.id }); }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل عرض السعر</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm">الصنف *</label>
              <Select value={formData.itemId.toString()} onValueChange={v => setFormData({ ...formData, itemId: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm">المورد *</label>
              <Select value={formData.supplierId.toString()} onValueChange={v => setFormData({ ...formData, supplierId: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{suppliers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm">السعر المعروض *</label><Input type="number" step="0.01" required value={formData.quotedPrice} onChange={e => setFormData({ ...formData, quotedPrice: parseFloat(e.target.value) || 0 })} /></div>
            <Button type="submit" disabled={updateMut.isPending} className="w-full">حفظ التعديلات</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
