import { useState, useEffect } from "react";
import api from "../api/axios";
import CourseCard from "./CourseCard";
import InstructorCard from "./InstructorCard";
import { INSTRUCTORS_TAB, ALL_TAB } from "../data/exploreCategories";
import { COLLEGES } from "../data/colleges";
import { useTranslation } from "react-i18next";
import "../styles/explore.css";

const SEARCH_DEBOUNCE_MS = 300;

// The Explore page — was the dead "Courses" sidebar tab. Category tabs +
// search filter instantly, no navigation. The personalized, major-driven
// feed lives on the Home page (ExploreTab.jsx) now.
export default function DiscoverTab({ searchQuery = "", activeCollege: activeTab = ALL_TAB, isLightMode }) {
  const { t } = useTranslation();
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [instructors, setInstructors] = useState([]);
  const [instructorsLoading, setInstructorsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Course grid — used for the "All" tab and any category tab.
  useEffect(() => {
    if (activeTab === INSTRUCTORS_TAB) return;
    const controller = new AbortController();
    setCoursesLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeTab !== ALL_TAB) params.college = activeTab;
    api.get("/courses", { params, signal: controller.signal })
      .then((res) => setCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setCoursesLoading(false); });
    return () => controller.abort();
  }, [activeTab, debouncedSearch]);

  // Instructor results — the dedicated tab, or a "matching instructors" row
  // alongside course results when the user is searching.
  useEffect(() => {
    if (activeTab !== INSTRUCTORS_TAB && !debouncedSearch) {
      setInstructors([]);
      return;
    }
    const controller = new AbortController();
    setInstructorsLoading(true);
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    api.get("/instructors", { params, signal: controller.signal })
      .then((res) => setInstructors(res.data.instructors || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setInstructorsLoading(false); });
    return () => controller.abort();
  }, [activeTab, debouncedSearch]);

  const showInstructorRow = activeTab !== INSTRUCTORS_TAB && debouncedSearch && instructors.length > 0;

  return (
    <div className="dashboard-grid">
      <div className="main-column" style={{ width: "100%" }}>
        <h1 className="saas-page-title" style={{ color: "var(--text-primary)", marginBottom: "20px" }}>
          {t('nav.explore', 'Explore')}
        </h1>


        {showInstructorRow && (
          <section style={{ marginBottom: "8px" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.1rem", margin: "0 0 16px 0" }}>
              {t('student.instructors_matching', 'Instructors matching')} "{debouncedSearch}"
            </h2>
            <div className="explore-instructor-row">
              {instructors.map((instructor, idx) => (
                <InstructorCard key={instructor.id} instructor={instructor} idx={idx} />
              ))}
            </div>
          </section>
        )}

        {activeTab === INSTRUCTORS_TAB ? (
          instructorsLoading ? (
            <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: "24px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="cc-skeleton solid-card skeleton-shimmer" style={{ height: "220px" }} />
              ))}
            </div>
          ) : instructors.length > 0 ? (
            <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: "24px" }}>
              {instructors.map((instructor, idx) => (
                <InstructorCard key={instructor.id} instructor={instructor} idx={idx} />
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
              {debouncedSearch 
                ? t('student.explore.no_instructors_for', 'No instructors found for "{{query}}".', { query: debouncedSearch }) 
                : t('student.explore.no_instructors_yet', 'No instructors yet.')}
            </p>
          )
        ) : coursesLoading ? (
          <div className="cc-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cc-skeleton solid-card skeleton-shimmer" style={{ height: "320px" }} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="cc-grid">
            {courses.map((course, idx) => (
              <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
            {(() => {
              let translatedTab = activeTab;
              if (activeTab === ALL_TAB) translatedTab = t('student.explore.all', 'All');
              else if (activeTab === INSTRUCTORS_TAB) translatedTab = t('student.explore.instructors', 'Instructors');
              else {
                const collegeObj = COLLEGES.find((c) => c.id === activeTab);
                if (collegeObj) {
                  translatedTab = t(collegeObj.key, collegeObj.id);
                } else {
                  translatedTab = t(`categories.${activeTab.replace(/\s+/g, '_').toLowerCase()}`, activeTab);
                }
              }

              if (debouncedSearch) {
                return activeTab !== ALL_TAB 
                  ? t('student.explore.no_courses_search_category', 'No courses found for "{{query}}" in {{category}}.', { query: debouncedSearch, category: translatedTab })
                  : t('student.explore.no_courses_search', 'No courses found for "{{query}}".', { query: debouncedSearch });
              }
              return t('student.explore.no_courses_category', 'No courses found in {{category}}.', { category: translatedTab });
            })()}
          </p>
        )}
      </div>
    </div>
  );
}

