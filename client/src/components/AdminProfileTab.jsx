import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import { useTranslation } from "react-i18next";
import notyf from "../utils/notyf";

export default function AdminProfileTab({ user, setUser, onLogout }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  
  const [name, setName] = useState(user?.name || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordOtpStep, setPasswordOtpStep] = useState(false);
  const [passwordOtpCode, setPasswordOtpCode] = useState("");
  const [passwordResendCooldown, setPasswordResendCooldown] = useState(60);

  useEffect(() => {
    let timer;
    if (passwordOtpStep && passwordResendCooldown > 0) {
      timer = setInterval(() => {
        setPasswordResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [passwordOtpStep, passwordResendCooldown]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        const fileData = new FormData();
        fileData.append("image", avatarFile);
        const uploadRes = await api.post("/uploads/image", fileData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        nextAvatarUrl = uploadRes.data.url;
      }

      const res = await api.patch("/auth/profile", {
        name,
        lastName,
        avatarUrl: nextAvatarUrl,
      });

      setUser(res.data.user);
      setAvatarUrl(res.data.user.avatarUrl);
      setAvatarFile(null);
      notyf.success(t("settings.profile.success", "Profile updated successfully."));
    } catch (err) {
      notyf.error(err.response?.data?.message || t("settings.profile.error", "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    if (passwordResendCooldown > 0 || savingPassword) return;
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password/request-otp", {
        currentPassword,
        newPassword,
      });
      setPasswordResendCooldown(60);
      notyf.success(t("settings.account.otp_sent_new_success", "A new OTP has been sent to your email."));
    } catch (err) {
      notyf.error(err.response?.data?.message || t("settings.account.password_error", "Failed to resend OTP"));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordOtpStep) {
      setSavingPassword(true);
      try {
        await api.post("/auth/change-password/verify-otp", {
          otp: passwordOtpCode,
        });
        notyf.success(t("settings.account.password_success", "Password updated successfully. Logging you out — please log in again with your new password."));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordOtpStep(false);
        setPasswordOtpCode("");
        setTimeout(() => onLogout(), 2000);
      } catch (err) {
        notyf.error(err.response?.data?.message || t("settings.account.password_error", "Failed to verify OTP"));
      } finally {
        setSavingPassword(false);
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      notyf.error(t("settings.account.password_mismatch", "New passwords do not match."));
      return;
    }
    if (newPassword.length < 6) {
      notyf.error(t("settings.account.password_length", "New password must be at least 6 characters."));
      return;
    }

    setSavingPassword(true);
    try {
      await api.post("/auth/change-password/request-otp", {
        currentPassword,
        newPassword,
      });
      setPasswordOtpStep(true);
      setPasswordResendCooldown(60);
      notyf.success(t("settings.account.otp_sent_success", "An OTP has been sent to your email."));
    } catch (err) {
      notyf.error(err.response?.data?.message || t("settings.account.password_error", "Failed to request OTP"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="admin-tab-content animate-entrance" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "24px", maxWidth: "1200px", alignItems: "stretch", margin: "0 auto" }}>
      <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "20px", color: "var(--c-light)" }}>
          {t("settings.profile.title", "My Profile")}
        </h2>
        
        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "2px dashed rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundImage: avatarPreview ? `url(${avatarPreview})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!avatarPreview && (
                  <span style={{ fontSize: "2rem", color: "var(--c-sub)", opacity: 0.5 }}>
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </span>
                )}
              </div>
              <label
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: "0",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "var(--outer-shadow)",
                  zIndex: 10,
                  transform: "translate(25%, 25%)"
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("settings.account.email", "Email Address")}
              </label>
              <input type="email" className="solid-input" value={email} readOnly style={{ opacity: 0.7, cursor: "default" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("settings.profile.first_name", "First Name")}
              </label>
              <input
                type="text"
                className="solid-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                {t("settings.profile.last_name", "Last Name")}
              </label>
              <input
                type="text"
                className="solid-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="glass-btn hover-glow" disabled={savingProfile} style={{ alignSelf: "flex-start", marginTop: "8px" }}>
            {savingProfile ? t("settings.profile.saving", "Saving...") : t("settings.profile.save", "Save Changes")}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "8px", color: "var(--c-light)" }}>
          {t("settings.account.password_title", "Change Password")}
        </h3>
        <p style={{ color: "var(--c-sub)", fontSize: "0.9rem", marginBottom: "20px" }}>
          {t("settings.account.password_desc", "Update your password to keep your account secure.")}
        </p>

        <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!passwordOtpStep ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {t("settings.account.current_password", "Current Password")}
                </label>
                <input
                  type="password"
                  className="solid-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {t("settings.account.new_password", "New Password")}
                  </label>
                  <input
                    type="password"
                    className="solid-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--c-sub)", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {t("settings.account.confirm_password", "Confirm Password")}
                  </label>
                  <input
                    type="password"
                    className="solid-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--c-light)", fontWeight: "600" }}>
                {t("settings.account.otp_label", "Enter the OTP sent to your email")}
              </label>
              <input
                type="text"
                className="solid-input"
                value={passwordOtpCode}
                onChange={(e) => setPasswordOtpCode(e.target.value)}
                placeholder="000000"
                style={{ fontSize: "1.2rem", letterSpacing: "4px", textAlign: "center", maxWidth: "200px" }}
                required
              />
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button type="button" onClick={handleResendPasswordOtp} disabled={passwordResendCooldown > 0 || savingPassword} className="admin-btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                  {t("settings.account.resend_otp", "Resend OTP")} {passwordResendCooldown > 0 && `(${passwordResendCooldown}s)`}
                </button>
                <button type="button" onClick={() => setPasswordOtpStep(false)} className="admin-btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", background: "transparent", border: "none" }}>
                  {t("common.cancel", "Cancel")}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="glass-btn hover-glow" disabled={savingPassword} style={{ alignSelf: "flex-start", marginTop: "8px" }}>
            {savingPassword ? t("settings.profile.saving", "Saving...") : passwordOtpStep ? t("settings.account.verify_otp", "Verify & Update") : t("settings.account.request_otp", "Change Password")}
          </button>
        </form>
      </div>
    </div>
  );
}
