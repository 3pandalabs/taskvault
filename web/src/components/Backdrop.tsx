// Full-page three-blob backdrop + dot grid, from brand/background/tokens.css
// (emerald / amber / teal). Softer in dark mode so text stays calm.
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-[rgba(52,211,153,0.28)] blur-[80px] dark:bg-[rgba(52,211,153,0.08)]" />
      <div className="absolute -top-24 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[rgba(252,211,77,0.3)] blur-[80px] dark:bg-[rgba(252,211,77,0.05)]" />
      <div className="absolute bottom-[-14rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-[rgba(110,231,183,0.24)] blur-[80px] dark:bg-[rgba(110,231,183,0.06)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--fg) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
