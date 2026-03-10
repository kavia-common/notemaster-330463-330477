"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/apiClient";
import type { Note, NoteCreateInput } from "@/lib/types";
import { AppHeader } from "@/components/AppHeader";
import { NotesList } from "@/components/NotesList";
import { NoteDetail } from "@/components/NoteDetail";
import { TagsPanel } from "@/components/TagsPanel";
import { Button, EmptyState, ErrorState, Modal, Spinner } from "@/components/ui";
import { NoteEditorModal } from "@/components/NoteEditorModal";
import { debounce } from "@/lib/ui";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function HomePage() {
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [notesState, setNotesState] = useState<LoadState>("idle");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const [tagsState, setTagsState] = useState<LoadState>("idle");
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorInitial, setEditorInitial] = useState<Note | undefined>(undefined);
  const [editorSubmitting, setEditorSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Note | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [syncing, setSyncing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadTags = useCallback(async () => {
    setTagsState("loading");
    setTagsError(null);
    try {
      const data = await api.listTags();
      setTags(Array.from(new Set(data)).sort((a, b) => a.localeCompare(b)));
      setTagsState("ready");
    } catch (e) {
      setTagsState("error");
      setTagsError(e instanceof Error ? e.message : "Failed to load tags");
    }
  }, []);

  const loadNotes = useCallback(
    async (params?: { q?: string; tag?: string | null }) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setNotesState("loading");
      setNotesError(null);
      try {
        const data = await api.listNotes({
          q: params?.q ?? (query.trim() || undefined),
          tag: params?.tag ?? activeTag ?? undefined,
        });
        setNotes(data);
        setNotesState("ready");
        // Keep selection if still exists; otherwise select first.
        setSelectedId((prev) => {
          if (prev && data.some((n) => n.id === prev)) return prev;
          return data.length ? data[0].id : null;
        });
      } catch (e) {
        setNotesState("error");
        const msg =
          e instanceof ApiError
            ? `${e.message}${e.bodyText ? ` — ${e.bodyText}` : ""}`
            : e instanceof Error
              ? e.message
              : "Failed to load notes";
        setNotesError(msg);
      }
    },
    [activeTag, query]
  );

  // Debounced search refresh to keep UX snappy.
  const debouncedReload = useMemo(
    () =>
      debounce((q: string, tag: string | null) => {
        void loadNotes({ q, tag });
      }, 250),
    [loadNotes]
  );

  useEffect(() => {
    // First load: healthcheck + notes + tags.
    let mounted = true;

    (async () => {
      try {
        await api.healthCheck();
        if (!mounted) return;
        setBackendOk(true);
      } catch {
        if (!mounted) return;
        setBackendOk(false);
      }
    })();

    void loadTags();
    void loadNotes();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, [loadNotes, loadTags]);

  // Update notes when filters change.
  useEffect(() => {
    debouncedReload(query, activeTag);
  }, [query, activeTag, debouncedReload]);

  const openCreate = () => {
    setEditorMode("create");
    setEditorInitial(undefined);
    setEditorOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditorMode("edit");
    setEditorInitial(note);
    setEditorOpen(true);
  };

  const saveNote = async (input: NoteCreateInput) => {
    setEditorSubmitting(true);
    setSyncing(true);
    try {
      if (editorMode === "create") {
        const created = await api.createNote(input);
        // Prepend created; select it.
        setNotes((prev) => [created, ...prev]);
        setSelectedId(created.id);
      } else if (editorInitial) {
        const updated = await api.updateNote(editorInitial.id, input, "PUT");
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        setSelectedId(updated.id);
      }
      setEditorOpen(false);
      // Tags may have changed.
      void loadTags();
    } finally {
      setEditorSubmitting(false);
      setSyncing(false);
    }
  };

  const confirmDelete = (note: Note) => {
    setDeleteConfirm(note);
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteSubmitting(true);
    setSyncing(true);
    try {
      await api.deleteNote(deleteConfirm.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteConfirm.id));
      setSelectedId((prev) => {
        if (prev !== deleteConfirm.id) return prev;
        // select next note (first in updated list)
        const remaining = notes.filter((n) => n.id !== deleteConfirm.id);
        return remaining.length ? remaining[0].id : null;
      });
      setDeleteConfirm(null);
      void loadTags();
    } finally {
      setDeleteSubmitting(false);
      setSyncing(false);
    }
  };

  const mainContent = () => {
    if (notesState === "loading" && notes.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Spinner label="Loading notes…" />
        </div>
      );
    }

    if (notesState === "error") {
      return (
        <ErrorState
          title="Failed to load notes"
          message={notesError ?? undefined}
          onRetry={() => void loadNotes()}
        />
      );
    }

    if (notesState === "ready" && notes.length === 0) {
      return (
        <EmptyState
          title="No notes yet"
          message={
            query.trim() || activeTag
              ? "No notes match your current filters."
              : "Create your first note to get started."
          }
          action={<Button onClick={openCreate}>New note</Button>}
        />
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <NotesList
          notes={notes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={openEdit}
          onDelete={confirmDelete}
        />
        <NoteDetail note={selectedNote} onEdit={openEdit} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader
        query={query}
        onQueryChange={setQuery}
        onCreate={openCreate}
        syncing={syncing}
        backendOk={backendOk}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-[76px] lg:h-[calc(100vh-96px)] lg:overflow-auto">
            <TagsPanel
              tags={tags}
              activeTag={activeTag}
              onSelectTag={setActiveTag}
              loading={tagsState === "loading" && tags.length === 0}
              error={tagsState === "error" ? tagsError : null}
            />
            <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-800">Static export note</div>
              <div className="mt-1">
                This app uses client-side fetching to remain compatible with Next.js{" "}
                <code className="rounded bg-gray-100 px-1">output: &quot;export&quot;</code>.
              </div>
            </div>
          </aside>

          <section className="space-y-4">{mainContent()}</section>
        </div>
      </main>

      <NoteEditorModal
        open={editorOpen}
        mode={editorMode}
        initial={editorInitial}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveNote}
        submitting={editorSubmitting}
      />

      <Modal
        open={!!deleteConfirm}
        title="Delete note?"
        onClose={() => {
          if (!deleteSubmitting) setDeleteConfirm(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void doDelete()} disabled={deleteSubmitting}>
              {deleteSubmitting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-gray-700">
          {deleteConfirm ? (
            <>
              You’re about to delete{" "}
              <span className="font-semibold">
                {deleteConfirm.title?.trim() ? deleteConfirm.title : "Untitled"}
              </span>
              . This action cannot be undone.
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
