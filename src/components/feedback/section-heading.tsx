export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="card-title">
        {title}
        {subtitle ? <span className="card-subtitle"> · {subtitle}</span> : null}
      </div>
      {action}
    </div>
  );
}
