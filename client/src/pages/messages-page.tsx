import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Mail, MailOpen, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { PrivateMessage } from "@shared/schema";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedMessage, setSelectedMessage] = useState<PrivateMessage | null>(null);

  const { data: messages, isLoading } = useQuery<PrivateMessage[]>({
    queryKey: ["/api/private-messages"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/private-messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/private-messages/unread-count"] });
    },
  });

  const openMessage = (msg: PrivateMessage) => {
    setSelectedMessage(msg);
    if (!msg.readAt) {
      markReadMutation.mutate(msg.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-messages-title">Message Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Private messages from the support team</p>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => { if (!open) setSelectedMessage(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-view-message">
          <DialogHeader>
            <DialogTitle data-testid="text-message-dialog-subject">{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {selectedMessage?.createdAt && format(new Date(selectedMessage.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
            <div className="text-sm whitespace-pre-wrap" data-testid="text-message-dialog-body">{selectedMessage?.body}</div>
          </div>
          <Button className="w-full mt-2" onClick={() => setSelectedMessage(null)} data-testid="button-close-message">Close</Button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !messages || messages.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Mail className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No messages yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={`cursor-pointer hover-elevate transition-colors ${!msg.readAt ? "border-primary/40 bg-primary/5" : ""}`}
              onClick={() => openMessage(msg)}
              data-testid={`card-message-${msg.id}`}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {msg.readAt ? <MailOpen className="w-4 h-4 text-muted-foreground" /> : <Mail className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${!msg.readAt ? "text-foreground" : "text-muted-foreground"}`} data-testid={`text-message-subject-${msg.id}`}>
                      {msg.subject}
                    </p>
                    {!msg.readAt && <Badge variant="default" className="text-xs flex-shrink-0">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{msg.body}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(msg.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
