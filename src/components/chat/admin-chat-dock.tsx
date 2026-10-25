import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Archive, Bell, BellOff, Download, Lock, Maximize2, MessageCircle, MessagesSquare, Minimize2,
  Paperclip, RotateCcw, Search, Send, Trash2, X, Zap,
} from "lucide-react";
import {
  chatAdminList, chatAdminMessages, chatAdminOpen, chatAdminSend, chatAdminSetEnabled, chatAdminSetState,
  chatAdminTyping, type ChatMessage, type ChatThread,
} from "@/lib/chat.functions";
import { openAdminChat, setChatState, useChatState, type ChatCustomerRef } from "./admin-chat-store";
import { chatBeep, exportChatPdf, fileToPending, fmtSize, fmtTime, setSoundPref, soundPref, type PendingFile } from "./chat-utils";

const SOUND_KEY = "sham_chat_admin_sound";
const TEMPLATES = [
  "مرحبًا، معك فريق دعم شام كاش. كيف يمكنني مساعدتك؟",
  "يرجى إرسال صورة واضحة للهوية من الوجهين.",
  "يرجى إرسال صورة سيلفي واضحة مع الهوية.",
  "تم استلام المستندات، طلبك قيد المراجعة الآن.",
  "تم توثيق حسابك بنجاح. شكرًا لك.",
  "هل يمكنك تأكيد رقم الهاتف المسجل في الحساب؟",
];

type ThreadRow = ChatThread & { unread: number };

