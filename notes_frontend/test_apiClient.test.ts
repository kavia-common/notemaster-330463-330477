import test from "node:test";
import assert from "node:assert/strict";

import { api, ApiError } from "@/lib/apiClient";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "undefined") delete process.env[k];
    else process.env[k] = v;
  }
}

function withMockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response> | Response
) {
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : String(input?.url ?? input);
    calls.push({ url, init });
    return handler(url, init);
  }) as any;

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(data: string, status = 200, contentType = "text/plain") {
  return new Response(data, {
    status,
    headers: { "content-type": contentType },
  });
}

test("api throws ApiError(0) when NEXT_PUBLIC_API_BASE is missing", async () => {
  setEnv({
    NEXT_PUBLIC_API_BASE: undefined,
    NEXT_PUBLIC_BACKEND_URL: undefined,
  });

  await assert.rejects(
    () => api.listNotes(),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 0);
      assert.match(
        err.message,
        /Missing NEXT_PUBLIC_API_BASE \(or NEXT_PUBLIC_BACKEND_URL\)/i
      );
      return true;
    }
  );
});

test("api uses NEXT_PUBLIC_API_BASE and joins URL without double slashes", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com/api/" });

  const mock = withMockFetch(async (url) => {
    assert.equal(url, "https://example.com/api/notes");
    return jsonResponse([]);
  });

  try {
    const notes = await api.listNotes();
    assert.deepEqual(notes, []);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0]?.init?.method, "GET");
  } finally {
    mock.restore();
  }
});

test("api falls back to NEXT_PUBLIC_BACKEND_URL when NEXT_PUBLIC_API_BASE is not set", async () => {
  setEnv({
    NEXT_PUBLIC_API_BASE: undefined,
    NEXT_PUBLIC_BACKEND_URL: "https://backend.local",
  });

  const mock = withMockFetch(async (url) => {
    assert.equal(url, "https://backend.local/healthz");
    return jsonResponse({ ok: true });
  });

  try {
    const res = await api.healthCheck();
    assert.deepEqual(res, { ok: true });
  } finally {
    mock.restore();
  }
});

test("healthCheck uses NEXT_PUBLIC_HEALTHCHECK_PATH when provided", async () => {
  setEnv({
    NEXT_PUBLIC_API_BASE: "https://example.com",
    NEXT_PUBLIC_HEALTHCHECK_PATH: "/custom-health",
  });

  const mock = withMockFetch(async (url) => {
    assert.equal(url, "https://example.com/custom-health");
    return jsonResponse({ ok: true });
  });

  try {
    await api.healthCheck();
  } finally {
    mock.restore();
  }
});

test("listNotes adds q and tag query params", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com/api" });

  const mock = withMockFetch(async (url) => {
    // Order should be stable because code sets q then tag.
    assert.equal(url, "https://example.com/api/notes?q=hello&tag=work");
    return jsonResponse([{ id: "1", title: "t", content: "c", tags: [] }]);
  });

  try {
    const notes = await api.listNotes({ q: "hello", tag: "work" });
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.id, "1");
  } finally {
    mock.restore();
  }
});

test("listNotes supports {items:[...]} response contract", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const mock = withMockFetch(async () => {
    return jsonResponse({
      items: [{ id: "n1", title: "A", content: "B", tags: ["x"] }],
    });
  });

  try {
    const notes = await api.listNotes();
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.id, "n1");
  } finally {
    mock.restore();
  }
});

test("listTags supports string[] and {items:string[]} response contracts", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  // First: array response
  {
    const mock = withMockFetch(async () => jsonResponse(["a", "b"]));
    try {
      const tags = await api.listTags();
      assert.deepEqual(tags, ["a", "b"]);
    } finally {
      mock.restore();
    }
  }

  // Second: {items: ...} response
  {
    const mock = withMockFetch(async () => jsonResponse({ items: ["x"] }));
    try {
      const tags = await api.listTags();
      assert.deepEqual(tags, ["x"]);
    } finally {
      mock.restore();
    }
  }
});

test("getNote encodes id in path", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const mock = withMockFetch(async (url) => {
    // id has a space and a slash which should be encoded
    assert.equal(url, "https://example.com/notes/a%20b%2Fc");
    return jsonResponse({ id: "a b/c", title: "", content: "", tags: [] });
  });

  try {
    const note = await api.getNote("a b/c");
    assert.equal(note.id, "a b/c");
  } finally {
    mock.restore();
  }
});

test("createNote POSTs JSON body and returns created note", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const input = { title: "T", content: "C", tags: ["t1"] };

  const mock = withMockFetch(async (_url, init) => {
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as any)?.["Content-Type"], "application/json");
    assert.equal(init?.body, JSON.stringify(input));
    return jsonResponse({ id: "1", ...input });
  });

  try {
    const created = await api.createNote(input);
    assert.equal(created.id, "1");
    assert.equal(created.title, "T");
  } finally {
    mock.restore();
  }
});

test("updateNote supports PUT and PATCH modes", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const input = { title: "Updated" };

  // PUT default
  {
    const mock = withMockFetch(async (_url, init) => {
      assert.equal(init?.method, "PUT");
      return jsonResponse({ id: "1", title: "Updated", content: "", tags: [] });
    });
    try {
      const updated = await api.updateNote("1", input);
      assert.equal(updated.title, "Updated");
    } finally {
      mock.restore();
    }
  }

  // PATCH
  {
    const mock = withMockFetch(async (_url, init) => {
      assert.equal(init?.method, "PATCH");
      return jsonResponse({ id: "1", title: "Updated", content: "", tags: [] });
    });
    try {
      const updated = await api.updateNote("1", input, "PATCH");
      assert.equal(updated.title, "Updated");
    } finally {
      mock.restore();
    }
  }
});

test("deleteNote calls DELETE and succeeds on empty response body", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const mock = withMockFetch(async (_url, init) => {
    assert.equal(init?.method, "DELETE");
    // No body returned
    return new Response("", { status: 200, headers: { "content-type": "text/plain" } });
  });

  try {
    await api.deleteNote("1");
  } finally {
    mock.restore();
  }
});

test("requestJson surfaces non-JSON response as text", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const mock = withMockFetch(async () => textResponse("OK", 200, "text/plain"));

  try {
    const res = await api.healthCheck();
    assert.equal(res, "OK");
  } finally {
    mock.restore();
  }
});

test("non-2xx responses throw ApiError with status and bodyText", async () => {
  setEnv({ NEXT_PUBLIC_API_BASE: "https://example.com" });

  const mock = withMockFetch(async () => textResponse("Bad stuff", 500, "text/plain"));

  try {
    await assert.rejects(
      () => api.listNotes(),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 500);
        assert.match(err.message, /API request failed: GET \/notes \(500\)/);
        assert.equal(err.bodyText, "Bad stuff");
        return true;
      }
    );
  } finally {
    mock.restore();
  }
});
