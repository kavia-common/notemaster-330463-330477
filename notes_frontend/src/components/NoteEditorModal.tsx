"use client";

import React, { useMemo, useState } from "react";
import type { Note, NoteCreateInput } from "@/lib/types";
import { Badge, Button, Input, Modal, Textarea } from "@/components/ui";

function parseTags(raw: string): string[] {
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  // de-dup
  return Array.from(new Set(tags));
}

export function NoteEditorModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Note;
  onClose: () => void;
  onSubmit: (input: NoteCreateInput) => Promise<void> | void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);

  // When opening with a different initial note, reset state.
  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setTagsText((initial?.tags ?? []).join(", "));
    setError(null);
  }, [open, initial?.id, initial?.title, initial?.content, initial?.tags]); // key on id + fields

  const tags = useMemo(() => parseTags(tagsText), [tagsText]);
  const canSubmit = title.trim().length > 0 || content.trim().length > 0;

  return (
    <Modal
      open={open}
      title={mode === "create" ? "New note" : "Edit note"}
      onClose={() => {
        if (!submitting) onClose();
      }}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">Tags: comma-separated</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setError(null);
                try {
                  const input: NoteCreateInput = {
                    title: title.trim(),
                    content: content.trim(),
                    tags,
                  };
                  await onSubmit(input);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to save note");
                }
              }}
              disabled={!canSubmit || submitting}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

        <div>
          <label className="text-xs font-medium text-gray-700">Title</label>
          <div className="mt-1">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Content</label>
          <div className="mt-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note…"
              rows={8}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Tags</label>
          <div className="mt-1">
            <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="work, ideas, todo" />
          </div>
          {tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge key={t} tone="blue">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">No tags</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
