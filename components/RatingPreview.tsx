// A preview of two-way ratings. It is not interactive yet, so it has no buttons:
// the stars are decoration and the text says what is coming.
export default function RatingPreview({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-field px-3 py-2 text-sm text-muted">
      <span aria-hidden="true" className="text-lg leading-none tracking-wider text-field">
        ★★★★★
      </span>
      <span>Rate your pickup with {name}</span>
      <span className="rounded-full bg-warn-tint px-2.5 py-0.5 text-xs font-bold text-warn-text">
        Coming soon
      </span>
    </div>
  );
}