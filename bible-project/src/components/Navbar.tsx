import type { MouseEvent } from "react";

interface NavbarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function Navbar({
  currentPath = typeof window !== "undefined" ? window.location.pathname : "/",
  onNavigate,
}: NavbarProps) {
  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    onNavigate(path);
  };

  return (
    <>
      <style>{`
        .site-navbar {
          position: sticky;
          top: 0;
          z-index: 20;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(20, 13, 39, 0.9);
          backdrop-filter: blur(18px);
        }

        .site-navbar__inner {
          width: min(1180px, calc(100% - 32px));
          min-height: 68px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .site-navbar__brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: #fff9ec;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 0.01em;
          text-decoration: none;
          white-space: nowrap;
        }

        .site-navbar__mark {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(245, 193, 78, 0.65);
          border-radius: 10px;
          color: #f5c14e;
          background: rgba(245, 193, 78, 0.12);
          font-size: 1.05rem;
        }

        .site-navbar__links {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .site-navbar__link {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 9px;
          color: #c8bfdc;
          font-size: 0.92rem;
          font-weight: 650;
          text-decoration: none;
          transition: color 160ms ease, background 160ms ease;
        }

        .site-navbar__link:hover,
        .site-navbar__link[aria-current="page"] {
          color: #fff9ec;
          background: rgba(245, 193, 78, 0.13);
        }

        @media (max-width: 540px) {
          .site-navbar__inner {
            width: min(100% - 20px, 1180px);
            min-height: 60px;
          }

          .site-navbar__brand span:last-child {
            display: none;
          }

          .site-navbar__link {
            padding: 0 10px;
          }
        }
      `}</style>

      <header className="site-navbar">
        <div className="site-navbar__inner">
          <a
            className="site-navbar__brand"
            href="/"
            onClick={(event) => handleNavigation(event, "/")}
            aria-label="Home"
          >
            <span className="site-navbar__mark" aria-hidden="true">
              ✦
            </span>
            <span>Scripture</span>
          </a>

          <nav aria-label="Primary navigation">
            <ul className="site-navbar__links">
              <li>
                <a
                  className="site-navbar__link"
                  href="/"
                  onClick={(event) => handleNavigation(event, "/")}
                  aria-current={currentPath === "/" ? "page" : undefined}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  className="site-navbar__link"
                  href="/bible"
                  onClick={(event) => handleNavigation(event, "/bible")}
                  aria-current={currentPath === "/bible" ? "page" : undefined}
                >
                  Bible
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}