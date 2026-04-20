import { storage } from "./storage";

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  return String(html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function truncate(text: string, max = 800): string {
  const t = text ?? "";
  return t.length > max ? t.substring(0, max) + "..." : t;
}

async function postToTelegram(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = `Telegram API ${res.status}: ${body}`;
      console.error("[Telegram]", err);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[Telegram] send error:", e?.message || e);
    return { ok: false, error: e?.message || "Unknown error" };
  }
}

export async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await storage.getTelegramSettings();
  if (!settings || !settings.enabled) return { ok: false, error: "Telegram notifications disabled" };
  if (!settings.chatId) return { ok: false, error: "No chat ID configured" };
  return postToTelegram(settings.chatId, text);
}

export async function sendTelegramTestMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await storage.getTelegramSettings();
  if (!settings?.chatId) return { ok: false, error: "No chat ID configured" };
  return postToTelegram(settings.chatId, text);
}

export function fireTelegram(text: string): void {
  sendTelegramMessage(text).catch((e) => console.error("[Telegram] fire error:", e));
}

const impactEmoji: Record<string, string> = {
  outage: "🔴",
  degraded: "🟡",
  maintenance: "🛠",
  operational: "🟢",
};

const impactLabels: Record<string, string> = {
  outage: "Outage",
  degraded: "Degraded Performance",
  maintenance: "Maintenance",
  operational: "Operational",
};

const statusLabels: Record<string, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export function composeAlertCreated(opts: {
  serviceName: string;
  impact: string;
  severity?: string;
  title: string;
  description: string;
}): string {
  const emoji = impactEmoji[opts.impact] || "🚨";
  const impactLabel = impactLabels[opts.impact] || opts.impact;
  return [
    `🚨 <b>SERVICE ALERT — ${escapeHtml(opts.serviceName)}</b>`,
    `${emoji} <b>Impact:</b> ${escapeHtml(impactLabel)}`,
    opts.severity ? `<b>Severity:</b> ${escapeHtml(opts.severity)}` : "",
    ``,
    `<b>${escapeHtml(opts.title)}</b>`,
    `<i>${escapeHtml(truncate(opts.description))}</i>`,
  ].filter(Boolean).join("\n");
}

export function composeAlertUpdate(opts: {
  serviceName: string;
  title: string;
  status: string;
  message: string;
  impact?: string | null;
}): string {
  const statusLabel = statusLabels[opts.status] || opts.status;
  const header = opts.status === "resolved"
    ? `✅ <b>SERVICE ALERT RESOLVED — ${escapeHtml(opts.serviceName)}</b>`
    : `🔄 <b>SERVICE ALERT UPDATE — ${escapeHtml(opts.serviceName)}</b>`;
  const lines = [
    header,
    `<b>Status:</b> ${escapeHtml(statusLabel)}`,
  ];
  if (opts.impact && opts.impact !== "no_change" && opts.status !== "resolved") {
    lines.push(`<b>Impact:</b> ${escapeHtml(impactLabels[opts.impact] || opts.impact)}`);
  }
  lines.push("");
  lines.push(`<b>${escapeHtml(opts.title)}</b>`);
  lines.push(`<i>${escapeHtml(truncate(opts.message))}</i>`);
  return lines.join("\n");
}

export function composeAlertResolved(opts: {
  serviceName: string;
  title: string;
  resolveMessage: string;
}): string {
  return [
    `✅ <b>SERVICE ALERT RESOLVED — ${escapeHtml(opts.serviceName)}</b>`,
    ``,
    `<b>${escapeHtml(opts.title)}</b>`,
    `<i>${escapeHtml(truncate(opts.resolveMessage))}</i>`,
  ].join("\n");
}

export function composeServiceUpdate(opts: {
  serviceName: string;
  title: string;
  description: string;
}): string {
  return [
    `📢 <b>SERVICE UPDATE — ${escapeHtml(opts.serviceName)}</b>`,
    ``,
    `<b>${escapeHtml(opts.title)}</b>`,
    `<i>${escapeHtml(truncate(opts.description))}</i>`,
  ].join("\n");
}

export function composeNews(opts: {
  title: string;
  content: string;
}): string {
  const plain = stripHtml(opts.content);
  return [
    `📰 <b>NEWS</b>`,
    ``,
    `<b>${escapeHtml(opts.title)}</b>`,
    `<i>${escapeHtml(truncate(plain, 600))}</i>`,
  ].join("\n");
}
