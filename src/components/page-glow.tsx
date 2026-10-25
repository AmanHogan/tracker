/**
 * A faint, fixed radial glow tinted with the primary color, blurred and
 * pinned to the top-right corner — a "spotlight behind the content" trick.
 * Purely decorative and pointer-events-none so it never intercepts clicks;
 * renders once per dashboard page load.
 */
export function PageGlow() {
  return (
    <div
      aria-hidden
      className="page-glow pointer-events-none fixed -top-32 right-[-10%] -z-10 h-[480px] w-[480px] rounded-full blur-[120px]"
    />
  );
}
