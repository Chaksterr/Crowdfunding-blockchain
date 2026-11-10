import { useId } from 'react';

/**
 * Champ de formulaire : libellé visible au-dessus, aide ou erreur en dessous.
 * `as` accepte "input" (défaut), "textarea" ou "select".
 */
export default function Field({
  id,
  label,
  hint,
  error,
  required = false,
  as: Tag = 'input',
  className = '',
  children,
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  const controlClass = [
    'block w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors',
    'placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    error ? 'border-rose-300' : 'border-slate-300',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id: fieldId,
    className: controlClass,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    required,
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-rose-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {Tag === 'select' || Tag === 'textarea' ? (
        <Tag {...shared} {...rest}>
          {children}
        </Tag>
      ) : (
        <Tag {...shared} {...rest} />
      )}

      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
