import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Shield, ChevronDown, Smile, Trash2, Users } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { CommunityMessage } from "@shared/schema";

type ReactionGroup = { emoji: string; userIds: string[] };
type EnrichedMessage = CommunityMessage & { reactions: ReactionGroup[]; isAdmin?: boolean };

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👎"];

function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-0.5" data-testid="bouncing-dots-community">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
          style={{
            animation: "bounce-dot 1.4s infinite ease-in-out both",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function UsernameSetupDialog({ open, onComplete }: { open: boolean; onComplete: (username: string) => void }) {
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const checkAvailability = useCallback(async (name: string) => {
    if (name.length < 2) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/community-chat/username-available?username=${encodeURIComponent(name)}`, { credentials: "include" });
      const data = await res.json();
      if (!data.available) setError("Username already taken");
      else setError("");
    } catch {
      setError("Could not check availability");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.trim().length >= 2) checkAvailability(username.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  const handleSubmit = async () => {
    const cleaned = username.trim();
    if (cleaned.length < 2 || cleaned.length > 20) {
      setError("Username must be 2-20 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleaned)) {
      setError("Only letters, numbers, underscores, and hyphens allowed");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/community-chat/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatUsername: cleaned }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      onComplete(cleaned);
    } catch {
      setError("Failed to save username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle data-testid="text-username-dialog-title">Choose a Chat Username</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pick an anonymous username for the community chat. This is how others will see you.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="chat-username">Username</Label>
            <Input
              id="chat-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="e.g. CoolRider42"
              maxLength={20}
              data-testid="input-chat-username"
            />
            {error && <p className="text-xs text-destructive" data-testid="text-username-error">{error}</p>}
            {checking && <p className="text-xs text-muted-foreground">Checking availability...</p>}
          </div>
          <p className="text-xs text-muted-foreground">2-20 characters. Letters, numbers, underscores, hyphens only.</p>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving || checking || !!error || username.trim().length < 2} data-testid="button-save-username">
            {saving ? "Saving..." : "Start Chatting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-1 left-0 bg-popover border rounded-lg shadow-lg p-1.5 flex gap-1 z-50" data-testid="emoji-picker">
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
          data-testid={`button-emoji-${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionBadges({ reactions, userId, onToggle }: { reactions: ReactionGroup[]; userId: string; onToggle: (emoji: string) => void }) {
  if (reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((r) => {
        const isMine = r.userIds.includes(userId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${isMine ? "bg-primary/15 border-primary/30 text-primary" : "bg-muted border-border hover:bg-muted/80"}`}
            data-testid={`reaction-badge-${r.emoji}`}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] font-medium">{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function CommunityChatPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [chatUsername, setChatUsername] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const isNearBottomRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const prevMessageCountRef = useRef(0);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!user) return;
    const isAdminUser = user.role === "admin" || user.role === "master_admin";
    if (isAdminUser) {
      setChatUsername(user.fullName);
    } else if (user.chatUsername) {
      setChatUsername(user.chatUsername);
    } else {
      setShowUsernameDialog(true);
    }
  }, [user]);

  const { data: messages, isLoading } = useQuery<EnrichedMessage[]>({
    queryKey: ["/api/community-chat/messages"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (disposed) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "community_message") {
            queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
          }
          if (data.type === "community_message_deleted") {
            queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
          }
          if (data.type === "community_reaction") {
            queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
          }
          if (data.type === "community_typing" && data.userId !== user?.id) {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.set(data.userId, data.chatUsername);
              return next;
            });
            const existing = typingTimeoutsRef.current.get(data.userId);
            if (existing) clearTimeout(existing);
            typingTimeoutsRef.current.set(data.userId, setTimeout(() => {
              setTypingUsers((prev) => {
                const next = new Map(prev);
                next.delete(data.userId);
                return next;
              });
            }, 3000));
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!disposed) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      wsRef.current = null;
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, [user?.id]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowNewMessagesPill(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setShowNewMessagesPill(false);
  }, []);

  useEffect(() => {
    const count = messages?.length || 0;
    if (count > prevMessageCountRef.current && prevMessageCountRef.current > 0) {
      if (isNearBottomRef.current) scrollToBottom();
      else setShowNewMessagesPill(true);
    } else if (count > 0 && prevMessageCountRef.current === 0) {
      scrollToBottom("auto");
    }
    prevMessageCountRef.current = count;
  }, [messages, scrollToBottom]);

  const sendTypingEvent = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && chatUsername) {
      ws.send(JSON.stringify({ type: "community_typing", chatUsername }));
    }
  }, [chatUsername]);

  const handleSend = useCallback(async () => {
    const content = message.trim();
    if (!content) return;
    setMessage("");
    try {
      const res = await fetch("/api/community-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Failed to send", description: data.error, variant: "destructive" });
        setMessage(content);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
      if (isNearBottomRef.current) setTimeout(() => scrollToBottom(), 50);
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
      setMessage(content);
    }
    setTimeout(() => {
      const el = messageInputRef.current;
      if (el) { el.style.height = "auto"; el.focus(); }
    }, 0);
  }, [message, scrollToBottom, toast]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/community-chat/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
    } catch {
      toast({ title: "Failed to react", variant: "destructive" });
    }
  }, [toast]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const res = await fetch(`/api/community-chat/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/community-chat/messages"] });
      toast({ title: "Message deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }, [toast]);

  const handleUsernameComplete = useCallback((newUsername: string) => {
    setChatUsername(newUsername);
    setShowUsernameDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
  }, []);

  const typingNames = useMemo(() => Array.from(typingUsers.values()), [typingUsers]);

  const isAdminUser = user?.role === "admin" || user?.role === "master_admin";

  return (
    <div className="flex flex-col h-full" data-testid="community-chat-page">
      <div className="flex items-center gap-2 p-2 sm:p-3 border-b flex-shrink-0">
        <Users className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold" data-testid="text-community-title">Community Chat</h1>
          <p className="text-[10px] text-muted-foreground">
            Chatting as <span className="font-medium">{chatUsername || "..."}</span>
            {isAdminUser && <Shield className="w-3 h-3 inline ml-1 text-primary" />}
          </p>
        </div>
      </div>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-community-messages">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Be the first to say something!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMe = msg.userId === user?.id;
              const msgDate = new Date(msg.createdAt);
              const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
              const showSeparator = !prevDate || formatDateSeparator(msgDate) !== formatDateSeparator(prevDate);
              const msgIsAdmin = msg.isAdmin || false;

              return (
                <div key={msg.id} data-testid={`community-message-${msg.id}`}>
                  {showSeparator && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{formatDateSeparator(msgDate)}</span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 group`}>
                    <div className="relative max-w-[85%] sm:max-w-[70%]">
                      <div className={`rounded-2xl px-3 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {!isMe && (
                          <p className={`text-[10px] font-medium mb-0.5 flex items-center gap-1 ${msgIsAdmin ? "text-primary" : "opacity-70"}`}>
                            {msg.chatUsername}
                            {msgIsAdmin && <Shield className="w-2.5 h-2.5" />}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-community-msg-${msg.id}`}>{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {format(msgDate, "h:mm a")}
                        </p>
                      </div>
                      <ReactionBadges reactions={msg.reactions} userId={user?.id || ""} onToggle={(emoji) => handleReaction(msg.id, emoji)} />
                      <div className={`absolute ${isMe ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-1`}>
                        <div className="relative">
                          <button
                            onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/80 text-muted-foreground"
                            data-testid={`button-react-${msg.id}`}
                          >
                            <Smile className="w-3.5 h-3.5" />
                          </button>
                          {activeEmojiPicker === msg.id && (
                            <EmojiPicker onSelect={(emoji) => handleReaction(msg.id, emoji)} onClose={() => setActiveEmojiPicker(null)} />
                          )}
                        </div>
                        {isAdminUser && !isMe && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-msg-${msg.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showNewMessagesPill && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <Button size="sm" variant="secondary" className="rounded-full shadow-lg text-xs gap-1 px-3" onClick={() => scrollToBottom()} data-testid="button-community-new-messages">
            <ChevronDown className="w-3 h-3" /> New messages
          </Button>
        </div>
      )}

      <div className="border-t p-2 sm:p-3 flex-shrink-0">
        {typingNames.length > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <span className="text-xs text-muted-foreground">
              {typingNames.length === 1 ? typingNames[0] : `${typingNames.length} people`}
            </span>
            <BouncingDots />
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={messageInputRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (e.target.value.trim()) sendTypingEvent();
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 min-h-[36px] max-h-[120px] resize-none text-sm"
            rows={1}
            data-testid="input-community-message"
          />
          <Button
            size="icon"
            className="flex-shrink-0 h-9 w-9"
            onClick={handleSend}
            disabled={!message.trim()}
            data-testid="button-send-community-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <UsernameSetupDialog open={showUsernameDialog} onComplete={handleUsernameComplete} />
    </div>
  );
}
