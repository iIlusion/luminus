import * as React from "react";
import {
  ArrowRight,
  Bug,
  Check,
  ChevronDown,
  ImageOff,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type { ChangelogLayer, ChangelogVisual } from "../changelog";
import { LUMINUS_VERSION } from "../version";

interface Props {
  /** Uma ou mais entradas de novidades (a build define quantas). */
  layers: readonly ChangelogLayer[];
  onClose: () => void;
}

type SectionTone = "new" | "improved" | "fixed";

function getSectionTone(title: string): SectionTone {
  const normalized = title.trim().toLocaleLowerCase("pt-BR");
  if (normalized.startsWith("novo")) return "new";
  if (normalized.startsWith("corrig")) return "fixed";
  return "improved";
}

function SectionIcon({ tone }: { tone: SectionTone }) {
  if (tone === "new") return <Plus aria-hidden="true" />;
  if (tone === "fixed") return <Bug aria-hidden="true" />;
  return <WandSparkles aria-hidden="true" />;
}

function isSafeImageSource(src: string): boolean {
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

function ChangelogImage({ visual }: { visual: Extract<ChangelogVisual, { kind: "image" }> }) {
  const [failed, setFailed] = React.useState(false);
  const unavailable = failed || !isSafeImageSource(visual.src);

  return (
    <figure className={`lm-changelog-visual lm-changelog-image${unavailable ? " is-unavailable" : ""}`}>
      {unavailable ? (
        <div className="lm-changelog-image-fallback" role="img" aria-label={visual.alt}>
          <ImageOff aria-hidden="true" />
          <span>Prévia indisponível</span>
        </div>
      ) : (
        <img
          src={visual.src}
          alt={visual.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      {visual.caption && <figcaption>{visual.caption}</figcaption>}
    </figure>
  );
}

function ChangelogVisualContent({ visual }: { visual: ChangelogVisual }) {
  if (visual.kind === "image") return <ChangelogImage visual={visual} />;

  if (visual.kind === "comparison") {
    return (
      <figure className="lm-changelog-visual lm-changelog-comparison">
        <div className="lm-changelog-compare-frame">
          <span>{visual.before.label}</span>
          <strong>{visual.before.title}</strong>
          {visual.before.description && <p>{visual.before.description}</p>}
        </div>
        <ArrowRight className="lm-changelog-compare-arrow" aria-hidden="true" />
        <div className="lm-changelog-compare-frame is-after">
          <span>{visual.after.label}</span>
          <strong>{visual.after.title}</strong>
          {visual.after.description && <p>{visual.after.description}</p>}
        </div>
        {visual.caption && <figcaption>{visual.caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="lm-changelog-visual lm-changelog-demo">
      <div className="lm-changelog-demo-head">
        <span className="lm-changelog-demo-signal" aria-hidden="true" />
        <div>
          <strong>{visual.title}</strong>
          {visual.description && <p>{visual.description}</p>}
        </div>
      </div>
      {!!visual.badges?.length && (
        <div className="lm-changelog-demo-badges">
          {visual.badges.map(badge => <span key={badge}>{badge}</span>)}
        </div>
      )}
      {!!visual.rows?.length && (
        <dl className="lm-changelog-demo-rows">
          {visual.rows.map(row => (
            <div key={`${row.label}-${row.value}`}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {visual.action && <span className="lm-changelog-demo-action">{visual.action}</span>}
      {visual.caption && <figcaption>{visual.caption}</figcaption>}
    </figure>
  );
}

export function ChangelogModal({ layers, onClose }: Props) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const primary = layers[0];
  const multi = layers.length > 1;

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  if (!primary) return null;

  const title = multi ? "Novidades" : primary.title;
  const summary = multi
    ? layers.map(l => l.summary).filter(Boolean).join(" ")
    : primary.summary;
  const publishedAt = layers.map(l => l.publishedAt).find(Boolean) ?? primary.publishedAt;

  return (
    <dialog
      id="luminus-changelog"
      ref={dialogRef}
      aria-labelledby="luminus-changelog-title"
      aria-describedby="luminus-changelog-summary"
      onClose={onClose}
    >
      <header className="lm-changelog-header">
        <button
          type="button"
          className="lm-changelog-close"
          aria-label="Fechar changelog"
          onClick={() => dialogRef.current?.close()}
        >
          <X aria-hidden="true" />
        </button>
        <h2 id="luminus-changelog-title">
          <Sparkles aria-hidden="true" />
          <span>{title}</span>
        </h2>
        <p id="luminus-changelog-summary">{summary}</p>
        <div className="lm-changelog-meta">
          <span>{publishedAt}</span>
          <span>v{LUMINUS_VERSION}</span>
        </div>
      </header>

      <div className="lm-changelog-body">
        {layers.map(layer => (
          <div className="lm-changelog-layer" key={layer.id}>
            {multi && (
              <header className="lm-changelog-layer-head">
                <h3 className="lm-changelog-layer-label">{layer.label}</h3>
                <span className="lm-changelog-layer-ver">v{layer.version}</span>
              </header>
            )}
            {layer.sections.map(section => {
              const tone = getSectionTone(section.title);
              return (
                <section
                  className={`lm-changelog-section is-${tone}`}
                  key={`${layer.id}-${section.title}`}
                >
                  <h3><span>{section.title}</span></h3>
                  <div className="lm-changelog-list">
                    {section.items.map(item => (
                      <article
                        className="lm-changelog-item"
                        key={`${layer.id}-${section.title}-${item.title}`}
                      >
                        <span className="lm-changelog-marker">
                          <SectionIcon tone={tone} />
                        </span>
                        <div className="lm-changelog-item-content">
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                          {item.visual && <ChangelogVisualContent visual={item.visual} />}
                          {!!item.details?.length && (
                            <details className="lm-changelog-details">
                              <summary>
                                <span>Ver detalhes</span>
                                <ChevronDown aria-hidden="true" />
                              </summary>
                              <ul>
                                {item.details.map(detail => (
                                  <li key={detail}>
                                    <Check aria-hidden="true" />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="lm-changelog-footer">
        <span>Este aviso só volta quando houver novidades.</span>
        <button type="button" autoFocus onClick={() => dialogRef.current?.close()}>
          Entendi
        </button>
      </footer>
    </dialog>
  );
}
