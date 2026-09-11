import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleIcon from "../components/GoogleIcon";
import FacebookIcon from "../components/FacebookIcon";
import { BookOpen, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signIn({ email, password });
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate("/profile");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading("google");
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setSocialLoading(null);
    }
  };

  const handleFacebook = async () => {
    setError(null);
    setSocialLoading("facebook");
    const { error } = await signInWithFacebook();
    if (error) {
      setError(error);
      setSocialLoading(null);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo-icon">
            <BookOpen size={28} />
          </div>
          <div className="auth-logo-text">Grace Book</div>
        </div>
        <p className="auth-subtitle">Welcome back — sign in to continue</p>

        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <div className="input-wrap">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                className="form-input has-icon"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-wrap">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                className="form-input has-icon"
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="forgot-link">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">or sign in with</div>

        <div className="social-buttons">
          <button
            className="btn-social"
            onClick={handleGoogle}
            disabled={socialLoading !== null}
          >
            <GoogleIcon />
            {socialLoading === "google" ? "Connecting..." : "Continue with Google"}
          </button>
          <button
            className="btn-social"
            onClick={handleFacebook}
            disabled={socialLoading !== null}
          >
            <FacebookIcon />
            {socialLoading === "facebook" ? "Connecting..." : "Continue with Facebook"}
          </button>
        </div>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
