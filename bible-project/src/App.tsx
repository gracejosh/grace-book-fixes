import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Bible from "./pages/Bible";

function NotFound() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "calc(100vh - 68px)",
        placeItems: "center",
        padding: 24,
        color: "#f8f3ff",
        background: "#100b1d",
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ color: "#f5c14e", fontWeight: 800 }}>PAGE NOT FOUND</p>
        <h1 style={{ margin: "12px 0", fontSize: "2.25rem" }}>This page has moved.</h1>
        <a href="/bible" style={{ color: "#f5c14e" }}>
          Open the Bible
        </a>
      </div>
    </main>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname,
  );

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, "", path);
    setPathname(path);
  };

  return (
    <>
      <Navbar currentPath={pathname} onNavigate={navigate} />
      {pathname === "/bible" ? <Bible /> : <NotFound />}
    </>
  );
}