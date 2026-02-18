"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ImageIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibraryFile {
  name: string;
  url: string;
  size: number;
  createdAt: string;
}

interface ImageLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function ImageLibraryModal({
  open,
  onClose,
  onSelect,
}: ImageLibraryModalProps) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/library");
      if (!res.ok) throw new Error("Failed to load library");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setError(
        "Could not load library. Make sure the form_library bucket exists in Supabase.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(null);
      fetchFiles();
    }
  }, [open, fetchFiles]);

  function handleConfirm() {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Choose from Library</DialogTitle>
        </DialogHeader>

        <div className="min-h-75">
          {loading && (
            <div className="flex items-center justify-center h-75">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-75 text-center gap-3">
              <ImageIcon className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchFiles}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="flex flex-col items-center justify-center h-75 text-center gap-2">
              <ImageIcon className="h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-medium">No images in library</p>
              <p className="text-sm text-slate-400">
                Upload an image first using the upload button
              </p>
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-100 overflow-y-auto pr-1">
              {files.map((file) => (
                <button
                  key={file.name}
                  onClick={() =>
                    setSelected(selected === file.url ? null : file.url)
                  }
                  className={cn(
                    "relative group rounded-lg border-2 overflow-hidden aspect-square bg-slate-100 transition-all",
                    selected === file.url
                      ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1"
                      : "border-transparent hover:border-slate-300",
                  )}
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {selected === file.url && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <div className="bg-white rounded-full p-1">
                        <Check className="h-4 w-4 text-slate-900" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{file.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Use Selected Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
