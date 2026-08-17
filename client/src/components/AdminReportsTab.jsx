import AdminReportFinancialTab from "./AdminReportFinancialTab";
import AdminReportStudentsTab from "./AdminReportStudentsTab";
import AdminReportInstructorsTab from "./AdminReportInstructorsTab";

import AdminReportExportTab from "./AdminReportExportTab";

export default function AdminReportsTab({ user, subTab }) {
  if (subTab === "financial")   return <AdminReportFinancialTab user={user} />;
  if (subTab === "students")    return <AdminReportStudentsTab user={user} />;
  if (subTab === "instructors") return <AdminReportInstructorsTab user={user} />;
  if (subTab === "export")      return <AdminReportExportTab user={user} />;
  return null;
}
