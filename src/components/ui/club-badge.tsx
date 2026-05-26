interface ClubBadgeProps {
  clubShort: string;
  clubBg: string;
  clubColor: string;
  size?: number;
}

export function ClubBadge({ clubShort, clubBg, clubColor, size = 22 }: ClubBadgeProps) {
  return (
    <div
      style={{ width: size, height: size, background: clubBg, color: clubColor }}
      className="grid place-items-center rounded-[5px] text-[10px] font-bold tracking-tight num"
    >
      {clubShort}
    </div>
  );
}
