import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, InputField, TextareaField, notyf } from './SharedUI';
import FullPageLoader from '../FullPageLoader';

export default function AboutManager({ user }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await api.get('/website/content');
      setContent(res.data.about);
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
      await api.patch('/website/content', { about: content });
      notyf.success('About settings saved successfully!');
    } catch (err) {
      notyf.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>About Page Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Manage company story, mission, and team members.
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
          Company Information
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <TextareaField
            label="Company Story"
            placeholder="Tell your students and instructors about how this platform started..."
            value={content?.companyStory || ""}
            onChange={(e) => handleChange("companyStory", e.target.value)}
            rows={4}
          />
          <TextareaField
            label="Mission Statement"
            placeholder="Our mission is to democratize education..."
            value={content?.mission || ""}
            onChange={(e) => handleChange("mission", e.target.value)}
            rows={2}
          />
          <TextareaField
            label="Vision Statement"
            placeholder="To be the leading global platform for online learning..."
            value={content?.vision || ""}
            onChange={(e) => handleChange("vision", e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
