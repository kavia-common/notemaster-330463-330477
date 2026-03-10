"use client";

import React from "react";
import type { Note } from "@/lib/types";
import { Badge, Button, EmptyState } from "@/components/ui";

export function NoteDetail({
  note,
  onEdit,
}: {
  note: Note | null;
  onEdit: (note: Note) => void;
}) {
  if (!note) {
    return (
      <EmptyState
        title="Select a note"
        message="Choose a note from the list to view it here."
      />
    );
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">
            {note.title?.trim() ? note.title : "Untitled"}
          </h2>
          {note.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {note.tags.map((t) => (
                <Badge key={t} tone="blue">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">No tags</div>
          )}
        </div>

        <Button variant="ghost" onClick={() => onEdit(note)}>
          Edit
        </Button>
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-800">
        {note.content?.trim() ? note.content : "—"}
      </div>

      {note.createdAt || note.updatedAt ? (
        <div className="mt-4 text-xs text-gray-500">
          {note.updatedAt ? `Updated: ${note.updatedAt}` : null}
          {note.createdAt && !note.updatedAt ? `Created: ${note.createdAt}` : null}
        </div>
      ) : null}
    </article>
  );
}
