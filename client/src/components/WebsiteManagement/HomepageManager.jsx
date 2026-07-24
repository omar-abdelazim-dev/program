import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, InputField, TextareaField, CheckboxField, notyf } from './SharedUI';
import FullPageLoader from '../FullPageLoader';

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

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Homepage Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Control the hero section, stats, and visibility of homepage elements.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ height: '44px', borderRadius: '50px', padding: '0 32px' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Hero Section</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              placeholder="e.g. Explore Courses"
              value={content?.hero?.primaryButtonText || ''}
              onChange={(e) => handleChange('hero', 'primaryButtonText', e.target.value)}
            />
            <InputField
              label="Primary Button URL"
              placeholder="e.g. /courses"
              value={content?.hero?.primaryButtonUrl || ''}
              onChange={(e) => handleChange('hero', 'primaryButtonUrl', e.target.value)}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField
                label="Hero Background Image URL"
                placeholder="e.g. https://example.com/hero.jpg"
                value={content?.hero?.heroImage || ''}
                onChange={(e) => handleChange('hero', 'heroImage', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          <InputField
            label="Students Count"
            placeholder="e.g. 10,000+"
            value={content?.stats?.studentsCount || ''}
            onChange={(e) => handleChange('stats', 'studentsCount', e.target.value)}
          />
          <InputField
            label="Courses Count"
            placeholder="e.g. 200+"
            value={content?.stats?.coursesCount || ''}
            onChange={(e) => handleChange('stats', 'coursesCount', e.target.value)}
          />
          <InputField
            label="Instructors Count"
            placeholder="e.g. 50+"
            value={content?.stats?.instructorsCount || ''}
            onChange={(e) => handleChange('stats', 'instructorsCount', e.target.value)}
          />
        </div>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Homepage Banner</h3>
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <CheckboxField
            label="Enable Banner"
            checked={content?.banner?.enabled || false}
            onChange={() => handleChange('banner', 'enabled', !(content?.banner?.enabled || false))}
          />
        </div>
        {content?.banner?.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InputField
              label="Banner Title"
              placeholder="e.g. Summer Sale Event!"
              value={content?.banner?.title || ''}
              onChange={(e) => handleChange('banner', 'title', e.target.value)}
            />
            <InputField
              label="Banner Description"
              placeholder="e.g. Get 50% off all premium courses this week."
              value={content?.banner?.description || ''}
              onChange={(e) => handleChange('banner', 'description', e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InputField
                label="Call to Action Text"
                placeholder="e.g. Claim Discount"
                value={content?.banner?.ctaText || ''}
                onChange={(e) => handleChange('banner', 'ctaText', e.target.value)}
              />
              <InputField
                label="Call to Action URL"
                placeholder="e.g. /sale"
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
