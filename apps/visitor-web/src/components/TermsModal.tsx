import { copy } from "../copy/index.ts";
import { termsParagraphsEn, termsParagraphsSr, termsMeta } from "../copy/terms.ts";
import { BilingualText } from "./BilingualText.tsx";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";

type Props = {
  onClose: () => void;
};

export function TermsModal({ onClose }: Props) {
  return (
    <Modal onClose={onClose} labelledBy="terms-title">
      <BilingualText pair={copy.termsTitle} as="h2" className="modal-title" />
      <p id="terms-title" className="visually-hidden">
        {copy.termsTitle.sr} / {copy.termsTitle.en}
      </p>
      <p className="terms-version">v{termsMeta.termsVersion}</p>
      <div className="terms-columns">
        <div lang="sr">
          {termsParagraphsSr.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div lang="en">
          {termsParagraphsEn.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <Button onClick={onClose}>{copy.close.sr} / {copy.close.en}</Button>
    </Modal>
  );
}
