const SIZES = {
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-4 w-4 border-2',
  lg: 'h-6 w-6 border-[3px]',
};

export default function Spinner({ size = 'md', className = '', label }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : 'true'}
      className={[
        'inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent',
        SIZES[size] ?? SIZES.md,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
