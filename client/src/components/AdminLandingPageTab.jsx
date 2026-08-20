import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import notyf from '../utils/notyf';
import Spinner from './Spinner';

export default function AdminLandingPageTab() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  // Fetch the current public configuration from the database.
  // If the landingPage config section is missing (e.g. legacy db),
  // we provide a robust default fallback to populate the CMS form.
  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/system/config/public');
      if (res.data?.landingPage) {
        setConfig(res.data.landingPage);
      } else {
        // Fallback default config if missing
        setConfig({
          hero: {
            eyebrow: 'Education built around possibility',
            titlePart1: 'Master Your Craft. ',
            titlePart2: 'Share Your Expertise.',
            copy: 'Program makes high-quality learning and teaching more accessible, so ambition—not access—sets the limit on what comes next.',
            studentCtaText: 'Start Learning',
            studentCtaLink: '/auth?mode=register&role=student',
            instructorCtaText: 'Start Teaching',
            instructorCtaLink: '/auth?mode=register&role=instructor'
          },
          story: {
            eyebrowLeft: 'Who we are',
            titleLeft: 'Learning should open doors for everyone.',
            copyLeft: 'Program began with a simple belief: exceptional education should feel close, practical, and personal. We bring curious learners together with people who have the experience to guide them.',
            eyebrowRight: 'Our vision',
            titleRight: 'A global learning community powered by real expertise.',
            copyRight: 'We are building a place where knowledge travels farther, instructors are rewarded for what they know, and every learner can turn a next step into lasting progress.'
          },
          paths: {
            eyebrow: 'One community, two ways forward',
            title: 'Choose the path that moves you.',
            copy: 'Whether you are growing a skill set or growing an audience, Program is designed to help your work go further.',
            studentTitle: 'Build skills that take you places.',
            studentCopy: 'Find focused courses, learn at your pace, and make every completed lesson count.',
            studentCtaText: 'Explore learning',
            studentCtaLink: '/auth?mode=register&role=student',
            instructorTitle: 'Teach what you know best.',
            instructorCopy: 'Create courses easily, connect with students directly, and build a new revenue stream.',
            instructorCtaText: 'Start teaching',
            instructorCtaLink: '/auth?mode=register&role=instructor'
          },
          colors: {
            primaryText: '#18181b',
            secondaryText: '#71717a',
            accentStudent: '#3b82f6',
            accentInstructor: '#f59e0b'
          },
          stats: [
            { label: 'Active Learners', value: 10000, suffix: '+', isFloat: false },
            { label: 'Expert Instructors', value: 500, suffix: '+', isFloat: false },
            { label: 'Average Rating', value: 4.9, suffix: '/5', isFloat: true },
            { label: 'Courses Completed', value: 25000, suffix: '+', isFloat: false }
          ],
          social: {
            email: 'hello@program.com',
            instagram: 'https://instagram.com/',
            facebook: 'https://facebook.com/',
            tiktok: 'https://tiktok.com/'
          }
        });
      }
    } catch (err) {
      console.error(err);
      notyf.error('Error loading configuration');
    } finally {
      setIsLoading(false);
    }
  };

  // Submits the patched configuration to the backend API.
  // We send the entire 'config' object and the backend will merge it.
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.patch('/system/config/landingPage', config);
      notyf.success('Saved successfully');
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  // Utility to handle deeply nested state updates (e.g., config.hero.eyebrow)
  // Ensures React re-renders correctly by returning a fresh state object
  const handleChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleStatChange = (index, field, value) => {
    setConfig(prev => {
      const newStats = [...(prev.stats || [])];
      newStats[index] = { ...newStats[index], [field]: value };
      return { ...prev, stats: newStats };
    });
  };

  if (isLoading || !config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spinner size="large" label="Loading..." />
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-main)',
    border: '1px solid transparent',
    color: 'inherit',
    borderRadius: '10px',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 4px 12px rgba(0, 0, 0, 0.03)',
    marginBottom: '16px',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    outline: 'none'
  };

  const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--c-sub)' };

  return (
    <div className="animate-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: '0 0 4px 0', color: 'var(--text-h)' }}>Landing Page CMS</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)' }}>Manage content and visual appearance of the landing page.</div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          style={{
            background: 'var(--c-orange)', border: 'none', boxShadow: 'var(--shadow-subtle)',
            color: '#fff', padding: '12px 24px', borderRadius: '10px', cursor: isSaving ? "not-allowed" : "pointer", fontSize: "0.95rem",
            fontWeight: "600", transition: "all 0.2s", opacity: isSaving ? 0.7 : 1
          }}
          onMouseEnter={e => { if(!isSaving) e.target.style.background = 'var(--c-orange-hover, #e85d04)'; }}
          onMouseLeave={e => { if(!isSaving) e.target.style.background = 'var(--c-orange)'; }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* HERO SECTION */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-h)' }}>Hero Section</h3>
          
          <label style={labelStyle}>Eyebrow</label>
          <input type="text" style={inputStyle} value={config.hero.eyebrow} onChange={(e) => handleChange('hero', 'eyebrow', e.target.value)} />

          <label style={labelStyle}>Title Part 1</label>
          <input type="text" style={inputStyle} value={config.hero.titlePart1} onChange={(e) => handleChange('hero', 'titlePart1', e.target.value)} />

          <label style={labelStyle}>Title Part 2 (Highlight)</label>
          <input type="text" style={inputStyle} value={config.hero.titlePart2} onChange={(e) => handleChange('hero', 'titlePart2', e.target.value)} />

          <label style={labelStyle}>Copy</label>
          <textarea style={{...inputStyle, minHeight: '80px'}} value={config.hero.copy} onChange={(e) => handleChange('hero', 'copy', e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Student CTA Text</label>
              <input type="text" style={inputStyle} value={config.hero.studentCtaText} onChange={(e) => handleChange('hero', 'studentCtaText', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Student CTA Link</label>
              <input type="text" style={inputStyle} value={config.hero.studentCtaLink} onChange={(e) => handleChange('hero', 'studentCtaLink', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Instructor CTA Text</label>
              <input type="text" style={inputStyle} value={config.hero.instructorCtaText} onChange={(e) => handleChange('hero', 'instructorCtaText', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Instructor CTA Link</label>
              <input type="text" style={inputStyle} value={config.hero.instructorCtaLink} onChange={(e) => handleChange('hero', 'instructorCtaLink', e.target.value)} />
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-h)' }}>Stats Section</h3>
          {(config.stats || []).map((stat, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Label {index + 1}</label>
                <input type="text" style={{...inputStyle, marginBottom: 0}} value={stat.label} onChange={(e) => handleStatChange(index, 'label', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Value</label>
                <input type="number" step={stat.isFloat ? "0.1" : "1"} style={{...inputStyle, marginBottom: 0}} value={stat.value} onChange={(e) => handleStatChange(index, 'value', Number(e.target.value))} />
              </div>
              <div>
                <label style={labelStyle}>Suffix</label>
                <input type="text" style={{...inputStyle, marginBottom: 0}} value={stat.suffix} onChange={(e) => handleStatChange(index, 'suffix', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* SOCIAL SECTION */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-h)' }}>Social Links (Footer)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="text" style={inputStyle} value={config.social?.email || ''} onChange={(e) => handleChange('social', 'email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Instagram URL</label>
              <input type="text" style={inputStyle} value={config.social?.instagram || ''} onChange={(e) => handleChange('social', 'instagram', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Facebook URL</label>
              <input type="text" style={inputStyle} value={config.social?.facebook || ''} onChange={(e) => handleChange('social', 'facebook', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TikTok URL</label>
              <input type="text" style={inputStyle} value={config.social?.tiktok || ''} onChange={(e) => handleChange('social', 'tiktok', e.target.value)} />
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
