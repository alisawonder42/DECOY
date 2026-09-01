import { copy } from "../copy/index.ts";
import { useLanguage } from "../hooks/useLanguage.ts";
import { BilingualText } from "./BilingualText.tsx";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";

type Props = {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ pending, onCancel, onConfirm }: Props) {
  const { t } = useLanguage();
  return (
    <Modal onClose={pending ? () => undefined : onCancel} labelledBy="confirm-title">
      <BilingualText pair={copy.confirmTitle} as="h2" className="modal-title" />
      <p id="confirm-title" className="visually-hidden">
        {t(copy.confirmTitle)}
      </p>
      <BilingualText pair={copy.confirmBody} />
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t(copy.back)}
        </Button>
        <Button onClick={onConfirm} disabled={pending} aria-busy={pending}>
          {t(copy.confirmSubmit)}
        </Button>
      </div>
    </Modal>
  );
}
