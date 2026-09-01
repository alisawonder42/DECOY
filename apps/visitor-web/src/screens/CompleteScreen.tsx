import { copy } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";

export function CompleteScreen() {
  return (
    <section className="screen screen-complete">
      <BilingualText pair={copy.thanksTitle} as="h1" className="title" />
      <BilingualText pair={copy.thanksBody1} />
      <BilingualText pair={copy.thanksBody2} className="muted" />
    </section>
  );
}
