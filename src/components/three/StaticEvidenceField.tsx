/**
 * Static evidence field — the reduced-motion / no-WebGL / weak-device
 * stand-in for the WebGL HeroField. Same coral-ledger-with-rare-evidence
 * grammar (Phase H1 palette convergence), rendered as tiled CSS gradients
 * with zero animation.
 *
 * `prefers-reduced-motion` users get the brand atmosphere — still. No JS
 * cost, no GPU cost, nothing to gate: it is a painted background.
 */
export const StaticEvidenceField: React.FC = () => {
  return <div aria-hidden className="evidence-field-static absolute inset-0" />
}

export default StaticEvidenceField
