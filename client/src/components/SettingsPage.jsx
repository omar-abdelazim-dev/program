import { useState, useRef, useEffect, useCallback } from "react";
import api from "../api/axios";
import CustomSelect from "./CustomSelect";
import { useTranslation } from "react-i18next";
import { MAJORS } from "../data/majors";
import { COLLEGES } from "../data/colleges";

const SECTIONS = [
  {
    id: "profile",
    labelKey: "settings.nav.profile",
    defaultLabel: "Profile",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
      </svg>
    ),
  },
  {
    id: "appearance",
    labelKey: "settings.nav.appearance",
    defaultLabel: "Appearance",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
      </svg>
    ),
  },
  {
    id: "account",
    labelKey: "settings.nav.account",
    defaultLabel: "Account",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    ),
  },
];

export default function SettingsPage({
  user,
  setUser,
  isLightMode,
  toggleTheme,
  onLogout,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [activeSection, setActiveSection] = useState("profile");
  const tabBarRef = useRef(null);
  const tabRefs = useRef({});
  const [indicatorStyle, setIndicatorStyle] = useState({});

  // Calculate the sliding indicator position based on the active tab
  const updateIndicator = useCallback(() => {
    const bar = tabBarRef.current;
    const activeTab = tabRefs.current[activeSection];
    if (!bar || !activeTab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    setIndicatorStyle({
      left: tabRect.left - barRect.left,
      width: tabRect.width,
    });
  }, [activeSection]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <div className="settings-page animate-entrance" style={{ width: "100%" }}>
      <div className="settings-layout">
        {/* Header */}
        <div className="settings-header">
          <h1>{t("settings.title", "Settings")}</h1>
          <p>
            {t(
              "settings.subtitle",
              "Manage your profile, preferences, and account.",
            )}
          </p>
        </div>

        {/* Horizontal tab bar */}
        <nav
          ref={tabBarRef}
          className="settings-tab-bar solid-card"
          style={{ padding: "6px" }}
        >
          <div className="settings-tab-indicator" style={indicatorStyle} />
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              ref={(el) => (tabRefs.current[s.id] = el)}
              type="button"
              className={`settings-tab ${activeSection === s.id ? "active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.icon}
              <span className="tab-label">{t(s.labelKey, s.defaultLabel)}</span>
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="settings-panel">
          <div className="settings-tab-content" key={activeSection}>
            {activeSection === "profile" && (
              <ProfileSection user={user} setUser={setUser} />
            )}
            {activeSection === "appearance" && (
              <AppearanceSection
                user={user}
                isLightMode={isLightMode}
                toggleTheme={toggleTheme}
              />
            )}
            {activeSection === "account" && (
              <AccountSection
                user={user}
                setUser={setUser}
                onLogout={onLogout}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user, setUser }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [name, setName] = useState(user?.name || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [goalsText, setGoalsText] = useState(user?.goalsText || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
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
        phone,
        goalsText,
        avatarUrl: nextAvatarUrl,
      });

      setUser(res.data.user);
      setAvatarUrl(res.data.user.avatarUrl);
      setAvatarFile(null);
      setSuccess(
        t("settings.profile.success", "Profile updated successfully."),
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          t("settings.profile.error", "Failed to update profile"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="settings-section solid-card"
      onSubmit={handleSave}
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        maxWidth: "800px"
      }}
    >
      <h2 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0 }}>
        {t("settings.profile.title", "Profile")}
      </h2>
      {error && (
        <div
          className="settings-message settings-message-error"
          style={{
            color: "#ef4444",
            padding: "12px",
            background: "rgba(239,68,68,0.1)",
            borderRadius: "8px",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="settings-message settings-message-success"
          style={{
            color: "#10B981",
            padding: "12px",
            background: "rgba(16,185,129,0.1)",
            borderRadius: "8px",
          }}
        >
          {success}
        </div>
      )}

      {/* Avatar Upload */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "8px" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-main)",
              border: "2px dashed var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundImage: avatarPreview ? `url(${avatarPreview})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: "var(--inner-shadow)"
            }}
          >
            {!avatarPreview && (
              <span style={{ fontSize: "2rem", color: "var(--c-sub)", opacity: 0.6, fontWeight: 700 }}>
                {name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <label
            style={{
              position: "absolute",
              bottom: "0",
              [isRTL ? "left" : "right"]: "-4px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "var(--outer-shadow)",
              zIndex: 10,
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            title={t("settings.profile.change_picture", "Change profile photo")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t("settings.profile.avatar_title", "Profile Photo")}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {t("settings.profile.avatar_hint", "Upload a square image (JPG, PNG). Max 5MB.")}
          </div>
          {avatarPreview && avatarFile && (
            <button
              type="button"
              onClick={() => {
                setAvatarFile(null);
                setAvatarPreview(avatarUrl);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ef4444",
                fontSize: "0.8rem",
                padding: 0,
                cursor: "pointer",
                textAlign: isRTL ? "right" : "left",
                marginTop: "2px",
                textDecoration: "underline"
              }}
            >
              {t("settings.profile.remove_photo", "Cancel selection")}
            </button>
          )}
        </div>
      </div>

      <div className="settings-two-column-row">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {t("settings.profile.first_name", "First Name")}
          </label>
          <input
            type="text"
            className="solid-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(
              "settings.profile.first_name_placeholder",
              "e.g. John",
            )}
            required
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {t("settings.profile.last_name", "Last Name")}
          </label>
          <input
            type="text"
            className="solid-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t(
              "settings.profile.last_name_placeholder",
              "e.g. Doe",
            )}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {t("settings.profile.phone", "Phone Number")}
          </label>
          <input
            type="tel"
            className="solid-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t(
              "settings.profile.phone_placeholder",
              "e.g. +1 234 567 890",
            )}
            style={{
              textAlign: isRTL ? "right" : "left",
              direction: isRTL ? "rtl" : "ltr",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {t("settings.profile.bio", "Bio / Goals")}
          </label>
          <textarea
            className="solid-input"
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            rows="1"
            style={{ resize: "vertical", minHeight: "46px" }}
            placeholder={t(
              "settings.profile.bio_placeholder",
              "Write a short bio or your goals...",
            )}
          />
        </div>
      </div>

      <button
        type="submit"
        className="solid-btn"
        disabled={saving}
        style={{
          marginTop: "16px",
          alignSelf: "flex-start",
          width: "auto",
          padding: "12px 32px",
        }}
      >
        {saving
          ? t("settings.profile.saving", "Saving...")
          : t("settings.profile.save", "Save changes")}
      </button>
    </form>
  );
}

function AccountSection({ user, setUser, onLogout }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(user?.email || "");
  const [college, setCollege] = useState(user?.college || "");
  const [major, setMajor] = useState(user?.major || "");
  const [providedCourses, setProvidedCourses] = useState(
    user?.providedCourses || "",
  );
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || "");
  const [socialUrl, setSocialUrl] = useState(user?.socialUrl || "");

  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsSuccess, setDetailsSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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

  const formatSettingsMessage = (msg) => {
    if (!msg) return '';
    if (msg === 'An OTP has been sent to your email.') return t('settings.account.otp_sent_success', 'An OTP has been sent to your email.');
    if (msg === 'A new OTP has been sent to your email.') return t('settings.account.otp_sent_new_success', 'A new OTP has been sent to your email.');
    return t(msg, msg);
  };

  const handleDeleteAccount = () => {
    if (window.confirm(t("settings.account.delete_confirm", "Are you sure you want to delete your account? Please contact support to finalize account deletion."))) {
      alert(t("settings.account.delete_support_notice", "To delete your account and all associated data, please contact support at support@program.edu"));
    }
  };

  const handleResendPasswordOtp = async () => {
    if (passwordResendCooldown > 0 || savingPassword) return;
    setPasswordError("");
    setPasswordSuccess("");
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password/request-otp", {
        currentPassword,
        newPassword,
      });
      setPasswordResendCooldown(60);
      setPasswordSuccess(t("settings.account.otp_sent_new_success", "A new OTP has been sent to your email."));
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          t("settings.account.password_error", "Failed to resend OTP"),
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError("");
    setDetailsSuccess("");
    try {
      const res = await api.patch("/auth/profile", {
        email,
        college,
        major,
        providedCourses,
        linkedinUrl,
        socialUrl,
      });
      setUser(res.data.user);
      setDetailsSuccess(
        t("settings.account.success", "Account details updated successfully."),
      );
    } catch (err) {
      setDetailsError(
        err.response?.data?.message ||
          t("settings.account.error", "Failed to update account details"),
      );
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordOtpStep) {
      setPasswordError("");
      setPasswordSuccess("");
      setSavingPassword(true);
      try {
        await api.post("/auth/change-password/verify-otp", {
          otp: passwordOtpCode,
        });
        setPasswordSuccess(t("settings.account.password_success", "Password updated successfully. Logging you out — please log in again with your new password."));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordOtpStep(false);
        setPasswordOtpCode("");
        // The server already revoked every session and cleared cookies as
        // part of this change — without this, the user keeps browsing on
        // dead cookies until their next request 401s with no explanation.
        setTimeout(() => onLogout(), 2000);
      } catch (err) {
        setPasswordError(err.response?.data?.message || t("settings.account.password_error", "Failed to verify OTP"));
      } finally {
        setSavingPassword(false);
      }
      return;
    }

    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError(
        t("settings.account.password_mismatch", "New passwords do not match."),
      );
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(
        t(
          "settings.account.password_length",
          "New password must be at least 6 characters.",
        ),
      );
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
      setPasswordSuccess(t("settings.account.otp_sent_success", "An OTP has been sent to your email."));
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          t("settings.account.password_error", "Failed to request OTP"),
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div
      className="settings-section"
      style={{ display: "flex", flexDirection: "column", gap: "32px" }}
    >
      <div>
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: "800",
            margin: 0,
            marginBottom: "8px",
          }}
        >
          {t("settings.account.title", "Account")}
        </h2>
        <p
          className="settings-section-desc"
          style={{ color: "var(--text-secondary)", margin: 0 }}
        >
          {t(
            "settings.account.desc",
            "Manage your account details and security.",
          )}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, max(300px, calc(50% - 16px))), 1fr))",
          gap: "32px",
          alignItems: "stretch",
        }}
      >
        <form
          onSubmit={handleSaveDetails}
          className="solid-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            {t("settings.account.info_title", "Account Information")}
          </h3>
          {detailsError && (
            <div
              className="settings-message settings-message-error"
              style={{
                color: "#ef4444",
                padding: "12px",
                background: "rgba(239,68,68,0.1)",
                borderRadius: "8px",
              }}
            >
              {detailsError}
            </div>
          )}
          {detailsSuccess && (
            <div
              className="settings-message settings-message-success"
              style={{
                color: "#10B981",
                padding: "12px",
                background: "rgba(16,185,129,0.1)",
                borderRadius: "8px",
              }}
            >
              {detailsSuccess}
            </div>
          )}

          <div className="settings-two-column-row">
            <div
              className="full-span"
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {t("settings.account.email", "Email Address")}
              </label>
              <input
                type="email"
                className="solid-input"
                value={email}
                readOnly
                style={{ opacity: 0.7, cursor: "default" }}
              />
            </div>
            {user?.role === "student" && (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {t("auth.college", "College")}
                  </label>
                  <CustomSelect
                    options={COLLEGES.map((c) => ({
                      value: c.id,
                      label: t(c.key, c.id),
                    }))}
                    value={college}
                    onChange={setCollege}
                    placeholder={t(
                      "auth.college_placeholder",
                      "Select your college",
                    )}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {t("settings.account.major", "Major")}
                  </label>
                  <CustomSelect
                    options={MAJORS.map((m) => ({
                      value: m.id,
                      label: t(`majors.${m.id}`, m.label),
                    }))}
                    value={major}
                    onChange={setMajor}
                    placeholder={t(
                      "settings.account.major_placeholder",
                      "Select your major",
                    )}
                  />
                </div>
              </>
            )}
            {user?.role === "instructor" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {t("settings.account.course_provided", "Course Provided")}
                </label>
                <input
                  type="text"
                  className="solid-input"
                  value={providedCourses}
                  onChange={(e) => setProvidedCourses(e.target.value)}
                  placeholder={t(
                    "settings.account.course_provided_placeholder",
                    "E.g. Web Development 101",
                  )}
                />
              </div>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {t("settings.account.linkedin", "LinkedIn URL")}
              </label>
              <input
                type="url"
                className="solid-input"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <label
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {t("settings.account.social", "Other Social / Website")}
              </label>
              <input
                type="url"
                className="solid-input"
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
          <button
            type="submit"
            className="solid-btn"
            disabled={savingDetails}
            style={{
              marginTop: "8px",
              alignSelf: "flex-start",
              width: "auto",
              padding: "12px 32px",
              borderRadius: "12px",
            }}
          >
            {savingDetails
              ? t("settings.account.saving", "Saving...")
              : t("settings.account.save", "Save Account Info")}
          </button>
        </form>

        <form
          onSubmit={handleSavePassword}
          className="solid-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            {t("settings.account.change_password_title", "Change Password")}
          </h3>
          {passwordError && (
            <div
              className="settings-message settings-message-error"
              style={{
                color: "#ef4444",
                padding: "12px",
                background: "rgba(239,68,68,0.1)",
                borderRadius: "8px",
                boxShadow: "var(--inner-shadow, inset 0 2px 4px rgba(0, 0, 0, 0.4))",
              }}
            >
              {formatSettingsMessage(passwordError)}
            </div>
          )}
          {passwordSuccess && (
            <div
              className="settings-message settings-message-success"
              style={{
                color: "#10B981",
                padding: "12px",
                background: "rgba(16,185,129,0.1)",
                borderRadius: "8px",
                boxShadow: "var(--inner-shadow, inset 0 2px 4px rgba(0, 0, 0, 0.4))",
              }}
            >
              {formatSettingsMessage(passwordSuccess)}
            </div>
          )}

          {passwordOtpStep ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {t("settings.account.otp_code", "OTP Code")}
                </label>
                <button
                  type="button"
                  onClick={handleResendPasswordOtp}
                  disabled={passwordResendCooldown > 0 || savingPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: passwordResendCooldown > 0 ? 'var(--text-secondary)' : '#3b82f6',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: passwordResendCooldown > 0 ? 'not-allowed' : 'pointer',
                    padding: 0,
                    textDecoration: passwordResendCooldown > 0 ? 'none' : 'underline'
                  }}
                >
                  {passwordResendCooldown > 0 ? t("auth.resend_in", "Resend in {{seconds}}s", { seconds: passwordResendCooldown }) : t("auth.resend_code", "Resend Code")}
                </button>
              </div>
              <input
                type="text"
                className="solid-input"
                value={passwordOtpCode}
                onChange={(e) => setPasswordOtpCode(e.target.value)}
                placeholder={t("settings.account.otp_placeholder", "Enter 6-digit OTP")}
                required
                maxLength={6}
                style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {t("settings.account.current_password", "Current Password")}
                </label>
                <input
                  type="password"
                  className="solid-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t(
                    "settings.account.current_password_placeholder",
                    "Enter your current password",
                  )}
                  required
                />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {t("settings.account.new_password", "New Password")}
                  </label>
                  <input
                    type="password"
                    className="solid-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t(
                      "settings.account.new_password_placeholder",
                      "Enter a new password",
                    )}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {t("settings.account.confirm_password", "Confirm New Password")}
                  </label>
                  <input
                    type="password"
                    className="solid-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t(
                      "settings.account.confirm_password_placeholder",
                      "Confirm your new password",
                    )}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            {passwordOtpStep && (
              <button
                type="button"
                className="solid-btn"
                onClick={() => setPasswordOtpStep(false)}
                style={{
                  marginTop: "8px",
                  alignSelf: "flex-start",
                  width: "auto",
                  padding: "12px 32px",
                  borderRadius: "12px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)"
                }}
              >
                {t("settings.account.cancel", "Cancel")}
              </button>
            )}
            <button
              type="submit"
              className="solid-btn"
              disabled={savingPassword}
              style={{
                marginTop: "8px",
                alignSelf: "flex-start",
                width: "auto",
                padding: "12px 32px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
              }}
            >
              {savingPassword
                ? t("settings.account.updating_password", "Updating...")
                : passwordOtpStep ? t("auth.verify_otp", "Verify OTP") : t("settings.account.update_password", "Update password")}
            </button>
          </div>
        </form>
        <div
          className="solid-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {t("settings.account.sessions_title", "Device Sessions")}
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                margin: "12px 0 0 0",
                lineHeight: "1.5",
              }}
            >
              {t(
                "settings.account.sessions_desc",
                "Sign out of Program on this device. You will need to log back in to access your dashboard.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="solid-btn"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              border: "none",
              boxShadow: "var(--inner-shadow)",
              alignSelf: "flex-start",
              width: "auto",
              padding: "10px 24px",
              marginTop: "4px",
              borderRadius: "12px",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(239,68,68,0.1)";
            }}
            onClick={onLogout}
          >
            {t("settings.account.logout", "Log out")}
          </button>
        </div>

        <div
          className="solid-card"
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: "700",
                margin: 0,
                color: "#ef4444",
              }}
            >
              {t("settings.account.danger_title", "Danger Zone")}
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                margin: "12px 0 0 0",
                lineHeight: "1.5",
              }}
            >
              {t(
                "settings.account.danger_desc",
                "Permanently delete your account and all of your data. This action cannot be undone.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="solid-btn"
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              boxShadow: "var(--inner-shadow)",
              alignSelf: "flex-start",
              width: "auto",
              padding: "10px 24px",
              marginTop: "4px",
              borderRadius: "12px",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#ef4444";
            }}
            onClick={handleDeleteAccount}
          >
            {t("settings.account.delete", "Delete Account")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection({ user, isLightMode, toggleTheme }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  return (
    <div
      className="settings-section solid-card"
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        maxWidth: "800px"
      }}
    >
      <h2 style={{ fontSize: "1.8rem", fontWeight: "800", margin: 0 }}>
        {t("settings.appearance.title", "Appearance")}
      </h2>
      <p
        className="settings-section-desc"
        style={{ color: "var(--text-secondary)" }}
      >
        {t(
          "settings.appearance.desc",
          "Choose how Program looks on this device.",
        )}
      </p>

      {/* Language Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
          {t("settings.appearance.language", "Language")}
        </h3>
        
        <div
          className="appearance-options"
          dir="ltr"
          style={{
            display: "flex",
            gap: "4px",
            position: "relative",
            background: "var(--bg-main)",
            padding: "6px",
            borderRadius: "12px",
            boxShadow: "var(--inner-shadow)"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "6px",
              bottom: "6px",
              left: "6px",
              width: "calc(50% - 8px)",
              background: "var(--bg-surface)",
              borderRadius: "12px",
              boxShadow: "var(--outer-shadow)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: i18n.language !== "en"
                ? "translateX(calc(100% + 4px))"
                : "translateX(0)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <button
            type="button"
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: i18n.language === "en"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "none",
            }}
            onClick={() => {
              i18n.changeLanguage("en");
              if (user?.role) localStorage.setItem(`${user.role}_lang`, "en");
            }}
          >
            English (EN)
          </button>
          <button
            type="button"
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: i18n.language !== "en"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "none",
            }}
            onClick={() => {
              i18n.changeLanguage("ar");
              if (user?.role) localStorage.setItem(`${user.role}_lang`, "ar");
            }}
          >
            العربية (AR)
          </button>
        </div>
      </div>
    </div>
  );
}
