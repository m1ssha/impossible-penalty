type LegacyElement = HTMLElement & { webkitRequestFullscreen?: () => void | Promise<void> };
type LegacyDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void | Promise<void>;
};
export function activeFullscreenElement(): Element | null {
  return document.fullscreenElement ?? (document as LegacyDocument).webkitFullscreenElement ?? null;
}
/** null means this browser needs the expanded-view fallback (notably iPhone Safari). */
export function enterFullscreen(element: HTMLElement): Promise<void> | null {
  if (element.requestFullscreen) return element.requestFullscreen();
  const legacy = element as LegacyElement;
  if (legacy.webkitRequestFullscreen) return Promise.resolve(legacy.webkitRequestFullscreen());
  return null;
}
export function leaveFullscreen(): Promise<void> {
  if (document.exitFullscreen) return document.exitFullscreen();
  const legacy = document as LegacyDocument;
  return Promise.resolve(legacy.webkitExitFullscreen?.());
}
