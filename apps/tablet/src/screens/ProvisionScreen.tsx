import { TABLET_IDS } from "@installation/shared";
import { isKnownTabletId } from "../lib/config.ts";
import type { Provisioning } from "../lib/credentials.ts";
import { useState } from "react";

type Props = {
  onSave: (value: Provisioning) => Promise<void>;
};

export function ProvisionScreen({ onSave }: Props) {
  const [tabletId, setTabletId] = useState("tablet-01");
  const [deviceToken, setDeviceToken] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="staff">
      <h1>Tablet provisioning</h1>
      <p>Staff only. Visitors should never see this screen.</p>
      <label>
        Tablet ID
        <select value={tabletId} onChange={(event) => setTabletId(event.target.value)}>
          {TABLET_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Device token
        <input
          value={deviceToken}
          onChange={(event) => setDeviceToken(event.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </label>
      <label>
        Admin PIN
        <input
          value={adminPin}
          onChange={(event) => setAdminPin(event.target.value)}
          inputMode="numeric"
        />
      </label>
      {error ? <p className="staff-error">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          if (!isKnownTabletId(tabletId) || deviceToken.trim().length < 16 || adminPin.trim().length < 4) {
            setError("Enter a valid tablet ID, token, and PIN.");
            return;
          }
          void onSave({
            tabletId,
            deviceToken: deviceToken.trim(),
            adminPin: adminPin.trim(),
          });
        }}
      >
        Save
      </button>
    </section>
  );
}
