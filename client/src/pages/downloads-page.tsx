import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, ExternalLink, FileDown, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Download as DownloadType } from "@shared/schema";

export default function DownloadsPage() {
  const { toast } = useToast();
  const [selectedDownload, setSelectedDownload] = useState<DownloadType | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: downloads, isLoading } = useQuery<DownloadType[]>({
    queryKey: ["/api/downloads"],
  });

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-downloads-title">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse available downloads</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !downloads || downloads.length === 0 ? (
        <div className="text-center py-12">
          <FileDown className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-semibold">No Downloads Available</p>
          <p className="text-sm text-muted-foreground mt-1">Check back later for new downloads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {downloads.map((dl) => (
            <Card
              key={dl.id}
              className="cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
              onClick={() => { setSelectedDownload(dl); setCopied(false); }}
              data-testid={`card-download-${dl.id}`}
            >
              <CardContent className="p-0">
                {dl.imageUrl && (
                  <div className="w-full h-32 sm:h-36 overflow-hidden rounded-t-xl bg-muted">
                    <img
                      src={dl.imageUrl}
                      alt={dl.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {!dl.imageUrl && (
                      <div className="rounded-full p-2.5 bg-primary/10 flex-shrink-0">
                        <Download className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate" data-testid={`text-download-title-${dl.id}`}>{dl.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{dl.description}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedDownload} onOpenChange={(open) => { if (!open) setSelectedDownload(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md" data-testid="dialog-download-detail">
          {selectedDownload && (
            <>
              <DialogHeader>
                {selectedDownload.imageUrl && (
                  <div className="w-full h-40 overflow-hidden rounded-lg bg-muted -mt-2 mb-3">
                    <img
                      src={selectedDownload.imageUrl}
                      alt={selectedDownload.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <DialogTitle data-testid="text-dialog-download-title">{selectedDownload.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground" data-testid="text-dialog-download-desc">{selectedDownload.description}</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Downloader Code</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all" data-testid="text-downloader-code">
                      {selectedDownload.downloaderCode}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleCopyCode(selectedDownload.downloaderCode)}
                      data-testid="button-copy-code"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(selectedDownload.downloadUrl, "_blank")}
                  data-testid="button-download"
                >
                  <ExternalLink className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedDownload(null)}
                  data-testid="button-close-download"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
