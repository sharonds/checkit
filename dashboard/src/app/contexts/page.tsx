"use client";

import { useEffect, useState } from "react";
import { FooterBar } from "@/components/footer-bar";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Scale,
  ClipboardList,
  Palette,
  FileText,
  Trash2,
  Pencil,
  Upload,
  X,
  Check,
} from "lucide-react";

interface ContextItem {
  id: number;
  type: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const CONTEXT_TYPES = [
  {
    type: "tone-guide",
    name: "Tone Guide",
    description: "Brand voice rules for the Tone of Voice skill",
    icon: MessageSquare,
  },
  {
    type: "legal-policy",
    name: "Legal Policy",
    description: "Company legal requirements for the Legal Risk skill",
    icon: Scale,
  },
  {
    type: "brief",
    name: "Content Brief",
    description: "Content brief with requirements for the Brief Matching skill",
    icon: ClipboardList,
  },
  {
    type: "style-guide",
    name: "Style Guide",
    description: "Writing style rules for SEO and Tone skills",
    icon: Palette,
  },
  {
    type: "custom",
    name: "Custom Context",
    description: "Any additional context for custom skills",
    icon: FileText,
  },
] as const;

export default function ContextsPage() {
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    fetchContexts();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  function fetchContexts() {
    fetch("/api/contexts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContexts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function getContextForType(type: string): ContextItem | undefined {
    return contexts.find((c) => c.type === type);
  }

  function startEdit(type: string) {
    const existing = getContextForType(type);
    setEditContent(existing?.content ?? "");
    setEditingType(type);
    setDeleteConfirm(null);
  }

  function cancelEdit() {
    setEditingType(null);
    setEditContent("");
  }

  async function saveContext(type: string) {
    const meta = CONTEXT_TYPES.find((t) => t.type === type);
    if (!meta) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: meta.name,
          content: editContent,
        }),
      });
      if (res.ok) {
        setMessage({ text: `${meta.name} saved`, type: "success" });
        setEditingType(null);
        setEditContent("");
        fetchContexts();
      } else {
        setMessage({ text: "Failed to save", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteContext(type: string) {
    const meta = CONTEXT_TYPES.find((t) => t.type === type);
    try {
      const res = await fetch(`/api/contexts/${type}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({
          text: `${meta?.name ?? type} deleted`,
          type: "success",
        });
        setDeleteConfirm(null);
        fetchContexts();
      } else {
        setMessage({ text: "Failed to delete", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to delete", type: "error" });
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 px-8 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Contexts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage tone guides, briefs, legal policies, and other context
          documents used by analysis skills.
        </p>

        {message && (
          <div
            className={`mt-4 rounded-md px-4 py-2 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton key={i} variant="card" />
              ))
            : CONTEXT_TYPES.map((meta) => {
                const ctx = getContextForType(meta.type);
                const Icon = meta.icon;
                const isEditing = editingType === meta.type;
                const isDeleting = deleteConfirm === meta.type;

                return (
                  <Card key={meta.type} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-3 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{meta.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Paste or type content..."
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveContext(meta.type)}
                              disabled={saving}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : ctx ? (
                        <div className="flex flex-1 flex-col gap-2">
                          <p className="line-clamp-3 text-xs text-muted-foreground">
                            {ctx.content.slice(0, 100)}
                            {ctx.content.length > 100 ? "..." : ""}
                          </p>
                          <div className="mt-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{ctx.content.length} chars</span>
                            <span>
                              Updated{" "}
                              {new Date(ctx.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(meta.type)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            {isDeleting ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteContext(meta.type)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm(meta.type)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col items-start gap-2">
                          <span className="text-xs text-muted-foreground italic">
                            Not configured
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-auto"
                            onClick={() => startEdit(meta.type)}
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            Upload
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
      <FooterBar />
    </div>
  );
}
