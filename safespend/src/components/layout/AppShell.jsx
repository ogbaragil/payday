import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";

export default function AppShell() {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md bg-bg">
      <main className="safe-top px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
