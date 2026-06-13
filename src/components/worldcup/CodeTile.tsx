import { nationCode, nationStyle, nationFlagSrc } from "./nation-code";

/** A code/monogram tile on a neutral chip — crest-free, flag-free fallback. */
export function CodeTile({ slug, name, size = 40 }: { slug: string; name: string; size?: number }) {
  const flag = nationFlagSrc(slug);
  if (flag) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={flag}
        alt={name}
        width={size}
        height={size}
        className="rounded-full shrink-0 ring-1 ring-line/60 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const style = nationStyle(slug);
  return (
    <div
      className="rounded-full grid place-items-center font-bold num shrink-0 tracking-tight"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3), background: style.bg, color: style.color }}
    >
      {nationCode(slug, name)}
    </div>
  );
}
