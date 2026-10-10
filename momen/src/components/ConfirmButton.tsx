"use client";

/** A submit button that asks before submitting (for deletes). */
export function ConfirmButton({
  children,
  message = "Are you sure?",
  className = "btn-danger",
  formAction,
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <button
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
