import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListInventory, useCreateInventoryEntry, useUpdateInventoryEntry, useDeleteInventoryEntry, getListInventoryQueryKey,
  useListStockMovements, useCreateStockMovement, useDeleteStockMovement, getListStockMovementsQueryKey,
  useListItems
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export function Warehouse() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">المخزن والخدمات اللوجستية</h1>
      </div>
      
      <Tabs defaultValue="inventory" className="w-full" dir="rtl">
        <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="inventory" className="rounded-lg">حالة المخزون</TabsTrigger>
          <TabsTrigger value="movements" className="rounded-lg">حركات المخزن</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory"><InventoryTab /></TabsContent>
        <TabsContent value="movements"><MovementsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function InventoryTab() {
  const { data: inventory, isLoading } = useListInventory();
  const { data: items } = useListItems();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMut = useCreateInventoryEntry({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() }); toast({title: "تمت الإضافة"}); setAddOpen(false); } } });
  const deleteMut = useDeleteInventoryEntry({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() }); toast({title: "تم الحذف"}); } } });

  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ itemId: 0, quantityAvailable: 0, safetyLevel: 0, location: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.itemId) return;
    createMut.mutate({ data: formData });
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">الأرصدة الحالية</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> تعريف رصيد صنف</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة رصيد مخزون</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm">الصنف *</label>
                <Select value={formData.itemId.toString()} onValueChange={v => setFormData({...formData, itemId: parseInt(v)})}>
                  <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                  <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm">الكمية الحالية *</label><Input type="number" required value={formData.quantityAvailable} onChange={e => setFormData({...formData, quantityAvailable: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><label className="text-sm">حد الأمان *</label><Input type="number" required value={formData.safetyLevel} onChange={e => setFormData({...formData, safetyLevel: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><label className="text-sm">الموقع / الرف</label><Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
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
              <TableHead className="text-right">الكمية</TableHead>
              <TableHead className="text-right">حد الأمان</TableHead>
              <TableHead className="text-right">الموقع</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow> : 
             inventory?.map(inv => (
              <TableRow key={inv.id} className={inv.isLowStock ? "bg-red-50/50" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {inv.itemName}
                    {inv.isLowStock && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={inv.isLowStock ? "destructive" : "secondary"} className="text-sm">
                    {inv.quantityAvailable}
                  </Badge>
                </TableCell>
                <TableCell>{inv.safetyLevel}</TableCell>
                <TableCell>{inv.location || "-"}</TableCell>
                <TableCell className="text-left">
                    <Button variant="ghost" size="icon" onClick={() => confirm("حذف؟") && deleteMut.mutate({ id: inv.id })}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MovementsTab() {
  const { data: movements, isLoading } = useListStockMovements();
  const { data: items } = useListItems();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMut = useCreateStockMovement({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() }); toast({title: "تم تسجيل الحركة"}); setAddOpen(false); } } });
  
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState({ itemId: 0, movementType: "in" as "in"|"out", quantity: 1, reference: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.itemId) return;
    createMut.mutate({ data: formData });
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-xl font-bold">سجل الحركات (وارد/صادر)</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button className="rounded-xl"><Plus className="w-4 h-4 ml-2" /> تسجيل حركة</Button></DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>تسجيل حركة مخزنية</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm">الصنف *</label>
                <Select value={formData.itemId.toString()} onValueChange={v => setFormData({...formData, itemId: parseInt(v)})}>
                  <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                  <SelectContent>{items?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">نوع الحركة *</label>
                <Select value={formData.movementType} onValueChange={(v: "in"|"out") => setFormData({...formData, movementType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">وارد (إضافة)</SelectItem>
                    <SelectItem value="out">صادر (سحب)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><label className="text-sm">الكمية *</label><Input type="number" required min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><label className="text-sm">رقم المرجع (فاتورة/إذن)</label><Input value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} /></div>
              <Button type="submit" disabled={createMut.isPending} className="w-full">حفظ الحركة</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">نوع الحركة</TableHead>
              <TableHead className="text-right">الصنف</TableHead>
              <TableHead className="text-right">الكمية</TableHead>
              <TableHead className="text-right">المرجع</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow> : 
             movements?.map(m => (
              <TableRow key={m.id}>
                <TableCell>{formatDate(m.createdAt)}</TableCell>
                <TableCell>
                  {m.movementType === 'in' ? 
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><ArrowDownRight className="w-3 h-3 ml-1"/> وارد</Badge> : 
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><ArrowUpRight className="w-3 h-3 ml-1"/> صادر</Badge>
                  }
                </TableCell>
                <TableCell className="font-medium">{m.itemName}</TableCell>
                <TableCell className="font-bold">{m.quantity}</TableCell>
                <TableCell>{m.reference || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
