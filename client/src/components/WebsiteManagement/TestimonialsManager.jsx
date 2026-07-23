import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { Button, InputField, TextareaField, SelectField, notyf } from './SharedUI';
import FullPageLoader from '../FullPageLoader';

export default function TestimonialsManager({ user }) {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    studentName: "",
    university: "",
    role: "",
    rating: 5,
    review: "",
  });

  const isSuperAdmin = user?.role === "superadmin";

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await api.get("/website/testimonials");
      setTestimonials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!isSuperAdmin && ["approved", "featured"].includes(status)) {
      notyf.error(
        "Super Admin permission required to approve or feature testimonials.",
      );
      return;
    }
    try {
      await api.patch(`/website/testimonials/${id}`, { status });
      notyf.success("Testimonial status updated");
      fetchTestimonials();
    } catch (err) {
      notyf.error(
        "Failed to update status: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this testimonial permanently?")) return;
    try {
      await api.delete(`/website/testimonials/${id}`);
      notyf.success("Testimonial deleted successfully");
      fetchTestimonials();
    } catch (err) {
      notyf.error(
        "Failed to delete testimonial: " +
          (err.response?.data?.message || err.message),
      );
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/website/testimonials", formData);
      setShowModal(false);
      notyf.success("Testimonial created successfully");
      fetchTestimonials();
    } catch (err) {
      notyf.error("Failed to create testimonial");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "badge-success";
      case "featured":
        return "badge-accent";
      case "rejected":
        return "badge-danger";
      case "hidden":
        return "badge-warning";
      default:
        return "badge-secondary";
    }
  };

  if (loading) return <FullPageLoader message="Loading Data..." fullScreen={false} />;

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Testimonials Moderation</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Approve, feature, or reject student reviews.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} style={{ height: '44px', borderRadius: '50px', padding: '0 28px' }}>
          + Add Testimonial
        </Button>
      </div>

      <div className="solid-card" style={{ padding: '32px', marginBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', color: 'var(--c-sub)', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.5)', borderRadius: '12px' }}>
              <th style={{ padding: '16px', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Student Info</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Review</th>
              <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testimonials.map((item) => (
              <tr key={item._id} style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                <td style={{ padding: '16px', verticalAlign: 'top', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                    {item.studentName}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {item.role} • {item.university}
                  </div>
                  <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '6px' }}>
                    {"★".repeat(item.rating)}
                  </div>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', maxWidth: '400px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                    "{item.review}"
                  </p>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top', borderBottom: '1px solid var(--border)' }}>
                  <span className="status-badge" style={{
                    color: item.status === 'approved' ? '#10b981' : item.status === 'featured' ? '#f97316' : item.status === 'rejected' ? '#ef4444' : item.status === 'hidden' ? '#f59e0b' : item.status === 'pending' ? '#3b82f6' : 'var(--text-primary)',
                    textTransform: 'capitalize'
                  }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'top', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {item.status !== "approved" && item.status !== "featured" && (
                      <Button variant="success" onClick={() => handleStatusChange(item._id, "approved")} disabled={!isSuperAdmin} title={!isSuperAdmin ? "Super Admin permission required" : ""} style={{ padding: '6px 16px', borderRadius: '12px' }}>
                        Approve
                      </Button>
                    )}
                    {item.status !== "featured" && (
                      <Button variant="primary" onClick={() => handleStatusChange(item._id, "featured")} disabled={!isSuperAdmin} title={!isSuperAdmin ? "Super Admin permission required" : ""} style={{ padding: '6px 16px', borderRadius: '12px' }}>
                        Feature
                      </Button>
                    )}
                    {item.status !== "hidden" && (
                      <Button variant="warning" onClick={() => handleStatusChange(item._id, "hidden")} style={{ padding: '6px 16px', borderRadius: '12px' }}>
                        Hide
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => handleDelete(item._id)} disabled={!isSuperAdmin} title={!isSuperAdmin ? "Super Admin permission required" : ""} style={{ padding: '6px 16px', borderRadius: '12px' }}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {testimonials.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No testimonials found.
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
              Add Manual Testimonial
            </h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField
                label="Student Name"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <InputField
                  label="Role"
                  placeholder="e.g. Developer"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
                <InputField
                  label="University"
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                />
              </div>
              <TextareaField
                label="Review Content"
                value={formData.review}
                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                required
                rows={4}
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button variant="secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '50px', padding: '10px 24px' }}>Cancel</Button>
                <Button variant="primary" type="submit" style={{ borderRadius: '50px', padding: '10px 24px' }}>Add Testimonial</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
