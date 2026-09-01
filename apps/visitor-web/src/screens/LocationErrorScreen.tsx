import { copy, type CopyPair } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";
import { Button } from "../components/Button.tsx";
import { useLanguage } from "../hooks/useLanguage.ts";

type Kind = "denied" | "outside" | "inaccurate";

type Props = {
  kind: Kind;
  pending: boolean;
  onRetry: () => void;
};

const titles: Record<Kind, CopyPair> = {
  denied: copy.locationDeniedTitle,
  outside: copy.locationOutside,
  inaccurate: copy.locationInaccurate,
};

export function LocationErrorScreen({ kind, pending, onRetry }: Props) {
  const { t } = useLanguage();
  return (
    <section className="screen">
      <BilingualText pair={titles[kind]} as="h1" className="title" />
      {kind === "denied" ? <BilingualText pair={copy.locationDeniedBody} /> : null}
      <Button onClick={onRetry} disabled={pending} aria-busy={pending}>
        {t(copy.tryAgain)}
      </Button>
    </section>
  );
}
