export interface GroupWhisperRoute {
  id: number;
  members: string[];
}

let pendingRoute: GroupWhisperRoute | null = null;
let nextRouteId = 1;

export function withGroupWhisperRoute(members: string[], send: () => boolean): boolean {
  pendingRoute = { id: nextRouteId++, members: [...members] };
  try {
    return send();
  } finally {
    pendingRoute = null;
  }
}

export function consumeGroupWhisperRoute(): GroupWhisperRoute | null {
  return pendingRoute ? { id: pendingRoute.id, members: [...pendingRoute.members] } : null;
}
