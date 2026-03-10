import test from "node:test";
import assert from "node:assert/strict";

import { cx, debounce } from "@/lib/ui";

test("cx joins truthy class values and skips falsy ones", () => {
  const result = cx("a", undefined, null, false, "b", "", "c");
  // "" is falsy and should be filtered out by Boolean
  assert.equal(result, "a b c");
});

test("debounce only calls the function once with the last arguments", async () => {
  const calls: Array<{ a: number; b: string }> = [];
  const fn = (a: number, b: string) => {
    calls.push({ a, b });
  };

  const d = debounce(fn, 30);

  d(1, "first");
  d(2, "second");
  d(3, "third");

  // before timer fires
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(calls.length, 0);

  // after timer fires
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { a: 3, b: "third" });
});

test("debounce schedules a new call after the previous one has fired", async () => {
  let count = 0;
  const fn = () => {
    count += 1;
  };

  const d = debounce(fn, 20);

  d();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(count, 1);

  d();
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(count, 2);
});
