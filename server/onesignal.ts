const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

interface OneSignalNotification {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendOneSignalToUser(onesignalPlayerId: string, notification: OneSignalNotification): Promise<void> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return;
  }
  try {
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [onesignalPlayerId],
      headings: { en: notification.title },
      contents: { en: notification.body },
    };
    if (notification.url) {
      payload.url = notification.url;
      payload.data = { ...notification.data, url: notification.url };
    }
    if (notification.data) {
      payload.data = { ...payload.data, ...notification.data };
    }
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OneSignal API error:", response.status, errorText);
    }
  } catch (err) {
    console.error("OneSignal notification error:", err);
  }
}

export async function sendOneSignalToMultiple(playerIds: string[], notification: OneSignalNotification): Promise<void> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY || playerIds.length === 0) {
    return;
  }
  try {
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: notification.title },
      contents: { en: notification.body },
    };
    if (notification.url) {
      payload.url = notification.url;
      payload.data = { ...notification.data, url: notification.url };
    }
    if (notification.data) {
      payload.data = { ...payload.data, ...notification.data };
    }
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OneSignal API error:", response.status, errorText);
    }
  } catch (err) {
    console.error("OneSignal notification error:", err);
  }
}

export function isOneSignalConfigured(): boolean {
  return !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);
}
