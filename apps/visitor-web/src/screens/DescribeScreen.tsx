import { DESCRIPTION_MAX_LENGTH, validateDescription } from "@installation/shared";
import { copy } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";
import { Button } from "../components/Button.tsx";

type Props = {
  value: string;
  error: "too_short" | "network" | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function DescribeScreen({ value, error, disabled, onChange, onSubmit }: Props) {
  const length = Array.from(value).length;
  const validation = validateDescription(value);

  return (
    <section className="screen">
      <BilingualText pair={copy.describeTitle} as="h1" className="title" />
      <BilingualText pair={copy.describeBody1} />
      <BilingualText pair={copy.describeBody2} className="muted" />
      <label className="visually-hidden" htmlFor="description">
        {copy.describeTitle.sr} / {copy.describeTitle.en}
      </label>
      <textarea
        id="description"
        value={value}
        maxLength={DESCRIPTION_MAX_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="on"
        spellCheck
      />
      <p className="counter">
        {length} / {DESCRIPTION_MAX_LENGTH}
      </p>
      {error === "too_short" ? <BilingualText pair={copy.tooShort} className="error" /> : null}
      {error === "network" ? <BilingualText pair={copy.networkError} className="error" /> : null}
      <Button onClick={onSubmit} disabled={disabled || validation !== "ok"}>
        {copy.submit.sr}
      </Button>
    </section>
  );
}
