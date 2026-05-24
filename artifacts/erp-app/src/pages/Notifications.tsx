import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL;

function authHeaders() {
  const token = getAuthToken();
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

interface Notification {
  id: number;
  employeeId: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch(`${BASE}api/notifications`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function markRead(id: number) {
  await fetch(`${BASE}api/notifications/${id}/read`, { method: "PUT", headers: authHeaders() });
}

async function markAllRead() {
  await fetch(`${BASE}api/notifications/read-all`, { method: "PUT", headers: authHeaders() });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

export function Notifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchNotifications();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (id: number) => {
    await markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("notifications.title")}</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} غير مقروء</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-2">
            <CheckCheck className="w-4 h-4" />
            {t("notifications.mark_all_read")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Bell className="w-12 h-12 opacity-20" />
          <p>{t("notifications.no_notifications")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors ${
                n.isRead
                  ? "bg-card border-border/50"
                  : "bg-primary/5 border-primary/20"
              }`}
            >
              <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.isRead ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${n.isRead ? "text-foreground" : "text-primary"}`}>
                  {n.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 flex-shrink-0"
                  onClick={() => handleMarkRead(n.id)}
                  title="تعليم كمقروء"
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
