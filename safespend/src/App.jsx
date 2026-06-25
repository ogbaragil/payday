import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import Home from "./screens/Home.jsx";
import Timeline from "./screens/Timeline.jsx";
import Plan from "./screens/Plan.jsx";
import Scenario from "./screens/Scenario.jsx";
import Settings from "./screens/Settings.jsx";

function Splash() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-iris">
          <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
            <path d="M24 9 13 13V25C13 32.5 18 37 24 39 30 37 35 32.5 35 25V13L24 9Z" fill="#ffffff" fill-opacity="0.18" />
            <path d="M19.5 24.2 22.7 27.6 29 20.5" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-display text-[15px] font-bold tracking-tight text-muted">
          SafeSpend
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, onboarded } = useApp();

  if (loading) return <Splash />;
  if (!onboarded) return <Onboarding />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/scenario" element={<Scenario />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
