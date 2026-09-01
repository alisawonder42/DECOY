import type { CopyPair } from "../copy/index.ts";
import { useLanguage } from "../hooks/useLanguage.ts";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: CopyPair;
  onOpenTerms: () => void;
  termsLink: CopyPair;
};

export function ConsentCheckbox({
  checked,
  onChange,
  label,
  onOpenTerms,
  termsLink,
}: Props) {
  const { language, t } = useLanguage();
  return (
    <div className="consent">
      <label className="consent-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span lang={language}>{t(label)}</span>
      </label>
      <button type="button" className="text-link" onClick={onOpenTerms} lang={language}>
        {t(termsLink)}
      </button>
    </div>
  );
}
