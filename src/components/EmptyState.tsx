type Props = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title = "Sin datos aún", description, actionLabel, onAction }: Props) {
  return (
    <div className="py-10 px-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center gap-2">
      <p className="text-xs font-bold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 max-w-md">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-1 text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
