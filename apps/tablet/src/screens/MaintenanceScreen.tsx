import { APP_VERSION } from "../lib/config.ts";
import type { DisplayFrame, InternalState } from "../hooks/useTabletRuntime.ts";
import type { Provisioning } from "../lib/credentials.ts";

type Props = {
  provisioning: Provisioning;
  internalState: InternalState;
  backendStatus: string;
  realtimeStatus: string;
  lastHeartbeat: string | null;
  lastError: string | null;
  lastDisplayTime: string | null;
  current: DisplayFrame | null;
  onReconnect: () => void;
  onRefresh: () => void;
  onClearCache: () => void;
  onRestart: () => void;
  onClose: () => void;
};

export function MaintenanceScreen({
  provisioning,
  internalState,
  backendStatus,
  realtimeStatus,
  lastHeartbeat,
  lastError,
  lastDisplayTime,
  current,
  onReconnect,
  onRefresh,
  onClearCache,
  onRestart,
  onClose,
}: Props) {
  return (
    <section className="staff maintenance">
      <h1>Maintenance</h1>
      <dl>
        <dt>Tablet ID</dt>
        <dd>{provisioning.tabletId}</dd>
        <dt>App version</dt>
        <dd>{APP_VERSION}</dd>
        <dt>Backend status</dt>
        <dd>{backendStatus}</dd>
        <dt>Last heartbeat</dt>
        <dd>{lastHeartbeat ?? "—"}</dd>
        <dt>Realtime status</dt>
        <dd>{realtimeStatus}</dd>
        <dt>Current submission ID</dt>
        <dd>{current?.submissionId ?? "—"}</dd>
        <dt>Current cached image</dt>
        <dd>{current ? "yes" : "no"}</dd>
        <dt>Last successful display time</dt>
        <dd>{lastDisplayTime ?? "—"}</dd>
        <dt>Current internal state</dt>
        <dd>{internalState}</dd>
        <dt>Last sanitized error code</dt>
        <dd>{lastError ?? "—"}</dd>
      </dl>
      <button type="button" onClick={onReconnect}>
        Reconnect
      </button>
      <button type="button" onClick={onRefresh}>
        Refresh state
      </button>
      <button type="button" onClick={onClearCache}>
        Clear local image cache
      </button>
      <button type="button" onClick={onRestart}>
        Restart app state
      </button>
      <button type="button" onClick={onClose}>
        Return to artwork
      </button>
    </section>
  );
}
