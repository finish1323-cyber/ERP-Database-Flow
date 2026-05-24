import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { CheckSquare, Plus, Trash2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuthToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL;

function authHeaders() {
  const token = getAuthToken();
  return { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}api${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: number | null;
  assigneeName: string | null;
  dueDate: string | null;
  createdAt: string;
}

interface Employee { id: number; name: string; role: string; }

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLS: { key: Task["status"]; labelKey: string }[] = [
  { key: "todo", labelKey: "tasks.todo" },
  { key: "in_progress", labelKey: "tasks.in_progress" },
  { key: "done", labelKey: "tasks.done" },
];

function isOverdue(task: Task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export function Tasks() {
  const { t } = useTranslation();
  const authState = useAuthState();
  const role = authState.status === "authenticated" ? authState.info.role : "sales";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" });
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const data = await apiFetch<Task[]>("/tasks").catch(() => []);
    setTasks(data);
    setLoading(false);
  }, []);

  const loadEmployees = useCallback(async () => {
    const data = await apiFetch<Employee[]>("/employees/directory").catch(() => []);
    setEmployees(data);
  }, []);

  useEffect(() => { void loadTasks(); void loadEmployees(); }, [loadTasks, loadEmployees]);

  const openAdd = () => {
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assignedTo: "", dueDate: "" });
    setShowDialog(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      assignedTo: task.assignedTo?.toString() ?? "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setShowDialog(true);
  };

  const saveTask = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      assignedTo: form.assignedTo ? parseInt(form.assignedTo) : undefined,
      dueDate: form.dueDate || undefined,
    };
    if (editTask) {
      await apiFetch(`/tasks/${editTask.id}`, { method: "PUT", body: JSON.stringify(payload) }).catch(() => {});
    } else {
      await apiFetch("/tasks", { method: "POST", body: JSON.stringify({ ...payload, status: "todo" }) }).catch(() => {});
    }
    setShowDialog(false);
    void loadTasks();
  };

  const moveTask = async (task: Task, status: Task["status"]) => {
    await apiFetch(`/tasks/${task.id}`, { method: "PUT", body: JSON.stringify({ status }) }).catch(() => {});
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
  };

  const deleteTask = async (id: number) => {
    await fetch(`${BASE}api/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = tasks.filter((t) => {
    if (filterEmployee !== "all" && t.assignedTo?.toString() !== filterEmployee) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const byStatus = (status: Task["status"]) => filtered.filter((t) => t.status === status);

  const colBg: Record<Task["status"], string> = {
    todo: "bg-slate-50",
    in_progress: "bg-blue-50/60",
    done: "bg-green-50/60",
  };
  const colBorder: Record<Task["status"], string> = {
    todo: "border-slate-200",
    in_progress: "border-blue-200",
    done: "border-green-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><CheckSquare className="w-6 h-6 text-primary" /></div>
          <h1 className="text-2xl font-bold text-foreground">{t("tasks.title")}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder={t("tasks.all_employees")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tasks.all_employees")}</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder={t("tasks.all_priorities")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tasks.all_priorities")}</SelectItem>
              <SelectItem value="low">{t("tasks.priority_low")}</SelectItem>
              <SelectItem value="medium">{t("tasks.priority_medium")}</SelectItem>
              <SelectItem value="high">{t("tasks.priority_high")}</SelectItem>
              <SelectItem value="urgent">{t("tasks.priority_urgent")}</SelectItem>
            </SelectContent>
          </Select>
          {(role === "admin" || role === "purchasing") && (
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {t("tasks.add_task")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLS.map(({ key, labelKey }) => (
            <div key={key} className={`rounded-2xl border ${colBg[key]} ${colBorder[key]} p-4 min-h-[24rem]`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">{t(labelKey)}</h2>
                <span className="text-xs bg-background border border-border px-2 py-0.5 rounded-full text-muted-foreground">{byStatus(key).length}</span>
              </div>
              <div className="space-y-3">
                {byStatus(key).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{t("tasks.no_tasks")}</p>
                ) : (
                  byStatus(key).map((task) => (
                    <div key={task.id} className="bg-card border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-foreground leading-snug">{task.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                          {t(`tasks.priority_${task.priority}`)}
                        </span>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {task.assigneeName && (
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{task.assigneeName}</span>
                          )}
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue(task) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {isOverdue(task) ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {key !== "todo" && <Button size="icon" variant="ghost" className="w-6 h-6" title="رجّع" onClick={() => void moveTask(task, key === "done" ? "in_progress" : "todo")}>←</Button>}
                          {key !== "done" && <Button size="icon" variant="ghost" className="w-6 h-6" title="تقدّم" onClick={() => void moveTask(task, key === "todo" ? "in_progress" : "done")}>→</Button>}
                          {(role === "admin" || role === "purchasing") && (
                            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => openEdit(task)}><span className="text-xs">✎</span></Button>
                          )}
                          {role === "admin" && (
                            <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive hover:text-destructive" onClick={() => void deleteTask(task.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTask ? t("tasks.edit") : t("tasks.add_task")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>{t("tasks.task_title")}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>{t("tasks.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("tasks.priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t("tasks.priority_low")}</SelectItem>
                    <SelectItem value="medium">{t("tasks.priority_medium")}</SelectItem>
                    <SelectItem value="high">{t("tasks.priority_high")}</SelectItem>
                    <SelectItem value="urgent">{t("tasks.priority_urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("tasks.due_date")}</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("tasks.assign_to")}</Label>
              <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                <SelectTrigger><SelectValue placeholder="اختر موظف..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={() => void saveTask()} disabled={!form.title.trim()}>{t("common.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
