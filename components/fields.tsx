"use client";

import React from "react";

export function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field-block" style={{ display: "block" }}>
      <span className="field-label">
        {label} {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberInput({
  value, onChange, placeholder, min, max, step,
}: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; min?: number; max?: number; step?: number }) {
  const [raw, setRaw] = React.useState(value != null ? String(value) : "");

  React.useEffect(() => {
    setRaw(value != null ? String(value) : "");
  }, [value]);

  // Live: allow free typing, but hard-cap at `max` so you can never enter above it.
  function handleChange(str: string) {
    if (str === "") { setRaw(""); onChange(null); return; }
    const n = Number(str);
    if (!Number.isNaN(n) && max != null && n > max) {
      setRaw(String(max));
      onChange(max);
      return;
    }
    setRaw(str);
    if (!Number.isNaN(n)) onChange(n);
  }

  // On blur: settle the lower bound and normalize (no mid-typing jump to `min`).
  function commit(str: string) {
    if (str === "") { onChange(null); return; }
    let n = Number(str);
    if (Number.isNaN(n)) { setRaw(value != null ? String(value) : ""); return; }
    if (min != null && n < min) n = min;
    if (max != null && n > max) n = max;
    setRaw(String(n));
    onChange(n);
  }

  return (
    <input
      className="input"
      type="number"
      min={min}
      max={max}
      step={step}
      value={raw}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}

export function Select({
  value, onChange, options, placeholder = "Select",
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function ChipMulti({
  options, selected, onToggle,
}: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="chip"
          data-selected={selected.includes(o)}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
