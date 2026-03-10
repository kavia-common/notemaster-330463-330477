"use client";

import React from "react";
import { Button, Spinner } from "@/components/ui";
import { cx } from "@/lib/ui";

export function TagsPanel({
  tags,
  activeTag,
  onSelectTag,
  loading,
  error,
}: {
  tags: string[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
        Tags
      </div>

      <div className="p-3">
        {loading ? <Spinner label="Loading tags…" /> : null}
        {error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error ? (
          <div className="flex flex-wrap gap-2">
            <button
              className={cx(
                "rounded-full border px-2 py-1 text-xs",
                activeTag === null
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              onClick={() => onSelectTag(null)}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                className={cx(
                  "rounded-full border px-2 py-1 text-xs",
                  activeTag === t
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
                onClick={() => onSelectTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3">
          <Button
            variant="ghost"
            onClick={() => onSelectTag(null)}
            className="w-full justify-center"
          >
            Clear filter
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
        Tip: filter notes by tag
      </div>
    </div>
  );
}
