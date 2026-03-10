"use client";

import React from "react";
import type { Note } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { cx } from "@/lib/ui";

export function NotesList({
  notes,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  notes: Note[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
        Notes ({notes.length})
      </div>
      <ul className="max-h-[60vh] overflow-auto">
        {notes.map((n) => {
          const active = n.id === selectedId;
          return (
            <li key={n.id} className="border-b border-gray-100 last:border-b-0">
              <button
                className={cx(
                  "w-full text-left px-3 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400",
                  active ? "bg-blue-50" : ""
                )}
                onClick={() => onSelect(n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {n.title?.trim() ? n.title : "Untitled"}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {n.content?.trim() ? n.content : "—"}
                    </div>
                    {n.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {n.tags.slice(0, 4).map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                        {n.tags.length > 4 ? <Badge>+{n.tags.length - 4}</Badge> : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit(n);
                      }}
                      aria-label={`Edit note ${n.title}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(n);
                      }}
                      aria-label={`Delete note ${n.title}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
