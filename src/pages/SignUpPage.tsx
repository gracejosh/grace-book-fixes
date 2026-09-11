import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleIcon from "../components/GoogleIcon";
import FacebookIcon from "../components/FacebookIcon";
import { BookOpen, Mail, Lock, User, AtSign, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const { signUp, signInWithGoogle, signInWithFacebook } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signUp({ email, password, username, fullName });
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
        <p className="auth-subtitle">Create your account to get started</p>

        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <div className="input-wrap">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  className="form-input has-icon"
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div className="input-wrap">
                <AtSign size={18} className="input-icon" />
                <input
                  id="username"
                  className="form-input has-icon"
                  type="text"
                  placeholder="janedoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="auth-divider">or sign up with</div>

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
          Already have an account?{" "}
          <Link to="/signin" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
