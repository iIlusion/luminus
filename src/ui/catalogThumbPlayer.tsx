import * as React from "react";
import {
  loadCatalogThumb,
  type CatalogThumbUnavailable,
  type LoadedCatalogThumb,
} from "./catalogThumbAssets";
import {
  frameIndexAtTick,
  type CatalogThumbKind,
  type CatalogThumbPlane,
} from "./catalogThumbManifest";
import {
  enqueueCatalogThumbLoad,
  prioritizeCatalogThumbLoad,
} from "./catalogThumbLoadQueue";
import {
  catalogThumbFit,
  catalogThumbStillFrame,
} from "./catalogThumbPresentation";

type ClockListener = (now: number) => void;

const clockListeners = new Set<ClockListener>();
let clockRaf = 0;

function runClock(now: number): void {
  for (const listener of clockListeners) listener(now);
  clockRaf = clockListeners.size > 0 ? requestAnimationFrame(runClock) : 0;
}

function subscribeClock(listener: ClockListener): () => void {
  clockListeners.add(listener);
  if (!clockRaf) clockRaf = requestAnimationFrame(runClock);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockRaf) {
      cancelAnimationFrame(clockRaf);
      clockRaf = 0;
    }
  };
}

export type CatalogThumbLoadState =
  | { status: "idle" | "loading" }
  | { status: "ready"; resource: LoadedCatalogThumb }
  | { status: "unavailable"; reason: CatalogThumbUnavailable["reason"] }
  | { status: "error"; message: string };

export function useCatalogThumbResource(
  kind: CatalogThumbKind,
  id: number,
  visible: boolean,
  retryToken: number,
): CatalogThumbLoadState {
  const [state, setState] = React.useState<CatalogThumbLoadState>({ status: "idle" });
  const requestKey = React.useId();

  React.useEffect(() => {
    prioritizeCatalogThumbLoad(requestKey, visible);
  }, [requestKey, visible]);

  React.useEffect(() => {
    if (id <= 0) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    let resource: LoadedCatalogThumb | null = null;
    setState({ status: "loading" });

    void enqueueCatalogThumbLoad(
      requestKey,
      visible ? 1 : 0,
      () => loadCatalogThumb(kind, id, controller.signal),
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      if (result.status === "unavailable") {
        setState({ status: "unavailable", reason: result.reason });
        return;
      }
      resource = result;
      setState({ status: "ready", resource: result });
    }).catch((error) => {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Falha ao carregar thumbnail",
      });
    });

    return () => {
      controller.abort();
      resource?.release();
    };
  }, [kind, id, requestKey, retryToken]);

  return state;
}

function planeStyle(
  plane: CatalogThumbPlane,
  resource: LoadedCatalogThumb,
  fit: number,
): React.CSSProperties {
  const atlas = resource.entry.atlases[plane.atlas];
  const [x, y, width, height] = plane.rect;
  return {
    left: `${plane.at[0] * fit}px`,
    top: `${plane.at[1] * fit}px`,
    width: `${width * fit}px`,
    height: `${height * fit}px`,
    backgroundImage: `url("${resource.atlasUrls[plane.atlas]}")`,
    backgroundPosition: `${-x * fit}px ${-y * fit}px`,
    backgroundSize: `${atlas.size[0] * fit}px ${atlas.size[1] * fit}px`,
    // Nearest-neighbour sampling at a fractional reduction drops uneven rows
    // and columns, which visibly deforms the avatar. Keep native-size sprites
    // crisp, but let Chromium resample scenes that must shrink to fit the card.
    imageRendering: fit < 1 ? "auto" : "pixelated",
    mixBlendMode: plane.blend === "add" ? "plus-lighter" : "normal",
  };
}

export function CatalogThumbStage({
  resource,
  playing,
  kind,
  id,
}: {
  resource: LoadedCatalogThumb;
  playing: boolean;
  kind: CatalogThumbKind;
  id: number;
}) {
  const { entry } = resource;
  // Playback only starts from an explicit hover/focus interaction. It is safe
  // to honor that request even when the OS disables unsolicited motion.
  const shouldPlay = playing && entry.frames.length > 1;
  const stillFrame = catalogThumbStillFrame(kind, id, entry.idleFrame, entry.frames.length);
  const [frameIndex, setFrameIndex] = React.useState(stillFrame);
  const startedAt = React.useRef(0);

  React.useEffect(() => {
    setFrameIndex(stillFrame);
  }, [entry, stillFrame]);

  React.useEffect(() => {
    if (!shouldPlay) {
      setFrameIndex(stillFrame);
      return;
    }
    startedAt.current = performance.now();
    setFrameIndex(0);
    return subscribeClock((now) => {
      const elapsedTicks = Math.floor((now - startedAt.current) / 41);
      const nextFrame = frameIndexAtTick(entry, elapsedTicks);
      setFrameIndex((current) => current === nextFrame ? current : nextFrame);
    });
  }, [entry, shouldPlay, stillFrame]);

  const frame = entry.frames[frameIndex] ?? entry.frames[stillFrame] ?? entry.frames[0];
  const [canvasWidth, canvasHeight] = entry.canvas;
  const fit = catalogThumbFit(kind, id, entry.canvas);
  const left = `calc(50% - ${entry.anchor[0] * fit}px)`;
  const top = `calc(100% - 12px - ${entry.anchor[1] * fit}px)`;

  return (
    <div
      className="lm-eh-thumb-stage"
      style={{
        width: `${canvasWidth * fit}px`,
        height: `${canvasHeight * fit}px`,
        left,
        top,
      }}
      aria-hidden="true"
    >
      {frame.planes.map((plane, index) => (
        <span
          key={`${frameIndex}-${index}`}
          className="lm-eh-thumb-plane"
          style={planeStyle(plane, resource, fit)}
        />
      ))}
    </div>
  );
}
