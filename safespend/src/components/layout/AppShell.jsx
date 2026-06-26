import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";

// The hand-drawn chalk wobble that every .chalk-card / .chalk-edge borrows.
// Kept once, off-screen, so the displacement filter is available app-wide.
function ChalkDefs() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <filter id="chalkRough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

export default function AppShell() {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md">
      <ChalkDefs />
      <main className="safe-top px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
