import User from '../models/User.js';
import { logAudit } from '../utils/auditLogger.js';

// @route   GET /api/auth/sessions
// @access  Private
export const getAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+activeSessions');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Filter out permanently expired sessions, map to clean presentation object
    const sessions = user.activeSessions
      .filter((session) => !session.revoked && session.expiresAt > Date.now())
      .map((session) => ({
        sessionId: session.sessionId,
        device: session.device,
        ipAddress: session.ipAddress,
        issuedAt: session.issuedAt,
        isCurrentSession: session.sessionId === req.user.sessionId,
      }));

    res.status(200).json({ sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving sessions' });
  }
};

// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.id).select('+activeSessions');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const sessionIndex = user.activeSessions.findIndex((s) => s.sessionId === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ message: 'Session not found' });
    }

    user.activeSessions[sessionIndex].revoked = true;
    await user.save(); // Do not bypass validation

    await logAudit({
      action: 'SESSION_REVOKED',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      metadata: { revokedSessionId: sessionId }
    });

    res.status(200).json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error revoking session' });
  }
};

// @route   DELETE /api/auth/sessions
// @access  Private
export const revokeAllSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+activeSessions');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Revoke all EXCEPT the current one
    let revokedCount = 0;
    user.activeSessions.forEach((session) => {
      if (session.sessionId !== req.user.sessionId && !session.revoked) {
        session.revoked = true;
        revokedCount++;
      }
    });

    if (revokedCount > 0) {
      await user.save(); // Do not bypass validation
    }

    await logAudit({
      action: 'SESSION_REVOKED_ALL',
      module: 'auth',
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
      metadata: { revokedCount }
    });

    res.status(200).json({ message: 'All other sessions revoked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error revoking all sessions' });
  }
};
