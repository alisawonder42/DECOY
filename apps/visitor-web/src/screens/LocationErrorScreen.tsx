import { copy, type CopyPair } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";
import { Button } from "../components/Button.tsx";

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
  return (
    <section className="screen">
      <BilingualText pair={titles[kind]} as="h1" className="title" />
      {kind === "denied" ? <BilingualText pair={copy.locationDeniedBody} /> : null}
      <Button onClick={onRetry} disabled={pending} aria-busy={pending}>
        {copy.tryAgain.sr}
        <span className="btn-en">{copy.tryAgain.en}</span>
      </Button>
    </section>
  );
}
