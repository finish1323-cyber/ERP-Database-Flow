import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, getListInvoicesQueryKey,
  useListOrders
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { format } from "date-fns";

export function Sales() {
  const { data: invoices, isLoading } = useListInvoices();
  const { data: orders } = useListOrders();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMut = useCreateInvoice({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); toast({title: "تم إصدار الفاتورة"}); setAddOpen(false); } } });
  const updateMut = useUpdateInvoice({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); toast({title: "تم التحديث"}); setEditOpen(false); } } });
  const deleteMut = useDeleteInvoice({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }); toast({title: "تم الحذف"}); } } });

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<any>(null);
  const [statusVal, setStatusVal] = useState<any>("draft");

  const [formData, setFormData] = useState({ orderId: 0, invoiceNumber: `INV-${Math.floor(Math.random()*10000)}`, issuedAt: format(new Date(), 'yyyy-MM-dd'), total: 0, status: "issued" as any });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.orderId) return;
    createMut.mutate({ data: { ...formData, issuedAt: new Date(formData.issuedAt).toISOString() } });
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ id: editingInv.id, data: { ...editingInv, status: statusVal } });
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      draft: { label: "مسودة", color: "bg-slate-100 text-slate-800" },
      issued: { label: "مصدرة", color: "bg-blue-100 text-blue-800" },
      paid: { label: "مدفوعة", color: "bg-green-100 text-green-800" },
      cancelled: { label: "ملغاة", color: "bg-red-100 text-red-800" }
    };
    const s = map[status] || map.draft;
    return <Badge className={`${s.color} hover:${s.color} border-none px-3 py-1`}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">المبيعات والفواتير</h1>
      </div>
      
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-bold">سجل الفواتير</h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> إصدار فاتورة</Button></DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>إصدار فاتورة جديدة</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm">الطلب المرتبط *</label>
                  <Select value={formData.orderId.toString()} onValueChange={v => {
                    const order = orders?.find(o => o.id === parseInt(v));
                    setFormData({...formData, orderId: parseInt(v), total: order?.totalAmount || 0})
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر الطلب" /></SelectTrigger>
                    <SelectContent>
                      {orders?.filter(o => o.status !== 'cancelled').map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>طلب #{o.id} - {o.customerName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-sm">رقم الفاتورة</label><Input required value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-sm">الإجمالي</label><Input type="number" step="0.01" required value={formData.total} onChange={e => setFormData({...formData, total: parseFloat(e.target.value)})} /></div>
                <div className="space-y-2"><label className="text-sm">تاريخ الإصدار</label><Input type="date" required value={formData.issuedAt} onChange={e => setFormData({...formData, issuedAt: e.target.value})} /></div>
                <Button type="submit" disabled={createMut.isPending} className="w-full">إنشاء الفاتورة</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">العميل (الطلب)</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">جاري التحميل...</TableCell></TableRow> : 
               invoices?.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-bold text-primary">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{inv.customerName}</div>
                    <div className="text-xs text-muted-foreground">طلب #{inv.orderId}</div>
                  </TableCell>
                  <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                  <TableCell className="font-bold text-lg">{formatCurrency(inv.total)}</TableCell>
                  <TableCell>{getStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {setEditingInv(inv); setStatusVal(inv.status); setEditOpen(true);}}>تغيير الحالة</Button>
                      <Button variant="ghost" size="icon" onClick={() => window.print()}><Printer className="w-4 h-4 text-slate-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm("حذف؟") && deleteMut.mutate({ id: inv.id })}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>حالة الفاتورة {editingInv?.invoiceNumber}</DialogTitle></DialogHeader>
            <form onSubmit={handleStatusUpdate} className="space-y-4 pt-4">
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="issued">مصدرة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={updateMut.isPending} className="w-full">تحديث</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
