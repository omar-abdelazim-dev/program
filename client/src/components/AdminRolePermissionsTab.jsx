import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_PERMISSIONS = {
  admin: {
    label: 'Admin',
    canApproveCourses: true,
    canManageUsers: true,
    canViewFinancials: true,
    canApprovePayouts: false,
    canManageSystemConfig: false,
  },
  superadmin: {
    label: 'Super Admin',
    canApproveCourses: true,
    canManageUsers: true,
    canViewFinancials: true,
    canApprovePayouts: true,
    canManageSystemConfig: true,
  },
  instructor: {
    label: 'Instructor',
    canApproveCourses: false,
    canManageUsers: false,
    canViewFinancials: false,
    canApprovePayouts: false,
    canManageSystemConfig: false,
  },
};

const PERMISSION_LABELS = {
  canApproveCourses: 'Approve / Reject Courses',
  canManageUsers: 'Block / Promote Users',
  canViewFinancials: 'View Financial Reports',
  canApprovePayouts: 'Approve Payout Requests',
  canManageSystemConfig: 'Modify System Configuration',
};

export default function AdminRolePermissionsTab({ user }) {
  const { t } = useTranslation();
  const [permissions] = useState(DEFAULT_PERMISSIONS);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '8px 0' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-h)' }}>
        {t('admin.roles.permissions_title', 'Role Permissions')}
      </h2>
      <p style={{ color: 'var(--c-sub)', marginBottom: '32px', fontSize: '0.95rem' }}>
        {t('admin.roles.permissions_desc', 'An overview of what each role can do on the platform.')}
      </p>

      <div className="glass-card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px 20px', color: 'var(--c-sub)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Permission
              </th>
              {Object.values(permissions).map(role => (
                <th key={role.label} style={{ padding: '14px 20px', color: 'var(--c-sub)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '14px 20px', color: 'var(--text-h)', fontSize: '0.95rem' }}>{label}</td>
                {Object.entries(permissions).map(([roleKey, role]) => (
                  <td key={roleKey} style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {role[key] ? (
                      <span style={{ color: '#10b981', fontSize: '1.1rem' }}>&#10003;</span>
                    ) : (
                      <span style={{ color: 'var(--c-sub)', fontSize: '1.1rem' }}>&ndash;</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {user?.role !== 'superadmin' && (
        <p style={{ marginTop: '16px', color: 'var(--c-sub)', fontSize: '0.85rem', textAlign: 'center' }}>
          {t('admin.roles.superadmin_only_note', 'Only Super Admins can modify role permissions.')}
        </p>
      )}
    </div>
  );
}
