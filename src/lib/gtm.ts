declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Pushes an event onto the GTM data layer. No-ops if the GTM snippet hasn't loaded yet. */
export function pushToDataLayer(event: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}
