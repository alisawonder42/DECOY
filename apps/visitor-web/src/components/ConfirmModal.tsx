import { copy } from "../copy/index.ts";
import { BilingualText } from "./BilingualText.tsx";
import { Button } from "./Button.tsx";
import { Modal } from "./Modal.tsx";

type Props = {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({ pending, onCancel, onConfirm }: Props) {
  return (
    <Modal onClose={pending ? () => undefined : onCancel} labelledBy="confirm-title">
      <BilingualText pair={copy.confirmTitle} as="h2" className="modal-title" />
      <p id="confirm-title" className="visually-hidden">
        {copy.confirmTitle.sr} / {copy.confirmTitle.en}
      </p>
      <BilingualText pair={copy.confirmBody} />
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {copy.back.sr} / {copy.back.en}
        </Button>
        <Button onClick={onConfirm} disabled={pending} aria-busy={pending}>
          {copy.confirmSubmit.sr} / {copy.confirmSubmit.en}
        </Button>
      </div>
    </Modal>
  );
}
