export default function Card({
  as: Tag = 'div',
  padded = true,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        padded ? 'p-5 sm:p-6' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
