import { copy } from "../copy/index.ts";
import { termsParagraphsEn, termsParagraphsSr, termsMeta } from "../copy/terms.ts";
import { useLanguage } from "../hooks/useLanguage.ts";
import { BilingualText } from "./BilingualText.tsx";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";

type Props = {
  onClose: () => void;
};

export function TermsModal({ onClose }: Props) {
  const { language, t } = useLanguage();
  const paragraphs = language === "sr" ? termsParagraphsSr : termsParagraphsEn;

  return (
    <Modal onClose={onClose} labelledBy="terms-title">
      <BilingualText pair={copy.termsTitle} as="h2" className="modal-title" />
      <p id="terms-title" className="visually-hidden">
        {t(copy.termsTitle)}
      </p>
      <p className="terms-version">v{termsMeta.termsVersion}</p>
      <div className="terms-body" lang={language}>
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Button onClick={onClose}>{t(copy.close)}</Button>
    </Modal>
  );
}
