import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, InputField, TextareaField, SelectField, notyf } from './SharedUI';
import FullPageLoader from '../FullPageLoader';

export default function FAQManager({ user }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ question: '', answer: '', category: 'General', status: 'active' });
  const [editingId, setEditingId] = useState(null);
  
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/website/faqs');
      setFaqs(res.data);
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
        await api.patch(`/website/faqs/${editingId}`, formData);
      } else {
        await api.post('/website/faqs', formData);
      }
      setShowModal(false);
      notyf.success('FAQ saved successfully');
      fetchFaqs();
    } catch (err) {
      notyf.error('Failed to save FAQ: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ permanently?')) return;
    try {
      await api.delete(`/website/faqs/${id}`);
      notyf.success('FAQ deleted successfully');
      fetchFaqs();
    } catch (err) {
      notyf.error('Failed to delete FAQ: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEdit = (faq) => {
    setFormData({ question: faq.question, answer: faq.answer, category: faq.category, status: faq.status });
    setEditingId(faq._id);
    setShowModal(true);
  };

  const openCreate = () => {
    setFormData({ question: '', answer: '', category: 'General', status: 'active' });
    setEditingId(null);
    setShowModal(true);
  };

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>FAQ Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Manage frequently asked questions.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} style={{ height: '44px', borderRadius: '50px', padding: '0 28px' }}>
          + Add FAQ
        </Button>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', color: 'var(--c-sub)', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.5)', borderRadius: '12px' }}>
              <th style={{ padding: '16px', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Question</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map(faq => (
              <tr key={faq._id} style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '600', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                  {faq.question}
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {faq.category}
                </td>
                <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                  <span className="status-badge" style={{ color: faq.status === "active" ? '#10b981' : '#f59e0b' }}>
                    {faq.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={() => openEdit(faq)} style={{ padding: '6px 16px', borderRadius: '12px' }}>Edit</Button>
                    <Button 
                      variant="danger" 
                      onClick={() => handleDelete(faq._id)}
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
            {faqs.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No FAQs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="solid-card" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' }}>
              {editingId ? "Edit FAQ" : "Create FAQ"}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField
                label="Question"
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                required
              />
              <TextareaField
                label="Answer"
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
                required
                rows={4}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <SelectField
                  label="Category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  options={["General", "Pricing", "Courses", "Technical Support"]}
                />
                <SelectField
                  label="Status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  options={[
                    { value: "active", label: "Active" },
                    { value: "hidden", label: "Hidden" },
                  ]}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '50px', padding: '10px 24px' }}>Cancel</Button>
                <Button variant="primary" type="submit" style={{ borderRadius: '50px', padding: '10px 24px' }}>Save FAQ</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
