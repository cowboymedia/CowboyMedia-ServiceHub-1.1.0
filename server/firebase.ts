import admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return firebaseApp;
  } catch (err) {
    console.error("Firebase initialization error:", err);
    return null;
  }
}

interface FCMNotification {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendFCMToUser(fcmToken: string, notification: FCMNotification): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...notification.data,
        ...(notification.url ? { url: notification.url } : {}),
      },
      android: {
        priority: "high",
        notification: {
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          channelId: "servicehub_notifications",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };
    await admin.messaging(app).send(message);
  } catch (err: any) {
    if (err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token") {
      console.log("FCM token expired or invalid:", fcmToken.substring(0, 20) + "...");
    } else {
      console.error("FCM notification error:", err);
    }
  }
}

export async function sendFCMToMultiple(fcmTokens: string[], notification: FCMNotification): Promise<void> {
  const app = getFirebaseApp();
  if (!app || fcmTokens.length === 0) return;
  try {
    const messages: admin.messaging.Message[] = fcmTokens.map(token => ({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...notification.data,
        ...(notification.url ? { url: notification.url } : {}),
      },
      android: {
        priority: "high" as const,
        notification: {
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
          channelId: "servicehub_notifications",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    }));
    await admin.messaging(app).sendEach(messages);
  } catch (err) {
    console.error("FCM batch notification error:", err);
  }
}

export function isFirebaseConfigured(): boolean {
  return !!getFirebaseApp();
}
