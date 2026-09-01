import { IMAGE_FIT } from "../lib/config.ts";
import type { DisplayFrame } from "../hooks/useTabletRuntime.ts";

type Props = {
  current: DisplayFrame | null;
  incoming: DisplayFrame | null;
  onCornerTap: () => void;
};

export function DisplayScreen({ current, incoming, onCornerTap }: Props) {
  return (
    <section className="stage" aria-label="Artwork">
      <button type="button" className="secret-hit" onClick={onCornerTap} aria-hidden="true" />
      {current ? (
        <img
          className={`artwork visible fit-${IMAGE_FIT}`}
          src={current.uri}
          alt=""
        />
      ) : null}
      {incoming ? (
        <img
          className={`artwork incoming visible fit-${IMAGE_FIT}`}
          src={incoming.uri}
          alt=""
        />
      ) : null}
    </section>
  );
}
