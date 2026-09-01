import type { CopyPair } from "../copy/index.ts";

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
  return (
    <div className="consent">
      <label className="consent-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="bilingual">
          <span lang="sr">{label.sr}</span>
          <span lang="en">{label.en}</span>
        </span>
      </label>
      <button type="button" className="text-link" onClick={onOpenTerms}>
        <span className="bilingual">
          <span lang="sr">{termsLink.sr}</span>
          <span lang="en">{termsLink.en}</span>
        </span>
      </button>
    </div>
  );
}
