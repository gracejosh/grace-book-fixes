import GoogleIcon from "./components/GoogleIcon";
import FacebookIcon from "./components/FacebookIcon";

export default function App() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Sign in</h1>
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        <span style={{ width: 20, height: 20 }}>
          <GoogleIcon />
        </span>
        Continue with Google
      </button>
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        <span style={{ width: 20, height: 20 }}>
          <FacebookIcon />
        </span>
        Continue with Facebook
      </button>
    </main>
  );
}
