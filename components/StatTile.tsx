type StatTileProps = {
  label: string;
  value: string;
  note: string;
};

export default function StatTile({ label, value, note }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-5">
      <p className="text-[15px] text-muted">{label}</p>
      <p className="text-[40px] font-bold leading-tight tabular-nums">{value}</p>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}