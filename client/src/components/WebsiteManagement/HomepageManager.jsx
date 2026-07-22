import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, InputField, TextareaField, notyf } from './SharedUI';

export default function HomepageManager({ user }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await api.get('/website/content');
      setContent(res.data.homepage);
    } catch (err) {
      setError('Failed to load homepage configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.patch('/website/content', { homepage: content });
      notyf.success('Homepage settings saved successfully!');
    } catch (err) {
      notyf.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section, field, value) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="admin-page-content">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Homepage Management</h2>
          <p style={{ color: 'var(--text-2)' }}>Control the hero section, stats, and visibility of homepage elements.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ height: '40px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Hero Section</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <InputField
            label="Hero Title"
            value={content?.hero?.title || ''}
            onChange={(e) => handleChange('hero', 'title', e.target.value)}
            placeholder="e.g. Ready to level up, {name}?"
          />
          <TextareaField
            label="Hero Subtitle"
            value={content?.hero?.subtitle || ''}
            onChange={(e) => handleChange('hero', 'subtitle', e.target.value)}
            rows={2}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <InputField
              label="Primary Button Text"
              value={content?.hero?.primaryButtonText || ''}
              onChange={(e) => handleChange('hero', 'primaryButtonText', e.target.value)}
            />
            <InputField
              label="Primary Button URL"
              value={content?.hero?.primaryButtonUrl || ''}
              onChange={(e) => handleChange('hero', 'primaryButtonUrl', e.target.value)}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField
                label="Hero Background Image URL"
                value={content?.hero?.heroImage || ''}
                onChange={(e) => handleChange('hero', 'heroImage', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <InputField
            label="Students Count"
            value={content?.stats?.studentsCount || ''}
            onChange={(e) => handleChange('stats', 'studentsCount', e.target.value)}
          />
          <InputField
            label="Courses Count"
            value={content?.stats?.coursesCount || ''}
            onChange={(e) => handleChange('stats', 'coursesCount', e.target.value)}
          />
          <InputField
            label="Instructors Count"
            value={content?.stats?.instructorsCount || ''}
            onChange={(e) => handleChange('stats', 'instructorsCount', e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-1)' }}>Homepage Banner</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-1)', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={content?.banner?.enabled || false}
            onChange={(e) => handleChange('banner', 'enabled', e.target.checked)}
          />
          Enable Banner
        </label>
        
        {content?.banner?.enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <InputField
              label="Banner Title"
              value={content?.banner?.title || ''}
              onChange={(e) => handleChange('banner', 'title', e.target.value)}
            />
            <InputField
              label="Banner Description"
              value={content?.banner?.description || ''}
              onChange={(e) => handleChange('banner', 'description', e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InputField
                label="Call to Action Text"
                value={content?.banner?.ctaText || ''}
                onChange={(e) => handleChange('banner', 'ctaText', e.target.value)}
              />
              <InputField
                label="Call to Action URL"
                value={content?.banner?.ctaUrl || ''}
                onChange={(e) => handleChange('banner', 'ctaUrl', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
