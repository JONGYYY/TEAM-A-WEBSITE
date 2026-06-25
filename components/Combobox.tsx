"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import s from "./Combobox.module.css";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Searchable input with a dropdown of suggestions. Supports async fetchers
 * (e.g. school search) and local matchers (e.g. AP subjects). Free text is
 * allowed by default so users can always enter something not in the list.
 */
export function Combobox({
  value,
  onChange,
  getOptions,
  placeholder = "Search…",
  debounceMs = 0,
  allowFreeText = true,
  minChars = 1,
  emptyHint = "No matches",
  preferUp = false,
}: {
  value: string;
  onChange: (v: string) => void;
  getOptions: (query: string) => ComboOption[] | Promise<ComboOption[]>;
  placeholder?: string;
  debounceMs?: number;
  allowFreeText?: boolean;
  minChars?: number;
  emptyHint?: string;
  preferUp?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Keep input in sync when the stored value changes from outside.
  useEffect(() => { setQuery(value); }, [value]);

  // Flip the menu above the field when there isn't enough room below.
  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // preferUp: open above as long as there's reasonable room there.
    // Otherwise only flip up when below would overflow and above has more room.
    setDropUp(preferUp ? spaceAbove > 180 || spaceAbove > spaceBelow : spaceBelow < 300 && spaceAbove > spaceBelow);
  }, [open, options.length, preferUp]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const run = useCallback(
    async (q: string) => {
      if (q.trim().length < minChars) { setOptions([]); setLoading(false); return; }
      const id = ++reqId.current;
      setLoading(true);
      try {
        const res = await Promise.resolve(getOptions(q));
        if (id === reqId.current) setOptions(res);
      } catch {
        if (id === reqId.current) setOptions([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [getOptions, minChars]
  );

  useEffect(() => {
    if (!open) return;
    if (debounceMs <= 0) { run(query); return; }
    const t = setTimeout(() => run(query), debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, debounceMs]);

  function select(opt: ComboOption) {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    setActive(-1);
  }

  function commitFreeText() {
    if (allowFreeText && query !== value) onChange(query.trim());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      if (active >= 0 && options[active]) { e.preventDefault(); select(options[active]); }
      else { setOpen(false); commitFreeText(); }
    } else if (e.key === "Escape") { setOpen(false); }
  }

  const showFreeText = allowFreeText && query.trim().length >= minChars &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className={s.wrap} ref={ref}>
      <input
        className="input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={commitFreeText}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && (loading || options.length > 0 || showFreeText) && (
        <div className={s.menu} data-drop={dropUp ? "up" : "down"}>
          {loading && <div className={s.status}>Searching…</div>}
          {!loading && options.map((o, i) => (
            <button
              key={o.value + i}
              type="button"
              className={s.item}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); select(o); }}
            >
              <span className={s.label}>{o.label}</span>
              {o.hint && <span className={s.hint}>{o.hint}</span>}
            </button>
          ))}
          {!loading && !options.length && !showFreeText && (
            <div className={s.status}>{emptyHint}</div>
          )}
          {!loading && showFreeText && (
            <button
              type="button"
              className={s.freeText}
              onMouseDown={(e) => { e.preventDefault(); onChange(query.trim()); setQuery(query.trim()); setOpen(false); }}
            >
              Use “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
