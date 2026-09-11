import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setFacebookUrl(profile.facebook_url || "");
      setTelegramUrl(profile.telegram_url || "");
      setWhatsappNumber(profile.whatsapp_number || "");
      setTiktokUrl(profile.tiktok_url || "");
      setPhoneNumber(profile.phone_number || "");
      setWebsiteUrl(profile.website_url || "");
    }
  }, [profile]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username,
        facebook_url: facebookUrl || null,
        telegram_url: telegramUrl || null,
        whatsapp_number: whatsappNumber || null,
        tiktok_url: tiktokUrl || null,
        phone_number: phoneNumber || null,
        website_url: websiteUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user!.id);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : (username[0] || "U").toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <button className="btn-secondary" onClick={signOut}>
          Sign Out
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <div className="profile-avatar">{initials}</div>
          <div>
            <div className="profile-name">{fullName || username}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
        {success && (
          <div className="auth-success" style={{ marginBottom: 16 }}>
            Profile saved successfully.
          </div>
        )}

        <form className="auth-form" onSubmit={handleSave}>
          <h3 className="profile-section-title">Account</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <h3 className="profile-section-title" style={{ marginTop: 8 }}>
            Social Links (optional)
          </h3>

          <div className="form-group">
            <label className="form-label" htmlFor="facebookUrl">
              Facebook URL
            </label>
            <input
              id="facebookUrl"
              className="form-input"
              type="url"
              placeholder="https://facebook.com/yourname"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="telegramUrl">
              Telegram URL
            </label>
            <input
              id="telegramUrl"
              className="form-input"
              type="url"
              placeholder="https://t.me/yourname"
              value={telegramUrl}
              onChange={(e) => setTelegramUrl(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="whatsappNumber">
                WhatsApp Number
              </label>
              <input
                id="whatsappNumber"
                className="form-input"
                type="tel"
                placeholder="+1234567890"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                className="form-input"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tiktokUrl">
              TikTok URL
            </label>
            <input
              id="tiktokUrl"
              className="form-input"
              type="url"
              placeholder="https://tiktok.com/@yourname"
              value={tiktokUrl}
              onChange={(e) => setTiktokUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="websiteUrl">
              Website URL
            </label>
            <input
              id="websiteUrl"
              className="form-input"
              type="url"
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
