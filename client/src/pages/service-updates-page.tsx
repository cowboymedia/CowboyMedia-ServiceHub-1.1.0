import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Bell, Clock } from "lucide-react";
import type { ServiceUpdate, Service } from "@shared/schema";

export default function ServiceUpdatesPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    apiRequest("POST", "/api/content-notifications/mark-read", { category: "service-updates" })
      .then(() => queryClient.invalidateQueries({ queryKey: ["/api/content-notifications/counts"] }))
      .catch(() => {});
  }, []);

  const { data: updates, isLoading } = useQuery<ServiceUpdate[]>({
    queryKey: ["/api/service-updates"],
    enabled: !!user,
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/service-updates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-updates"] });
      toast({ title: "Service update deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getServiceName = (serviceId: string) => {
    return services?.find(s => s.id === serviceId)?.name || "Unknown Service";
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" data-testid="text-service-updates-title">Service Updates</h1>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-service-updates-title">Service Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">Latest service updates</p>
      </div>

      {!updates || updates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-updates">No service updates yet</p>
          </CardContent>
        </Card>
      ) : (
        updates.map((update) => (
          <Card key={update.id} data-testid={`card-service-update-${update.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg" data-testid={`text-update-title-${update.id}`}>{update.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" data-testid={`badge-service-${update.id}`}>{getServiceName(update.serviceId)}</Badge>
                    <span className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      {formatDate(update.createdAt)}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(update.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-update-${update.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" data-testid={`text-update-desc-${update.id}`}>{update.description}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
