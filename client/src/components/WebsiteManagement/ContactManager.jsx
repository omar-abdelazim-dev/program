import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Button, InputField, TextareaField, notyf } from "./SharedUI";
import FullPageLoader from "../FullPageLoader";

export default function ContactManager({ user }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await api.get("/website/content");
      setContent(res.data.contact);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch("/website/content", { contact: content });
      notyf.success("Contact settings saved successfully!");
    } catch (err) {
      notyf.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setContent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialChange = (network, value) => {
    setContent((prev) => ({
      ...prev,
      socialMediaLinks: {
        ...prev.socialMediaLinks,
        [network]: value,
      },
    }));
  };

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Contact Page Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Manage contact details, address, and social links.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          style={{ height: '44px', borderRadius: '50px', padding: '0 32px' }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
          Contact Information
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          <InputField
            label="Support Email"
            type="email"
            value={content?.supportEmail || ""}
            onChange={(e) => handleChange("supportEmail", e.target.value)}
          />
          <InputField
            label="Business Email"
            type="email"
            value={content?.businessEmail || ""}
            onChange={(e) => handleChange("businessEmail", e.target.value)}
          />
          <InputField
            label="WhatsApp Number"
            value={content?.whatsappNumber || ""}
            onChange={(e) => handleChange("whatsappNumber", e.target.value)}
          />
          <InputField
            label="Business Hours"
            value={content?.businessHours || ""}
            onChange={(e) => handleChange("businessHours", e.target.value)}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <TextareaField
              label="Physical Address"
              value={content?.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              rows={2}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <InputField
              label="Google Maps Embed URL"
              value={content?.googleMapsUrl || ""}
              onChange={(e) => handleChange("googleMapsUrl", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
          Social Media Links
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {[
            "facebook",
            "instagram",
            "linkedin",
            "tiktok",
            "youtube",
            "github",
          ].map((network) => (
            <InputField
              key={network}
              label={network.charAt(0).toUpperCase() + network.slice(1)}
              type="url"
              value={content?.socialMediaLinks?.[network] || ""}
              onChange={(e) => handleSocialChange(network, e.target.value)}
              placeholder={`https://${network}.com/...`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
