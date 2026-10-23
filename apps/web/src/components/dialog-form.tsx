"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
export type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  min?: string;
  max?: string;
  step?: string;
};
export function DialogForm({
  title,
  fields,
  onClose,
  onSubmit,
}: {
  title: string;
  fields: Field[];
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="dialog-title">
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(
            new FormData(e.currentTarget).entries(),
          ) as Record<string, string>;
          setBusy(true);
          setError("");
          try {
            await onSubmit(data);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to save");
          } finally {
            setBusy(false);
          }
        }}
      >
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.options ? (
              <select
                aria-label={f.label}
                name={f.name}
                defaultValue={f.value}
                required={f.required !== false}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                name={f.name}
                defaultValue={f.value}
                required={f.required !== false}
                rows={5}
              />
            ) : (
              <input
                aria-label={f.label}
                name={f.name}
                type={f.type ?? "text"}
                defaultValue={f.value}
                required={f.required !== false}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.type === "textarea" ? undefined : 120}
              />
            )}{" "}
            {f.hint && <small>{f.hint}</small>}
          </label>
        ))}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </dialog>
  );
}
