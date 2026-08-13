import { useState } from 'react';
import api from '../api/axios';
import notyf from '../utils/notyf';

const generatePreviewId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRG-TXN-${rand}`;
};

export default function PaymentModal({ course, onClose, onSuccess }) {
  const [previewProgramId] = useState(() => generatePreviewId());
  const [paymentMethod, setPaymentMethod] = useState('vodafone_cash');
  const [payerNumber, setPayerNumber] = useState('');
  const [providerTxId, setProviderTxId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const expectedFees = 10;
  const instructorName = typeof course.instructor === 'object' ? course.instructor?.name : (course.instructor || 'Instructor');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payerNumber.trim() || !providerTxId.trim() || !screenshotUrl.trim()) {
      notyf.error('Please fill in all payment details and screenshot URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/enrollments/request/${course._id || course.id}`, {
        paymentMethod,
        payerNumber: payerNumber.trim(),
        providerTransactionId: providerTxId.trim(),
        screenshotUrl: screenshotUrl.trim(),
        expectedFees,
      });

      setSubmittedData(res.data.enrollment);
      notyf.success(res.data.message || 'Payment request submitted successfully!');
      if (onSuccess) onSuccess(res.data.enrollment);
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to submit payment request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#181a20] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-bold">Course Enrollment Request</h3>
            <p className="text-xs text-gray-400">Manual Payment Proof Verification</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl font-bold px-2">
            ✕
          </button>
        </div>

        {submittedData ? (
          /* Confirmation Step */
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-lg font-bold text-white">Enrollment Request Received!</h4>
            <p className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl">
              Your payment proof has been sent to our active shift admin. Your request will be reviewed within <strong>3 hours</strong> during working hours.
            </p>

            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Course Name:</span> <span className="font-semibold text-white">{course.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Instructor Name:</span> <span className="text-gray-200">{instructorName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Program Transaction ID:</span> <span className="font-mono text-indigo-300 font-bold">{submittedData.programTransactionId}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Provider Transaction ID:</span> <span className="font-mono text-amber-300">{submittedData.providerTransactionId}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Payer Account/Number:</span> <span className="font-mono text-white">{submittedData.payerNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status:</span> <span className="text-amber-400 font-semibold uppercase">{submittedData.status}</span></div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
            >
              Done
            </button>
          </div>
        ) : (
          /* Enrollment Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Summary Details Grid: Course Name, Instructor, Price, Expected Fees, Backend Generated ID */}
            <div className="bg-white/5 p-4 rounded-xl space-y-2.5 border border-white/10 text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400 uppercase font-semibold">Course Name</span>
                <span className="font-bold text-white text-sm max-w-[240px] truncate text-right">{course.title}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400 uppercase font-semibold">Instructor Name</span>
                <span className="font-medium text-gray-200">{instructorName}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400 uppercase font-semibold">Course Price</span>
                <span className="font-bold text-emerald-400 text-sm">EGP {course.price?.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-gray-400 uppercase font-semibold">Expected Fees</span>
                <span className="font-semibold text-amber-400">EGP {expectedFees}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400 uppercase font-semibold">Generated Backend ID</span>
                <span className="font-mono text-indigo-300 font-bold">{previewProgramId}</span>
              </div>
            </div>

            {/* Transfer Account Guide */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-indigo-300">Official Transfer Accounts:</div>
              <div className="flex justify-between text-gray-300">
                <span>📱 Vodafone Cash: <strong className="text-white font-mono">01000000000</strong></span>
                <span>🏦 InstaPay: <strong className="text-white font-mono">instapay@program</strong></span>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="vodafone_cash" className="bg-gray-900">Vodafone Cash</option>
                  <option value="instapay" className="bg-gray-900">InstaPay</option>
                  <option value="mobile_wallet" className="bg-gray-900">Mobile Wallet</option>
                </select>
              </div>

              {/* Payer Phone / Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Phone / Account Used</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01012345678 or handle"
                  value={payerNumber}
                  onChange={(e) => setPayerNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* External Provider Transaction ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Provider Transaction ID</label>
              <input
                type="text"
                required
                placeholder="e.g. VF-982734982 or InstaPay Ref"
                value={providerTxId}
                onChange={(e) => setProviderTxId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Screenshot Proof URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Screenshot Proof URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com/payment-receipt.jpg"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Enrollment Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
