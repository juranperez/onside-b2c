/**
 * Renders a schema.org JSON-LD block. Server-safe, renders nothing visible.
 * Pass any plain object; it is serialized into a <script type="application/ld+json">.
 * The payload is always a JSON.stringify of a controlled object (never raw HTML),
 * which is the canonical safe usage documented by Next.js for structured data.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
