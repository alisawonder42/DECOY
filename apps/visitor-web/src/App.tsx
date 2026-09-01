import { ConfirmModal } from "./components/ConfirmModal.tsx";
import { LanguageSwitcher } from "./components/LanguageSwitcher.tsx";
import { TermsModal } from "./components/TermsModal.tsx";
import { useParticipantFlow } from "./hooks/useParticipantFlow.ts";
import { CapacityScreen } from "./screens/CapacityScreen.tsx";
import { CompleteScreen } from "./screens/CompleteScreen.tsx";
import { DescribeScreen } from "./screens/DescribeScreen.tsx";
import { IntroScreen } from "./screens/IntroScreen.tsx";
import { LocationErrorScreen } from "./screens/LocationErrorScreen.tsx";

export function App() {
  const flow = useParticipantFlow();

  return (
    <main className="app">
      <LanguageSwitcher />
      {flow.screen === "booting" ? <section className="screen" aria-busy="true" /> : null}
      {flow.screen === "intro" ? (
        <IntroScreen
          accepted={flow.accepted}
          pending={flow.pending}
          onAcceptedChange={flow.setAccepted}
          onOpenTerms={() => flow.setTermsOpen(true)}
          onContinue={() => void flow.continueFromIntro()}
        />
      ) : null}
      {flow.screen === "describe" ? (
        <DescribeScreen
          value={flow.description}
          error={flow.describeError}
          disabled={flow.pending}
          onChange={flow.setDescription}
          onSubmit={flow.requestSubmit}
        />
      ) : null}
      {flow.screen === "complete" ? <CompleteScreen /> : null}
      {flow.screen === "capacity" ? <CapacityScreen /> : null}
      {flow.screen === "location-denied" ? (
        <LocationErrorScreen kind="denied" pending={flow.pending} onRetry={() => void flow.runLocation()} />
      ) : null}
      {flow.screen === "location-outside" ? (
        <LocationErrorScreen kind="outside" pending={flow.pending} onRetry={() => void flow.runLocation()} />
      ) : null}
      {flow.screen === "location-inaccurate" ? (
        <LocationErrorScreen
          kind="inaccurate"
          pending={flow.pending}
          onRetry={() => void flow.runLocation()}
        />
      ) : null}
      {flow.termsOpen ? <TermsModal onClose={() => flow.setTermsOpen(false)} /> : null}
      {flow.confirmOpen ? (
        <ConfirmModal
          pending={flow.pending}
          onCancel={() => flow.setConfirmOpen(false)}
          onConfirm={() => void flow.confirmSubmit()}
        />
      ) : null}
    </main>
  );
}
