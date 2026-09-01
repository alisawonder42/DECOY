import { copy } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";
import { Button } from "../components/Button.tsx";
import { ConsentCheckbox } from "../components/ConsentCheckbox.tsx";
import { useLanguage } from "../hooks/useLanguage.ts";

type Props = {
  accepted: boolean;
  pending: boolean;
  onAcceptedChange: (value: boolean) => void;
  onOpenTerms: () => void;
  onContinue: () => void;
};

const skipLocation = import.meta.env.VITE_SKIP_LOCATION === "true";

export function IntroScreen({
  accepted,
  pending,
  onAcceptedChange,
  onOpenTerms,
  onContinue,
}: Props) {
  const { t } = useLanguage();
  const continueLabel = skipLocation ? copy.continue : copy.continueWithLocation;

  return (
    <section className="screen">
      <BilingualText pair={copy.introTitle} as="h1" className="title" />
      <BilingualText pair={copy.introBody1} />
      <BilingualText pair={copy.introBody2} />
      <BilingualText pair={copy.introBody3} className="muted" />
      <ConsentCheckbox
        checked={accepted}
        onChange={onAcceptedChange}
        label={copy.termsCheckbox}
        termsLink={copy.termsLink}
        onOpenTerms={onOpenTerms}
      />
      <Button onClick={onContinue} disabled={!accepted || pending} aria-busy={pending}>
        {t(continueLabel)}
      </Button>
    </section>
  );
}
