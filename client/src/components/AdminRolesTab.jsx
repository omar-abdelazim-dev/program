import AdminRoleManageTab      from './AdminRoleManageTab';
import AdminRolePermissionsTab  from './AdminRolePermissionsTab';
import AdminRoleAssignmentsTab  from './AdminRoleAssignmentsTab';

export default function AdminRolesTab({ user, subTab }) {
  if (subTab === 'permissions') return <AdminRolePermissionsTab user={user} />;
  if (subTab === 'assignments') return <AdminRoleAssignmentsTab user={user} />;
  return <AdminRoleManageTab user={user} />;
}
