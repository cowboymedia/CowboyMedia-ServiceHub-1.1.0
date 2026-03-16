import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

declare global {
  interface Navigator {
    setAppBadge(count?: number): Promise<void>;
    clearAppBadge(): Promise<void>;
  }
}

function syncAppBadge(count: number) {
  if (!("setAppBadge" in navigator)) return;
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {});
  } else {
    navigator.clearAppBadge().catch(() => {});
  }
}

export function useAppBadge() {
  const { user } = useAuth();

  const { data: ticketNotifData } = useQuery<{ count: number }>({
    queryKey: ["/api/ticket-notifications/unread-count"],
    refetchInterval: 15000,
    enabled: !!user,
  });

  const { data: messageData } = useQuery<{ count: number }>({
    queryKey: ["/api/private-messages/unread-count"],
    refetchInterval: 15000,
    enabled: !!user,
  });

  const { data: reportNotifData } = useQuery<{ count: number }>({
    queryKey: ["/api/report-notifications/unread-count"],
    refetchInterval: 15000,
    enabled: !!user,
  });

  const { data: contentNotifData } = useQuery<Record<string, number>>({
    queryKey: ["/api/content-notifications/counts"],
    refetchInterval: 15000,
    enabled: !!user,
  });

  const unreadTicketCount = ticketNotifData?.count ?? 0;
  const unreadMessageCount = messageData?.count ?? 0;
  const unreadReportCount = reportNotifData?.count ?? 0;
  const contentCounts = contentNotifData ?? {};

  const totalBadge = unreadTicketCount + unreadMessageCount + unreadReportCount +
    Object.values(contentCounts).reduce((sum, c) => sum + c, 0);

  useEffect(() => {
    if (!user) return;

    syncAppBadge(totalBadge);

    const onVisChange = () => {
      if (document.visibilityState === "visible") {
        navigator.clearAppBadge?.().catch(() => {});
        syncAppBadge(totalBadge);
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [user, totalBadge]);
}