/** زر «دردشة» — يظهر داخل لوحة التحكم فقط عند تفعيل الميزة. */
export function ChatButton({ customer, compact = false, className = "" }: { customer: ChatCustomerRef; compact?: boolean; className?: string }) {
  const { enabled, unreadByKey } = useChatState();
  if (!enabled) return null;
  const unread = unreadByKey[customer.customerKey.toLowerCase()] ?? 0;
  const go = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openAdminChat(customer);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && go(e)}
      title="فتح دردشة مع العميل"
      className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-primary/30 bg-primary/10 font-bold text-primary transition hover:bg-primary/20 ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${className}`}
    >
      <MessageCircle className={compact ? "size-3" : "size-3.5"} />
      دردشة
      {unread > 0 ? (
        <span className="absolute -top-1.5 -left-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
          {unread}
        </span>
      ) : null}
    </span>
  );
}

/** الطبقة الكاملة: متابعة الإشعارات + قائمة الدردشات + نافذة الدردشة. تُركّب مرة واحدة داخل اللوحة. */
export function AdminChatDock() {
  const listFn = useServerFn(chatAdminList);
  const setEnabledFn = useServerFn(chatAdminSetEnabled);
  const { open, enabled } = useChatState();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lastUnread = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listFn();
      const map: Record<string, number> = {};
      for (const t of res.threads) map[t.customer_key] = (map[t.customer_key] ?? 0) + t.unread;
      setThreads(res.threads);
      setChatState({ enabled: res.enabled, unreadByKey: map });
      const total = res.threads.reduce((s, t) => s + t.unread, 0);
      if (lastUnread.current !== null && total > lastUnread.current) {
        const t = res.threads.find((x) => x.unread > 0);
        toast.message("رسالة جديدة من عميل", { description: t?.customer_name ?? "عميل" });
        if (soundPref(SOUND_KEY)) chatBeep();
      }
      lastUnread.current = total;
      setLoaded(true);
    } catch {
      /* ignore */
    }
  }, [listFn]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  const toggleFeature = async () => {
    const next = !enabled;
    if (!next && !window.confirm("إيقاف ميزة الدردشة بالكامل؟ ستختفي من اللوحة ولدى العملاء.")) return;
    await setEnabledFn({ data: { enabled: next } });
    setChatState({ enabled: next, open: next ? open : null });
    toast.success(next ? "تم تفعيل الدردشة" : "تم إيقاف الدردشة");
    void refresh();
  };

  if (!loaded) return null;

  return (
    <>
      {/* زر الدردشات العائم */}
      <div className="fixed bottom-20 left-4 z-40 flex flex-col items-start gap-2 lg:bottom-5">
        {listOpen ? (
          <div className="w-[min(92vw,340px)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-extrabold text-foreground">دردشاتي</p>
              <button
                type="button"
                onClick={toggleFeature}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                title="مفتاح supervisor_client_chat_enabled"
              >
                {enabled ? "الميزة مفعّلة" : "الميزة متوقفة"}
              </button>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto">
              {!enabled ? (
                <li className="p-4 text-center text-xs text-muted-foreground">الدردشة متوقفة. اضغط الزر أعلاه لتفعيلها.</li>
              ) : threads.length === 0 ? (
                <li className="p-4 text-center text-xs text-muted-foreground">لا توجد دردشات بعد. اضغط «دردشة» ضمن قرارات العميل.</li>
              ) : (
                threads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        openAdminChat({ customerKey: t.customer_key, name: t.customer_name, sessionId: t.session_id, emails: t.emails, requestId: t.request_id });
                        setListOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-right hover:bg-muted"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <MessageCircle className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground">{t.customer_name ?? "عميل"}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t.closed_at ? "مغلقة · " : ""}{fmtTime(t.last_message_at)}
                        </span>
                      </span>
                      {t.unread > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-5 text-destructive-foreground">{t.unread}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="relative inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
          aria-label="الدردشات"
        >
          <MessagesSquare className="size-5" />
          {totalUnread > 0 ? (
            <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-5 text-destructive-foreground">{totalUnread}</span>
          ) : null}
        </button>
      </div>

      {open && enabled ? <AdminChatWindow key={open.customerKey} customer={open} onChanged={refresh} /> : null}
    </>
  );
}

function AdminChatWindow({ customer, onChanged }: { customer: ChatCustomerRef; onChanged: () => void }) {
  const openFn = useServerFn(chatAdminOpen);
  const msgsFn = useServerFn(chatAdminMessages);
  const sendFn = useServerFn(chatAdminSend);
  const typingFn = useServerFn(chatAdminTyping);
  const stateFn = useServerFn(chatAdminSetState);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [request, setRequest] = useState<{ reference: string; status: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [max, setMax] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [showTpl, setShowTpl] = useState(false);
  const [sound, setSound] = useState(() => soundPref(SOUND_KEY));
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);
  const lastCount = useRef(0);

  const close = () => setChatState({ open: null });

  useEffect(() => {
    let alive = true;
    openFn({ data: { ...customer, redirect: true } })
      .then((t) => {
        if (!alive) return;
        setThreadId(t.id);
        toast.success("تم فتح الدردشة وتوجيه العميل إليها");
        onChanged();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "تعذّر فتح الدردشة"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await msgsFn({ data: { threadId } });
      setThread(res.thread);
      setRequest(res.request);
      setMessages(res.messages as ChatMessage[]);
    } catch {
      /* ignore */
    }
  }, [threadId, msgsFn]);

  useEffect(() => {
    if (!threadId) return;
    void load();
    const id = window.setInterval(load, 1000);
    return () => window.clearInterval(id);
  }, [threadId, load]);

  useEffect(() => {
    if (messages.length > lastCount.current) {
      endRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
    }
    lastCount.current = messages.length;
  }, [messages.length]);

  const clientTyping = !!thread?.client_typing_at && Date.now() - new Date(thread.client_typing_at).getTime() < 4000;
  const closed = !!thread?.closed_at;

  const shown = useMemo(() => {
    const q = search?.trim().toLowerCase();
    return q ? messages.filter((m) => m.content.toLowerCase().includes(q)) : messages;
  }, [messages, search]);

  const onType = (v: string) => {
    setText(v);
    if (threadId && Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      void typingFn({ data: { threadId } }).catch(() => {});
    }
  };

  const send = async () => {
    if (!threadId || sending) return;
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      await sendFn({ data: { threadId, content: text, files } });
      setText("");
      setFiles([]);
      await load();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الإرسال");
    } finally {
      setSending(false);
    }
  };

  const act = async (action: "close" | "reopen" | "delete") => {
    if (!threadId) return;
    if (action === "delete" && !window.confirm("حذف الدردشة؟ ستختفي من القائمة ولدى العميل.")) return;
    if (action === "close" && !window.confirm("إغلاق الدردشة؟ لن يتمكن العميل من الرد.")) return;
    await stateFn({ data: { threadId, action } });
    onChanged();
    if (action === "delete") close();
    else void load();
  };

  const pick = async (list: FileList | null) => {
    if (!list) return;
    try {
      const next = await Promise.all(Array.from(list).slice(0, 5).map(fileToPending));
      setFiles((f) => [...f, ...next].slice(0, 5));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر قراءة الملف");
    }
  };

  const iconBtn = "grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground";

  return (
    <div
      dir="rtl"
      className={`fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl ${
        max ? "inset-0 rounded-none" : "inset-x-2 bottom-2 top-16 rounded-2xl sm:inset-x-auto sm:left-4 sm:top-auto sm:h-[620px] sm:max-h-[calc(100vh-2rem)] sm:w-[400px]"
      }`}
    >
      {/* الرأس */}
      <div className="border-b border-border bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-foreground">{customer.name ?? "عميل"}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {request ? `الطلب ${request.reference}` : "بدون طلب مرتبط"}
              {closed ? " · مغلقة" : ""}
            </p>
          </div>
          <button type="button" className={iconBtn} onClick={() => setMax((v) => !v)} title={max ? "تصغير" : "تكبير لصفحة كاملة"}>
            {max ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          <button type="button" className={iconBtn} onClick={close} title="إغلاق النافذة">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button type="button" className={iconBtn} onClick={() => setSearch((s) => (s === null ? "" : null))} title="بحث داخل المحادثة"><Search className="size-4" /></button>
          <button type="button" className={iconBtn} onClick={() => exportChatPdf(`دردشة مع ${customer.name ?? "العميل"}`, messages)} title="تصدير PDF"><Download className="size-4" /></button>
          <button type="button" className={iconBtn} onClick={() => { setSound(!sound); setSoundPref(SOUND_KEY, !sound); }} title="الإشعار الصوتي">
            {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </button>
          <span className="flex-1" />
          {closed ? (
            <button type="button" onClick={() => act("reopen")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"><RotateCcw className="size-3.5" /> إعادة فتح</button>
          ) : (
            <button type="button" onClick={() => act("close")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-warning hover:bg-warning/10"><Lock className="size-3.5" /> إغلاق الدردشة</button>
          )}
          <button type="button" onClick={() => act("delete")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /> حذف</button>
        </div>
        {search !== null ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الرسائل…"
            className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        ) : null}
      </div>

      {/* الرسائل */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-background px-3 py-3">
        {!threadId ? <p className="py-10 text-center text-xs text-muted-foreground">جارٍ فتح الدردشة…</p> : null}
        {threadId && shown.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">{search ? "لا نتائج" : "ابدأ المحادثة — تم توجيه العميل لصفحة الدردشة."}</p>
        ) : null}
        {shown.map((m) => <Bubble key={m.id} m={m} mine={m.sender_role === "supervisor"} />)}
        {clientTyping ? <p className="text-[11px] font-bold text-muted-foreground">العميل يكتب الآن…</p> : null}
        <div ref={endRef} />
      </div>

      {/* الكتابة */}
      {closed ? (
        <div className="flex items-center justify-center gap-2 border-t border-border p-3 text-xs text-muted-foreground"><Archive className="size-4" /> الدردشة مغلقة</div>
      ) : (
        <div className="border-t border-border bg-card p-2">
          {files.length ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                  {f.name} · {fmtSize(f.size)}
                  <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button>
                </span>
              ))}
            </div>
          ) : null}
          {showTpl ? (
            <div className="mb-2 max-h-40 overflow-y-auto rounded-xl border border-border">
              {TEMPLATES.map((t) => (
                <button key={t} type="button" onClick={() => { setText(t); setShowTpl(false); }} className="block w-full border-b border-border/60 px-3 py-2 text-right text-xs text-foreground hover:bg-muted">
                  {t}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-1.5">
            <button type="button" className={iconBtn} onClick={() => setShowTpl((v) => !v)} title="ردود جاهزة"><Zap className="size-4" /></button>
            <button type="button" className={iconBtn} onClick={() => fileRef.current?.click()} title="إرفاق ملف"><Paperclip className="size-4" /></button>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
            <textarea
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="اكتب رسالة…"
              className="max-h-32 min-h-9 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!text.trim() && files.length === 0)}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="إرسال"
            >
              <Send className="size-4 -scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  if (m.sender_role === "system") {
    return <p className="py-1 text-center text-[11px] font-bold text-muted-foreground">{m.content} · {fmtTime(m.created_at)}</p>;
  }
  return (
    <div className={`flex ${mine ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-card-foreground"}`}>
        {m.content ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : null}
        {m.attachments?.map((a) => (
          <a key={a.path} href={a.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs underline underline-offset-2">
            {a.type?.startsWith("image/") && a.url ? (
              <img src={a.url} alt={a.name} loading="lazy" decoding="async" className="mt-1 max-h-48 rounded-lg" />
            ) : (
              <><Paperclip className="size-3" /> {a.name}</>
            )}
          </a>
        ))}
        <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {fmtTime(m.created_at)}
          {mine ? (m.read_at ? " · ✓✓ تمت القراءة" : " · ✓ أُرسلت") : ""}
        </p>
      </div>
    </div>
  );
}
