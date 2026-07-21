import sys

filepath = r'client/src/components/AdminPortal.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add import
lines.insert(11, 'import AdminStatisticsTab from "./AdminStatisticsTab";\n')

# 2. Add page-wrapper to loading div
for i, line in enumerate(lines):
    if '  if (loading && !stats && !users.length && !transactions.length) {' in line:
        for j in range(i, i+10):
            if 'style={{' in lines[j] and 'display: "flex",' in lines[j+1]:
                lines.insert(j, '        className="page-wrapper"\n')
                break
        break

# 3. Add page-wrapper to root div
for i, line in enumerate(lines):
    if 'data-role={user?.role}' in line:
        if 'className="page-wrapper"' not in lines[i+1]:
            lines.insert(i+1, '      className="page-wrapper"\n')
        break

# 4. Fix Manage Website icon
for i, line in enumerate(lines):
    if "{ label: 'Manage Website', icon: <path strokeLinecap=" in line:
        lines[i] = line.replace('icon: <path', 'icon: <><path').replace(' /> }', ' /></> }')
        break

# 5. Replace dashboard_stats content
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '{activeTab === "dashboard_stats" && (' in line:
        start_idx = i
        break

if start_idx != -1:
    open_brackets = 0
    for i in range(start_idx, len(lines)):
        open_brackets += lines[i].count('(')
        open_brackets -= lines[i].count(')')
        if open_brackets == 0 and ')}' in lines[i]:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    replacement = [
        '            {activeTab === "dashboard_stats" && (\n',
        '              <AdminStatisticsTab\n',
        '                stats={stats}\n',
        '                revenueAnalytics={revenueAnalytics}\n',
        '                revenueAnalyticsLoading={revenueAnalyticsLoading}\n',
        '              />\n',
        '            )}\n'
    ]
    lines = lines[:start_idx] + replacement + lines[end_idx+1:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
