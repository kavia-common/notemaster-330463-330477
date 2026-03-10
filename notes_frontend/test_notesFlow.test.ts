import test from "node:test";
import assert from "node:assert/strict";

import { api } from "@/lib/apiClient";
import type { Note, Tag } from "@/lib/types";

type Db = {
  notes: Note[];
};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "undefined") delete process.env[k];
    else process.env[k] = v;
  }
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Minimal in-memory "backend" that matches the API client's expected routes.
 * This avoids React/DOM testing deps while still covering the main flow end-to-end
 * through the API client + fetch boundary.
 */
function installInMemoryBackend(db: Db) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input?.url ?? input);
    const method = (init?.method ?? "GET").toUpperCase();
    const u = new URL(url);

    const path = u.pathname;
    const json = async () => {
      const bodyText = typeof init?.body === "string" ? init?.body : "";
      return bodyText ? JSON.parse(bodyText) : undefined;
    };

    // health
    if (method === "GET" && path === "/healthz") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // list notes (with optional filtering)
    if (method === "GET" && path === "/notes") {
      const q = u.searchParams.get("q") ?? "";
      const tag = u.searchParams.get("tag") ?? "";

      let items = [...db.notes];

      if (q.trim()) {
        const ql = q.toLowerCase();
        items = items.filter(
          (n) =>
            n.title.toLowerCase().includes(ql) ||
            n.content.toLowerCase().includes(ql)
        );
      }

      if (tag.trim()) {
        items = items.filter((n) => n.tags.includes(tag));
      }

      return new Response(JSON.stringify(items), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // create note
    if (method === "POST" && path === "/notes") {
      const body = (await json()) as {
        title: string;
        content: string;
        tags: Tag[];
      };
      const created: Note = {
        id: String(Math.random()).slice(2),
        title: body.title,
        content: body.content,
        tags: body.tags ?? [],
        createdAt: nowIso(),
      };
      db.notes.unshift(created);
      return new Response(JSON.stringify(created), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // note by id
    const noteMatch = path.match(/^\/notes\/(.+)$/);
    if (noteMatch) {
      const id = decodeURIComponent(noteMatch[1] ?? "");
      const idx = db.notes.findIndex((n) => n.id === id);

      if (idx < 0) {
        return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
      }

      if (method === "GET") {
        return new Response(JSON.stringify(db.notes[idx]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "PUT" || method === "PATCH") {
        const body = (await json()) as Partial<{
          title: string;
          content: string;
          tags: Tag[];
        }>;
        const existing = db.notes[idx];
        const updated: Note = {
          ...existing,
          title: body.title ?? existing.title,
          content: body.content ?? existing.content,
          tags: body.tags ?? existing.tags,
          updatedAt: nowIso(),
        };
        db.notes[idx] = updated;
        return new Response(JSON.stringify(updated), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "DELETE") {
        db.notes.splice(idx, 1);
        return new Response("", { status: 200, headers: { "content-type": "text/plain" } });
      }
    }

    // list tags
    if (method === "GET" && path === "/tags") {
      const tagSet = new Set<string>();
      for (const n of db.notes) for (const t of n.tags) tagSet.add(t);
      const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
      return new Response(JSON.stringify(tags), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(`Unhandled route: ${method} ${path}`, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }) as any;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("notes flow: create -> list -> update -> tags -> delete", async () => {
  setEnv({
    NEXT_PUBLIC_API_BASE: "https://example.test", // must be set for apiClient
    NEXT_PUBLIC_HEALTHCHECK_PATH: "/healthz",
  });

  const db: Db = { notes: [] };
  const restore = installInMemoryBackend(db);

  try {
    // Health check
    const health = await api.healthCheck();
    assert.deepEqual(health, { ok: true });

    // Empty list
    const empty = await api.listNotes();
    assert.deepEqual(empty, []);

    // Create
    const created = await api.createNote({
      title: "First",
      content: "Hello world",
      tags: ["work", "ideas"],
    });
    assert.ok(created.id);
    assert.equal(created.title, "First");

    // List contains created
    const afterCreate = await api.listNotes();
    assert.equal(afterCreate.length, 1);
    assert.equal(afterCreate[0]?.id, created.id);

    // Filter by q
    const filteredByQuery = await api.listNotes({ q: "hello" });
    assert.equal(filteredByQuery.length, 1);

    // Update (PUT default)
    const updated = await api.updateNote(created.id, {
      title: "First (edited)",
      content: "Updated content",
      tags: ["ideas"],
    });
    assert.equal(updated.title, "First (edited)");
    assert.deepEqual(updated.tags, ["ideas"]);
    assert.ok(updated.updatedAt);

    // Tags list reflects updated tags
    const tags = await api.listTags();
    assert.deepEqual(tags, ["ideas"]);

    // Filter by tag
    const filteredByTag = await api.listNotes({ tag: "ideas" });
    assert.equal(filteredByTag.length, 1);

    // Delete
    await api.deleteNote(created.id);
    const afterDelete = await api.listNotes();
    assert.deepEqual(afterDelete, []);
  } finally {
    restore();
  }
});
