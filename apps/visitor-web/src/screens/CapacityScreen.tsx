import { copy } from "../copy/index.ts";
import { BilingualText } from "../components/BilingualText.tsx";

export function CapacityScreen() {
  return (
    <section className="screen">
      <BilingualText pair={copy.capacity} as="h1" className="title" />
    </section>
  );
}
