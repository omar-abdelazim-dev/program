import { useState, useEffect } from 'react';
import api from '../api/axios';
import notyf from '../utils/notyf';
import { useTranslation } from 'react-i18next';

export default function AdminEnrollmentsTab() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/enrollments/admin/requests?status=${statusFilter}`);
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to load enrollment requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this student enrollment request?')) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/api/enrollments/admin/requests/${id}/approve`);
      notyf.success(res.data.message || 'Enrollment request approved successfully!');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      notyf.error('Please enter a rejection reason.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.patch(`/api/enrollments/admin/requests/${rejectingRequest._id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      notyf.success(res.data.message || 'Enrollment request rejected.');
      setRejectingRequest(null);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Approved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Rejected</span>;
      case 'pending':
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Pending Review</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--c-card,#1a1d24)] p-5 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white">Student Enrollment Requests</h2>
          <p className="text-sm text-gray-400">Manual payment verification & approval system</p>
        </div>
        <div className="flex items-center gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-[var(--c-card,#1a1d24)] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading enrollment requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No enrollment requests found for "{statusFilter}".</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-xs uppercase text-gray-400 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Method & Number</th>
                  <th className="px-6 py-4">Provider TX ID</th>
                  <th className="px-6 py-4">Program TX ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{req.student?.name || 'Unknown Student'}</div>
                      <div className="text-xs text-gray-400">{req.student?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate">
                      {req.course?.title || 'Course'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      EGP {req.amountPaid?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold capitalize text-indigo-300">
                        {req.paymentMethod?.replace('_', ' ') || 'Mobile Wallet'}
                      </div>
                      <div className="text-xs text-gray-400">{req.payerNumber}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-amber-300">
                      {req.providerTransactionId}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {req.programTransactionId}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1.5 text-xs font-medium bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-500/30 transition-all"
                      >
                        Review Proof
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181a20] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Enrollment Proof Verification</h3>
                <p className="text-xs text-mono text-indigo-400">{selectedRequest.programTransactionId}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-white text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/5 p-4 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Student Info</span>
                <div className="font-semibold text-white">{selectedRequest.student?.name}</div>
                <div className="text-xs text-gray-300">{selectedRequest.student?.email}</div>
                <div className="text-xs text-gray-400">Payer Number: <span className="text-white font-mono">{selectedRequest.payerNumber}</span></div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Payment Info</span>
                <div className="font-semibold text-emerald-400">EGP {selectedRequest.amountPaid?.toLocaleString()}</div>
                <div className="text-xs text-gray-300 capitalize">Method: {selectedRequest.paymentMethod?.replace('_', ' ')}</div>
                <div className="text-xs text-amber-300 font-mono">Provider TX ID: {selectedRequest.providerTransactionId}</div>
              </div>
            </div>

            {/* Proof Screenshot */}
            <div>
              <span className="text-xs text-gray-400 uppercase font-semibold block mb-2">Payment Screenshot Proof</span>
              {selectedRequest.screenshotUrl ? (
                <div className="rounded-xl border border-white/10 overflow-hidden bg-black max-h-72 flex items-center justify-center">
                  <a href={selectedRequest.screenshotUrl} target="_blank" rel="noreferrer">
                    <img
                      src={selectedRequest.screenshotUrl}
                      alt="Payment Screenshot Proof"
                      className="max-h-72 object-contain hover:scale-105 transition-transform"
                    />
                  </a>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 bg-white/5 rounded-xl">No screenshot attached.</div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedRequest.status === 'pending' && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  disabled={submitting}
                  onClick={() => setRejectingRequest(selectedRequest)}
                  className="px-4 py-2 text-sm font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-500/30 transition-all"
                >
                  Reject Request
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleApprove(selectedRequest._id)}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                >
                  {submitting ? 'Approving...' : 'Approve Enrollment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleReject} className="bg-[#181a20] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reject Enrollment Request</h3>
            <p className="text-xs text-gray-400">
              Provide a clear reason for rejection. This will be sent to the student and trigger a refund record.
            </p>
            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Transaction amount does not match course price or invalid screenshot."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-600/30 transition-all"
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
