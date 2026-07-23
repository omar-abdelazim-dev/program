import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, InputField, TextareaField, SelectField, CheckboxField, notyf } from './SharedUI';
import FullPageLoader from '../FullPageLoader';

export default function AnnouncementsManager({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', content: '', type: 'General', audience: 'Everyone', priority: 'Low', status: 'draft', isPinned: false, showAsBanner: false 
  });
  const [editingId, setEditingId] = useState(null);
  
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/website/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/website/announcements/${editingId}`, formData);
      } else {
        await api.post('/website/announcements', formData);
      }
      setShowModal(false);
      notyf.success('Announcement saved successfully');
      fetchAnnouncements();
    } catch (err) {
      notyf.error('Failed to save announcement: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      await api.delete(`/website/announcements/${id}`);
      notyf.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (err) {
      notyf.error('Failed to delete announcement: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEdit = (item) => {
    setFormData({ 
      title: item.title, content: item.content, type: item.type, audience: item.audience, 
      priority: item.priority, status: item.status, isPinned: item.isPinned, showAsBanner: item.showAsBanner 
    });
    setEditingId(item._id);
    setShowModal(true);
  };

  const openCreate = () => {
    setFormData({ 
      title: '', content: '', type: 'General', audience: 'Everyone', priority: 'Low', status: 'draft', isPinned: false, showAsBanner: false 
    });
    setEditingId(null);
    setShowModal(true);
  };

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Announcements</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Broadcast messages, maintenance alerts, and banners.</p>
        </div>
        <Button variant="primary" onClick={openCreate} style={{ height: '44px', borderRadius: '50px', padding: '0 28px' }}>
          + New Announcement
        </Button>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', color: 'var(--c-sub)', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.5)', borderRadius: '12px' }}>
              <th style={{ padding: '16px', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Announcement</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Audience</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Priority</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map(item => (
              <tr key={item._id} style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                <td style={{ padding: '16px', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.title}
                    {item.isPinned && <span style={{ fontSize: '14px' }}>📌</span>}
                    {item.showAsBanner && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        color: '#fff',
                        fontWeight: 600
                      }}>
                        Banner
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>{item.type}</div>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{item.audience}</td>
                <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <span className="status-badge" style={{
                    color: item.priority === 'Critical' ? '#ef4444' : item.priority === 'High' ? '#f59e0b' : item.priority === 'Medium' ? '#3b82f6' : 'var(--text-secondary)'
                  }}>
                    {item.priority}
                  </span>
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <span className="status-badge" style={{
                    color: item.status === 'published' ? '#10b981' : item.status === 'draft' ? '#f59e0b' : 'var(--text-secondary)'
                  }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={() => openEdit(item)} style={{ padding: '6px 16px', borderRadius: '12px' }}>Edit</Button>
                    <Button 
                      variant="danger" 
                      onClick={() => handleDelete(item._id)}
                      disabled={!isSuperAdmin}
                      title={!isSuperAdmin ? "Super Admin permission required" : ""}
                      style={{ padding: '6px 16px', borderRadius: '12px' }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No announcements found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="solid-card" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' }}>{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField
                label="Title"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
              <TextareaField
                label="Content"
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                required
                rows={4}
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <SelectField
                  label="Type"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  options={['General', 'Maintenance', 'Feature Update', 'Promotion', 'Emergency']}
                />
                <SelectField
                  label="Audience"
                  value={formData.audience}
                  onChange={e => setFormData({...formData, audience: e.target.value})}
                  options={['Everyone', 'Students', 'Instructors', 'Admins']}
                />
                <SelectField
                  label="Priority"
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  options={['Low', 'Medium', 'High', 'Critical']}
                />
                <SelectField
                  label="Status"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  disabled={!isSuperAdmin && (formData.status === 'published' || formData.status === 'archived')}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'archived', label: 'Archived' }
                  ]}
                />
              </div>

              <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
                <CheckboxField 
                  label="Pin to Top" 
                  checked={formData.isPinned} 
                  onChange={e => setFormData({...formData, isPinned: !formData.isPinned})} 
                />
                <CheckboxField 
                  label="Show as Homepage Banner" 
                  checked={formData.showAsBanner} 
                  onChange={e => setFormData({...formData, showAsBanner: !formData.showAsBanner})} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '50px', padding: '10px 24px' }}>Cancel</Button>
                <Button variant="primary" type="submit" style={{ borderRadius: '50px', padding: '10px 24px' }}>Save Announcement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
