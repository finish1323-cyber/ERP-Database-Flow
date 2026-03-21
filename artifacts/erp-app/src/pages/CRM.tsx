import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey,
  useListOrders, useCreateOrder, useUpdateOrder, useDeleteOrder, getListOrdersQueryKey,
  useListItems
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Phone, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export function CRM() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">خدمة العملاء والمبيعات (CRM)</h1>
      </div>
      
      <Tabs defaultValue="customers" className="w-full" dir="rtl">
        <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="customers" className="rounded-lg">العملاء</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg">الطلبات</TabsTrigger>
        </TabsList>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CustomersTab() {
  const { data: customers, isLoading } = useListCustomers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMut = useCreateCustomer({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); toast({title: "تمت الإضافة"}); setAddOpen(false); } } });
  const deleteMut = useDeleteCustomer({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); toast({title: "تم الحذف"}); } } });

  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", deliverySuccessRate: 100 });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({ data: formData });
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">قاعدة بيانات العملاء</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> إضافة عميل</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2"><label className="text-sm">الاسم *</label><Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-sm">الهاتف</label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-sm">البريد الإلكتروني</label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-2"><label className="text-sm">نسبة نجاح الاستلام (%)</label><Input type="number" min="0" max="100" value={formData.deliverySuccessRate} onChange={e => setFormData({...formData, deliverySuccessRate: parseInt(e.target.value)})} /></div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">معلومات الاتصال</TableHead>
              <TableHead className="text-right">جودة الاستلام</TableHead>
              <TableHead className="text-right">تاريخ الإضافة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow> : 
             customers?.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-primary">{c.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {c.email}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={c.deliverySuccessRate && c.deliverySuccessRate < 50 ? "text-red-600 border-red-200 bg-red-50" : "text-green-600 border-green-200 bg-green-50"}>
                    {c.deliverySuccessRate}%
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(c.createdAt)}</TableCell>
                <TableCell className="text-left">
                    <Button variant="ghost" size="icon" onClick={() => confirm("حذف؟") && deleteMut.mutate({ id: c.id })}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading } = useListOrders();
  const { data: customers } = useListCustomers();
  const { data: items } = useListItems();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMut = useCreateOrder({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); toast({title: "تمت إضافة الطلب"}); setAddOpen(false); } } });
  const updateMut = useUpdateOrder({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }); toast({title: "تم تحديث الحالة"}); setEditOpen(false); } } });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [statusVal, setStatusVal] = useState<any>("pending");

  const [formData, setFormData] = useState({ customerId: 0, items: [{ itemId: 0, quantity: 1, unitPrice: 0 }] });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.customerId || formData.items[0].itemId === 0) return toast({title: "البيانات غير مكتملة", variant: "destructive"});
    createMut.mutate({ data: { customerId: formData.customerId, status: "pending", items: formData.items } });
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ id: editingOrder.id, data: { status: statusVal } });
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      pending: { label: "قيد الانتظار", color: "bg-amber-100 text-amber-800" },
      confirmed: { label: "مؤكد", color: "bg-blue-100 text-blue-800" },
      delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800" },
      cancelled: { label: "ملغي", color: "bg-red-100 text-red-800" }
    };
    const s = map[status] || map.pending;
    return <Badge className={`${s.color} hover:${s.color} border-none`}>{s.label}</Badge>;
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">طلبات العملاء</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> طلب جديد</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>تسجيل طلب جديد</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm">العميل *</label>
                <Select value={formData.customerId.toString()} onValueChange={v => setFormData({...formData, customerId: parseInt(v)})}>
                  <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  <SelectContent>{customers?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 p-4 bg-muted/30 rounded-xl border border-border">
                <label className="text-sm font-bold block mb-2">المنتج المطلوب</label>
                <Select value={formData.items[0].itemId.toString()} onValueChange={v => {
                  const item = items?.find(i => i.id === parseInt(v));
                  setFormData({...formData, items: [{...formData.items[0], itemId: parseInt(v), unitPrice: item?.defaultPrice || 0}]})
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                  <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2"><label className="text-sm text-muted-foreground">الكمية</label><Input type="number" min="1" value={formData.items[0].quantity} onChange={e => setFormData({...formData, items: [{...formData.items[0], quantity: parseInt(e.target.value)}]})} /></div>
                  <div className="space-y-2"><label className="text-sm text-muted-foreground">سعر الوحدة</label><Input type="number" step="0.01" value={formData.items[0].unitPrice} onChange={e => setFormData({...formData, items: [{...formData.items[0], unitPrice: parseFloat(e.target.value)}]})} /></div>
                </div>
              </div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">إنشاء الطلب</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">رقم الطلب</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-left">تحديث</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow> : 
             orders?.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-muted-foreground">#{o.id}</TableCell>
                <TableCell className="font-bold">{o.customerName}</TableCell>
                <TableCell>{formatCurrency(o.totalAmount)}</TableCell>
                <TableCell>{getStatusBadge(o.status)}</TableCell>
                <TableCell>{formatDate(o.createdAt)}</TableCell>
                <TableCell className="text-left">
                    <Button variant="outline" size="sm" onClick={() => {setEditingOrder(o); setStatusVal(o.status); setEditOpen(true);}}>تحديث الحالة</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تحديث حالة الطلب #{editingOrder?.id}</DialogTitle></DialogHeader>
          <form onSubmit={handleStatusUpdate} className="space-y-4 pt-4">
            <Select value={statusVal} onValueChange={setStatusVal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={updateMut.isPending} className="w-full">تحديث</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
