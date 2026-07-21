// Add new domains here as they come up.
export const KNOWN_LINK_DOMAINS = [
  "zyo.se", "aylo.me", "lookto.me", "avely.me", "ay.so",
  "vsco.co", "rvlo.vc", "mwa.bio", "nnbio.wtf", "guns.lol",
];

export interface MottoLink {
  text: string;
  start: number;
  end: number;
}

// Motto is considered a link if it CONTAINS one of the known domains anywhere.
// The matched substring runs from the domain to the next whitespace, keeping any path/slug.
// start/end let the caller replace just that substring instead of the whole motto.
export function findLinkInMotto(motto: string): MottoLink | null {
  const lower = motto.toLowerCase();
  for (const domain of KNOWN_LINK_DOMAINS) {
    const idx = lower.indexOf(domain);
    if (idx === -1) continue;
    const text = motto.slice(idx).match(/^\S+/)?.[0] ?? domain;
    return { text, start: idx, end: idx + text.length };
  }
  return null;
}

export function toUrl(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}
