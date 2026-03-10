"use client";

import React from "react";
import { Button, Input, Spinner } from "@/components/ui";

export function AppHeader({
  query,
  onQueryChange,
  onCreate,
  syncing,
  backendOk,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onCreate: () => void;
  syncing: boolean;
  backendOk: boolean | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold text-gray-900">NoteMaster</div>
            {syncing ? <Spinner label="Syncing…" /> : null}
            {backendOk === false ? (
              <span className="text-xs text-red-700">
                Backend unreachable (check NEXT_PUBLIC_API_BASE)
              </span>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-[360px]">
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search notes…"
                aria-label="Search notes"
              />
            </div>
            <Button onClick={onCreate}>New note</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
