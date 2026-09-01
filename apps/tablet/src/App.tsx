import { useTabletRuntime } from "./hooks/useTabletRuntime.ts";
import { DisplayScreen } from "./screens/DisplayScreen.tsx";
import { MaintenanceScreen } from "./screens/MaintenanceScreen.tsx";
import { PinScreen } from "./screens/PinScreen.tsx";
import { ProvisionScreen } from "./screens/ProvisionScreen.tsx";

export function App() {
  const runtime = useTabletRuntime();

  if (!runtime.ready) {
    return <section className="stage" />;
  }

  if (!runtime.provisioning) {
    return <ProvisionScreen onSave={runtime.saveProvisioning} />;
  }

  return (
    <>
      <DisplayScreen
        current={runtime.current}
        incoming={runtime.incoming}
        onCornerTap={runtime.registerCornerTap}
      />
      {runtime.pinChallenge && !runtime.maintenanceOpen ? (
        <PinScreen
          expectedPin={runtime.provisioning.adminPin}
          onSuccess={() => {
            runtime.setPinChallenge(false);
            runtime.setMaintenanceOpen(true);
          }}
          onCancel={() => runtime.setPinChallenge(false)}
        />
      ) : null}
      {runtime.maintenanceOpen ? (
        <MaintenanceScreen
          provisioning={runtime.provisioning}
          internalState={runtime.internalState}
          backendStatus={runtime.backendStatus}
          realtimeStatus={runtime.realtimeStatus}
          lastHeartbeat={runtime.lastHeartbeat}
          lastError={runtime.lastError}
          lastDisplayTime={runtime.lastDisplayTime}
          current={runtime.current}
          onReconnect={() => void runtime.reconnect()}
          onRefresh={() => void runtime.refreshState()}
          onClearCache={() => void runtime.clearCache()}
          onRestart={runtime.restartState}
          onClose={() => runtime.setMaintenanceOpen(false)}
        />
      ) : null}
    </>
  );
}
