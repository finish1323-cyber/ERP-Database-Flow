import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Send, Hash, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAuthToken } from "@/lib/auth";
import { useAuthState } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL;

function authHeaders() {
  const token = getAuthToken();
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}api${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Channel { id: number; name: string; description: string | null; createdAt: string; }
interface Employee { id: number; name: string; role: string; }
interface Message { id: number; senderId: number | null; senderName: string | null; body: string; createdAt: string; isRead: boolean; }

type Conversation =
  | { type: "channel"; id: number; name: string }
  | { type: "dm"; employeeId: number; name: string };

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function Chat() {
  const { t } = useTranslation();
  const authState = useAuthState();
  const myId = authState.status === "authenticated" ? authState.info.employeeId : null;
  const myRole = authState.status === "authenticated" ? authState.info.role : "sales";

  const [channels, setChannels] = useState<Channel[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isChannelActive = (id: number) => conv !== null && conv.type === "channel" && conv.id === id;
  const isDmActive = (empId: number) => conv !== null && conv.type === "dm" && conv.employeeId === empId;

  const loadChannels = useCallback(async () => {
    const data = await apiFetch<Channel[]>("/chat/channels").catch(() => []);
    setChannels(data);
  }, []);

  const loadEmployees = useCallback(async () => {
    const data = await apiFetch<Employee[]>("/employees/directory").catch((): Employee[] => []);
    setEmployees(data.filter((e) => e.id !== myId));
  }, [myId]);

  const loadMessages = useCallback(async () => {
    if (!conv) return;
    let data: Message[] = [];
    if (conv.type === "channel") {
      data = await apiFetch<Message[]>(`/chat/channels/${conv.id}/messages`).catch(() => []);
    } else {
      data = await apiFetch<Message[]>(`/chat/dm/${conv.employeeId}`).catch(() => []);
    }
    setMessages(data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [conv]);

  useEffect(() => { void loadChannels(); void loadEmployees(); }, [loadChannels, loadEmployees]);

  useEffect(() => {
    void loadMessages();
    if (pollRef.current) clearInterval(pollRef.current);
    if (conv) {
      pollRef.current = setInterval(() => { void loadMessages(); }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conv, loadMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !conv) return;
    const body = input.trim();
    setInput("");
    if (conv.type === "channel") {
      await apiFetch(`/chat/channels/${conv.id}/messages`, { method: "POST", body: JSON.stringify({ body }) }).catch(() => {});
    } else {
      await apiFetch(`/chat/dm/${conv.employeeId}`, { method: "POST", body: JSON.stringify({ body }) }).catch(() => {});
    }
    void loadMessages();
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    await apiFetch("/chat/channels", { method: "POST", body: JSON.stringify({ name: newChannelName.trim(), description: newChannelDesc.trim() || undefined }) }).catch(() => {});
    setNewChannelName(""); setNewChannelDesc(""); setShowNewChannel(false);
    void loadChannels();
  };

  const Sidebar = () => (
    <div className="w-64 flex-shrink-0 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("chat.channels")}</span>
          {myRole === "admin" && (
            <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setShowNewChannel(true)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="space-y-0.5 mt-2">
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setConv({ type: "channel", id: ch.id, name: ch.name })}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
                isChannelActive(ch.id) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Hash className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("chat.direct_messages")}</span>
        <div className="space-y-0.5 mt-2">
          {employees.map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setConv({ type: "dm", employeeId: emp.id, name: emp.name })}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
                isDmActive(emp.id) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{emp.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {conv ? (
          <>
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              {conv.type === "channel" ? <Hash className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-primary" />}
              <span className="font-semibold text-foreground">{conv.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t("chat.no_messages")}</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === myId;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                        {(msg.senderName ?? "؟").slice(0, 1)}
                      </div>
                      <div className={`max-w-xs lg:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {!isMe && <span className="text-xs text-muted-foreground px-1">{msg.senderName}</span>}
                        <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tl-sm" : "bg-secondary text-foreground rounded-tr-sm"}`}>
                          {msg.body}
                        </div>
                        <span className="text-xs text-muted-foreground px-1">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                  placeholder={t("chat.type_message")}
                  className="flex-1 rounded-xl"
                />
                <Button onClick={() => void sendMessage()} disabled={!input.trim()} size="icon" className="rounded-xl">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="w-14 h-14 opacity-20" />
            <p>{t("chat.select_conversation")}</p>
          </div>
        )}
      </div>

      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("chat.new_channel")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>{t("chat.channel_name")}</Label>
              <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>{t("chat.channel_description")}</Label>
              <Input value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewChannel(false)}>{t("common.cancel")}</Button>
              <Button onClick={() => void createChannel()} disabled={!newChannelName.trim()}>{t("chat.create")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
