import { useState } from "react";

type Props = {
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PinScreen({ expectedPin, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  return (
    <section className="staff">
      <h1>PIN</h1>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="numeric"
        autoFocus
      />
      {error ? <p className="staff-error">Incorrect PIN</p> : null}
      <button
        type="button"
        onClick={() => {
          if (value === expectedPin) {
            onSuccess();
          } else {
            setError(true);
          }
        }}
      >
        Unlock
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
