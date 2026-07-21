import * as React from "react";
import { Check, Sparkles, X } from "lucide-react";
import type { Changelog } from "../changelog";
import { LUMINUS_VERSION } from "../version";

interface Props {
  changelog: Changelog;
  onClose: () => void;
}

export function ChangelogModal({ changelog, onClose }: Props) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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
        <h2 id="luminus-changelog-title">{changelog.title}</h2>
        <p id="luminus-changelog-summary">{changelog.summary}</p>
        <div className="lm-changelog-meta">
          <span>{changelog.publishedAt}</span>
          <span>v{LUMINUS_VERSION}</span>
        </div>
      </header>

      <div className="lm-changelog-body">
        {changelog.sections.map(section => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <div className="lm-changelog-list">
              {section.items.map(item => (
                <article className="lm-changelog-item" key={item.title}>
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

      <footer className="lm-changelog-footer">
        <span>Este aviso só volta quando houver novidades.</span>
        <button type="button" autoFocus onClick={() => dialogRef.current?.close()}>
          Entendi
        </button>
      </footer>
    </dialog>
  );
}
