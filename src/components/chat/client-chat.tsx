import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Bell, BellOff, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { chatClientMessages, chatClientSend, chatClientState, chatClientTyping, type ChatMessage } from "@/lib/chat.functions";
import { getSessionId } from "@/lib/session-id";
import { readClientEmail } from "@/lib/admin-redirect";
import { Bubble } from "./admin-chat-dock";
import { chatBeep, fileToPending, fmtSize, setSoundPref, soundPref, type PendingFile } from "./chat-utils";

const SOUND_KEY = "sham_chat_client_sound";

function identity() {
  return { sessionId: getSessionId(), email: readClientEmail() };
}

/** زر عائم للعميل يظهر فقط عند وجود دردشة، مع شارة الرسائل غير المقروءة. */
export function ClientChatBubble() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const stateFn = useServerFn(chatClientState);
  const [unread, setUnread] = useState(0);
  const [has, setHas] = useState(false);
  const last = useRef<number | null>(null);
  const hidden = pathname === "/Y2hhdA" || pathname.startsWith("/ZGFzaGJvYXJk") || pathname.startsWith("/admin");

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await stateFn({ data: identity() });
        if (!alive) return;
        setHas(r.enabled && r.hasThread);
        setUnread(r.unread);
        if (last.current !== null && r.unread > last.current && soundPref(SOUND_KEY)) chatBeep();
        last.current = r.unread;
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [hidden, stateFn]);

  if (hidden || !has) return null;
  return (
    <Link
      to="/Y2hhdA"
      aria-label="فتح الدردشة مع الدعم"
      className="fixed z-50 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105"
      style={{ right: "max(1rem, env(safe-area-inset-right))", bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <MessageCircle className="size-6" />
      {unread > 0 ? (
        <span className="absolute -top-1 -left-1 grid min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-6 text-destructive-foreground animate-pulse">
          {unread}
        </span>
      ) : null}
    </Link>
  );
}

/** محتوى صفحة الدردشة لدى العميل. */
export function ClientChatPanel() {
  const msgsFn = useServerFn(chatClientMessages);
  const sendFn = useServerFn(chatClientSend);
  const typingFn = useServerFn(chatClientTyping);
  const [state, setState] = useState<{ loaded: boolean; enabled: boolean; threadId: string | null; closed: boolean; adminTyping: boolean }>({
    loaded: false, enabled: true, threadId: null, closed: false, adminTyping: false,
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastCount = useRef(-1);
  const lastTyping = useRef(0);

  useEffect(() => setSound(soundPref(SOUND_KEY)), []);

  const load = useCallback(async () => {
    try {
      const r = await msgsFn({ data: identity() });
      if (!r.enabled) {
        setState((s) => ({ ...s, loaded: true, enabled: false }));
        return;
      }
      setState({ loaded: true, enabled: true, threadId: r.thread?.id ?? null, closed: r.thread?.closed ?? false, adminTyping: r.adminTyping });
      setMessages(r.messages as ChatMessage[]);
    } catch {
      /* ignore */
    }
  }, [msgsFn]);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 1000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (messages.length > lastCount.current) {
      const incoming = lastCount.current >= 0 && messages[messages.length - 1]?.sender_role === "supervisor";
      if (incoming && soundPref(SOUND_KEY)) chatBeep();
      endRef.current?.scrollIntoView({ behavior: lastCount.current < 0 ? "auto" : "smooth", block: "end" });
    }
    lastCount.current = messages.length;
  }, [messages]);

  const send = async () => {
    if (sending || (!text.trim() && files.length === 0)) return;
    setSending(true);
    setError(null);
    try {
      await sendFn({ data: { ...identity(), content: text, files } });
      setText("");
      setFiles([]);
      await load();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `تعذّر الإرسال: ${e.message}. تحقق من الاتصال وأعد الإرسال.`
          : "تعذّر إرسال الرسالة. تحقق من اتصالك بالإنترنت ثم اضغط الإرسال مرة أخرى.",
      );
    } finally {
      setSending(false);
    }
  };

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      void typingFn({ data: identity() }).catch(() => {});
    }
  };

  const pick = async (list: FileList | null) => {
    if (!list) return;
    try {
      const next = await Promise.all(Array.from(list).slice(0, 5).map(fileToPending));
      setFiles((f) => [...f, ...next].slice(0, 5));
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? `تعذّر إرفاق الملف: ${e.message}`
          : "تعذّر قراءة الملف. تأكد أنه صورة أو PDF أقل من 5 ميجابايت.",
      );
    }
  };

  if (state.loaded && (!state.enabled || !state.threadId)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <MessageCircle className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">لا توجد محادثة مفتوحة حاليًا.</p>
        <Link to="/" className="mt-2 inline-flex min-h-11 items-center px-3 text-sm font-bold text-primary">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="flex h-[min(72vh,640px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <MessageCircle className="size-5" />
          <span className="absolute bottom-0 left-0 size-2.5 rounded-full bg-success ring-2 ring-card" />
        </span>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-sm font-bold text-foreground">فريق دعم شام كاش</p>
          <p className="text-[11px] text-muted-foreground">{state.adminTyping ? "يكتب الآن…" : "محادثة خاصة وآمنة"}</p>
        </div>
        <button
          type="button"
          onClick={() => { setSound(!sound); setSoundPref(SOUND_KEY, !sound); }}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="الإشعار الصوتي"
        >
          {sound ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-background/60 px-3 py-3 text-right">
        {!state.loaded ? <p className="py-10 text-center text-xs text-muted-foreground">جارٍ التحميل…</p> : null}
        {state.loaded && messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">سيتواصل معك أحد أعضاء الفريق هنا خلال لحظات.</p>
        ) : null}
        {messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender_role === "client"} />)}
        {state.adminTyping ? <p className="text-[11px] font-bold text-muted-foreground">فريق الدعم يكتب الآن…</p> : null}
        <div ref={endRef} />
      </div>

      {state.closed ? (
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">تم إغلاق هذه المحادثة.</div>
      ) : (
        <div className="border-t border-border p-2">
          {error ? (
            <div role="alert" aria-live="polite" className="mb-2 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/25">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span className="leading-5">{error}</span>
            </div>
          ) : null}
          {files.length ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {files.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground">
                  {f.name} · {fmtSize(f.size)}
                  <button type="button" aria-label="إزالة" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="إرفاق ملف">
              <Paperclip className="size-5" />
            </button>
            <input ref={fileRef} type="file" multiple hidden accept="image/*,application/pdf" onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
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
              placeholder="اكتب رسالتك…"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || (!text.trim() && files.length === 0)}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="إرسال"
            >
              <Send className="size-5 -scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
