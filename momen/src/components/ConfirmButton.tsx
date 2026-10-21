"use client";

import { useRef } from "react";

/**
 * A button that asks in a modal before submitting its form (for deletes).
 * The modal lives inside the form, so its confirm button is the real submit button.
 */
export function ConfirmButton({
  children,
  message = "Are you sure?",
  confirmLabel = "Delete",
  danger = true,
  className = "btn-danger",
  formAction,
}: {
  children: React.ReactNode;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper p-5 text-left text-ink shadow-xl backdrop:bg-ink/40"
        // Clicking the dimmed backdrop closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <p className="text-sm whitespace-pre-wrap font-normal normal-case tracking-normal">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={close} autoFocus>
            Cancel
          </button>
          <button className={danger ? "btn-danger-solid" : "btn-primary"} formAction={formAction} onClick={close}>
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
