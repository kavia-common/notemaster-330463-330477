"use client";

import React, { useEffect } from "react";
import { cx } from "@/lib/ui";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const { className, variant = "primary", ...rest } = props;
  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return <button className={cx(base, variants[variant], className)} {...rest} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      className={cx(
        "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-400",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={cx(
        "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-400",
        className
      )}
      {...rest}
    />
  );
}

export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { tone?: "gray" | "blue" }) {
  const { className, tone = "gray", ...rest } = props;
  const toneCls = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700";
  return (
    <span
      className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", toneCls, className)}
      {...rest}
    />
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      <span>{label ?? "Loading…"}</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-red-900">
      <div className="font-semibold">{title}</div>
      {message ? <div className="mt-1 text-sm text-red-800">{message}</div> : null}
      {onRetry ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title = "No results",
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {message ? <div className="mt-1 text-sm text-gray-600">{message}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-lg bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
          <div className="text-base font-semibold text-gray-900">{title}</div>
          <Button variant="ghost" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-gray-100 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
