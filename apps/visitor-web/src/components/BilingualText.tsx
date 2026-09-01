import type { CopyPair } from "../copy/index.ts";

type Tag = "p" | "h1" | "h2" | "span" | "legend";

type Props = {
  pair: CopyPair;
  as?: Tag;
  className?: string;
};

export function BilingualText({ pair, as = "p", className }: Props) {
  const Tag = as;
  return (
    <Tag className={className ? `bilingual ${className}` : "bilingual"}>
      <span lang="sr">{pair.sr}</span>
      <span lang="en">{pair.en}</span>
    </Tag>
  );
}
