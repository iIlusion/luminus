import type * as React from "react";

import type { LuminusApi } from "../ws/api";
import type { PanelCategory, PanelSearchEntry } from "./panelNavigation";

export type PanelNavigate = (target: string, focus?: string) => void;

export type PanelExtensionViewProps = {
  api: LuminusApi;
  navigate: PanelNavigate;
};

export type PanelExtensionView = {
  id: string;
  label: string;
  summary: string;
  icon: React.ReactNode;
  parent?: string;
  gridShell?: boolean;
  component: React.ComponentType<PanelExtensionViewProps>;
};

/** Declarative additions rendered inside the Luminus panel shell. */
export type PanelExtension = {
  categories?: readonly PanelCategory[];
  entries?: readonly PanelSearchEntry[];
  views: readonly PanelExtensionView[];
  styles?: string;
  launcherStatus?: React.ComponentType<{ api: LuminusApi }>;
};
