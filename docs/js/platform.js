/*
 * Which modifier key to name in the interface.
 *
 * The carve gesture is bound to ctrl, alt/option, cmd and the right button all
 * at once (see the modifier readers in cells.js, diagram.js and render3d.js), so
 * every platform has something that works. What differs is which one to *tell*
 * the reader about:
 *
 *   macOS   — ctrl-click IS the secondary click, so it never arrives as a
 *             ctrl-click at all. Name option instead.
 *   others  — ctrl-click is the ordinary convention and is unambiguous there.
 *
 * Call labelKeys() after the DOM is up; it rewrites every <kbd class="kSub">.
 */

const ua = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || '';
export const isMac = /Mac|iPhone|iPad|iPod/i.test(ua);

/** what to print for the carve modifier on this machine */
export const subKey = isMac ? '⌥ option' : 'ctrl';

export function labelKeys(root = document) {
  for (const k of root.querySelectorAll('.kSub')) k.textContent = subKey;
}
