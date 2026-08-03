import * as React from "react";
import { Check, Sparkles, X } from "lucide-react";
import type { ChangelogLayer } from "../changelog";
import { LUMINUS_VERSION } from "../version";

interface Props {
  /** Uma ou mais entradas de novidades (a build define quantas). */
  layers: readonly ChangelogLayer[];
  onClose: () => void;
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
        <div className="lm-changelog-eyebrow">
          <Sparkles aria-hidden="true" />
          Novidades do Luminus
        </div>
        <button
          type="button"
          className="lm-changelog-close"
          aria-label="Fechar changelog"
          onClick={() => dialogRef.current?.close()}
        >
          <X aria-hidden="true" />
        </button>
        <h2 id="luminus-changelog-title">{title}</h2>
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
            {layer.sections.map(section => (
              <section key={`${layer.id}-${section.title}`}>
                <h3>{section.title}</h3>
                <div className="lm-changelog-list">
                  {section.items.map(item => (
                    <article className="lm-changelog-item" key={`${layer.id}-${item.title}`}>
                      <span className="lm-changelog-marker">
                        <Check aria-hidden="true" />
                      </span>
                      <div>
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
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
