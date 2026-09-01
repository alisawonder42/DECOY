import type { CopyPair } from "../copy/index.ts";
import { useLanguage } from "../hooks/useLanguage.ts";

type Tag = "p" | "h1" | "h2" | "span" | "legend";

type Props = {
  pair: CopyPair;
  as?: Tag;
  className?: string;
};

export function BilingualText({ pair, as = "p", className }: Props) {
  const { language, t } = useLanguage();
  const Tag = as;
  return (
    <Tag className={className} lang={language}>
      {t(pair)}
    </Tag>
  );
}
