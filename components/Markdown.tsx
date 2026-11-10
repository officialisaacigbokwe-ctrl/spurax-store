import type { ReactNode } from "react";

const INLINE =
  /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\)|`[^`]+`)/g;

function safeHref(url: string) {
  return /^(https?:\/\/|\/|mailto:)/i.test(url) ? url : null;
}

function inline(text: string, keyBase: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyBase}-${index}`;

      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={key}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);

      if (link) {
        const href = safeHref(link[2]);

        if (!href) return link[1];

        const external = /^https?:/i.test(href);

        return (
          <a
            key={key}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="font-medium text-black underline underline-offset-4"
          >
            {link[1]}
          </a>
        );
      }

      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }

      return part;
    });
}

const isHeading = (line: string) => /^#{1,3}\s+/.test(line);
const isBullet = (line: string) => /^[-*]\s+/.test(line);
const isNumbered = (line: string) => /^\d+\.\s+/.test(line);
const isQuote = (line: string) => line.startsWith("> ");
const isRule = (line: string) => /^---+$/.test(line.trim());

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let id = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);

    if (heading) {
      const key = `b${id++}`;
      const level = heading[1].length;

      blocks.push(
        level === 3 ? (
          <h3 key={key} className="mt-8 text-xl font-semibold text-black">
            {inline(heading[2], key)}
          </h3>
        ) : (
          <h2
            key={key}
            className="mt-10 text-2xl font-bold tracking-tight text-black"
          >
            {inline(heading[2], key)}
          </h2>
        )
      );

      i++;
      continue;
    }

    if (isRule(line)) {
      blocks.push(<hr key={`b${id++}`} className="my-8 border-gray-200" />);
      i++;
      continue;
    }

    if (isQuote(line)) {
      const key = `b${id++}`;
      const quote: string[] = [];

      while (i < lines.length && isQuote(lines[i])) {
        quote.push(lines[i].slice(2));
        i++;
      }

      blocks.push(
        <blockquote
          key={key}
          className="my-6 border-l-4 border-black pl-5 text-lg italic text-gray-700"
        >
          {inline(quote.join(" "), key)}
        </blockquote>
      );
      continue;
    }

    if (isBullet(line)) {
      const key = `b${id++}`;
      const items: string[] = [];

      while (i < lines.length && isBullet(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }

      blocks.push(
        <ul key={key} className="my-4 list-disc space-y-2 pl-6">
          {items.map((item, index) => (
            <li key={`${key}-${index}`}>{inline(item, `${key}-${index}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (isNumbered(line)) {
      const key = `b${id++}`;
      const items: string[] = [];

      while (i < lines.length && isNumbered(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }

      blocks.push(
        <ol key={key} className="my-4 list-decimal space-y-2 pl-6">
          {items.map((item, index) => (
            <li key={`${key}-${index}`}>{inline(item, `${key}-${index}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph: keep reading until a blank line or another kind of block
    const key = `b${id++}`;
    const paragraph: string[] = [];

    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isHeading(lines[i]) &&
      !isBullet(lines[i]) &&
      !isNumbered(lines[i]) &&
      !isQuote(lines[i]) &&
      !isRule(lines[i])
    ) {
      paragraph.push(lines[i]);
      i++;
    }

    blocks.push(
      <p key={key} className="my-4">
        {inline(paragraph.join(" "), key)}
      </p>
    );
  }

  return (
    <div className="text-[17px] leading-8 text-gray-700">{blocks}</div>
  );
}