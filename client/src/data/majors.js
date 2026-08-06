// Curated majors offered at registration / in Settings, each with the number
// of semesters the Home page will render sections for.
export const MAJORS = [
  { id: 'Computer Science', label: 'Computer Science', semesters: 8 },
  { id: 'Information Technology', label: 'Information Technology', semesters: 8 },
  { id: 'Software Engineering', label: 'Software Engineering', semesters: 8 },
  { id: 'Electrical Engineering', label: 'Electrical Engineering', semesters: 8 },
  { id: 'Mechanical Engineering', label: 'Mechanical Engineering', semesters: 8 },
  { id: 'Civil Engineering', label: 'Civil Engineering', semesters: 8 },
  { id: 'Business Administration', label: 'Business Administration', semesters: 8 },
  { id: 'Accounting', label: 'Accounting', semesters: 8 },
  { id: 'Marketing', label: 'Marketing', semesters: 8 },
  { id: 'Design', label: 'Design', semesters: 8 },
  { id: 'Medicine', label: 'Medicine', semesters: 10 },
  { id: 'Pharmacy', label: 'Pharmacy', semesters: 10 },
  { id: 'Dentistry', label: 'Dentistry', semesters: 10 },
  { id: 'Architecture', label: 'Architecture', semesters: 10 },
  { id: 'Arts & Humanities', label: 'Arts & Humanities', semesters: 8 },
  { id: 'Law', label: 'Law', semesters: 8 },
  { id: 'Sciences', label: 'Sciences', semesters: 8 },
  { id: 'Education', label: 'Education', semesters: 8 },
];

export function getMajor(id) {
  return MAJORS.find((m) => m.id === id) || null;
}
