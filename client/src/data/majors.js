// Curated majors offered at registration / in Settings, each with the number
// of semesters the Home page will render sections for.
export const MAJORS = [
  { id: 'Computer Science', label: 'Computer Science', semesters: 8 },
  { id: 'Business', label: 'Business', semesters: 8 },
  { id: 'Design', label: 'Design', semesters: 8 },
  { id: 'Medicine', label: 'Medicine', semesters: 10 },
  { id: 'Dentistry', label: 'Dentistry', semesters: 10 },
];

export function getMajor(id) {
  return MAJORS.find((m) => m.id === id) || null;
}
