import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
        isOnline
          ? "bg-status-online text-white"
          : "bg-status-busy text-white"
      }`}
      data-testid="banner-offline"
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline — showing cached data</span>
        </>
      )}
    </div>
  );
}
