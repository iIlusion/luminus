import * as React from "react";
import * as Switch from "@radix-ui/react-switch";
import { ChevronDown } from "lucide-react";

import {
  getPeerAnnounceEnabled,
  getPeerIconsEnabled,
  setPeerAnnounceEnabled,
  setPeerIconsEnabled,
  subscribePeerIdentifySettings,
} from "../room/peerIdentifySettings";

export function PeerIconsOption(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [iconsEnabled, setIconsEnabledState] = React.useState(getPeerIconsEnabled);
  const [announceEnabled, setAnnounceEnabledState] = React.useState(getPeerAnnounceEnabled);
  const contentId = React.useId();

  React.useEffect(() => subscribePeerIdentifySettings(() => {
    setIconsEnabledState(getPeerIconsEnabled());
    setAnnounceEnabledState(getPeerAnnounceEnabled());
  }), []);

  return (
    <div className={`lm-option-group${open ? " is-open" : ""}`}>
      <div className="lm-row lm-option-parent">
        <button
          type="button"
          className="lm-option-expander"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(value => !value)}
        >
          <span className="lm-label">
            <span className="lm-option-heading">
              Mostrar ícones de extensões em cima dos avatares
              <span className="lm-option-more">
                Privacidade <ChevronDown aria-hidden="true" />
              </span>
            </span>
            <span className="lm-sub">Identifica no quarto os avatares com presença compatível.</span>
          </span>
        </button>
        <Switch.Root
          className="lm-switch-root"
          checked={iconsEnabled}
          onCheckedChange={setPeerIconsEnabled}
        >
          <Switch.Thumb className="lm-switch-thumb" />
        </Switch.Root>
      </div>
      {open && (
        <div className="lm-option-children" id={contentId}>
          <div className="lm-row lm-row-sub">
            <span className="lm-label">
              Não se identificar, mas escutar os outros usuários
              <span className="lm-sub">Detecta presenças sem enviar identificação ou confirmação.</span>
            </span>
            <Switch.Root
              className="lm-switch-root"
              checked={!announceEnabled}
              disabled={!iconsEnabled}
              onCheckedChange={passive => setPeerAnnounceEnabled(!passive)}
            >
              <Switch.Thumb className="lm-switch-thumb" />
            </Switch.Root>
          </div>
        </div>
      )}
    </div>
  );
}
