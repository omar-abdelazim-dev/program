import { useState, useEffect } from "react";
import api from "../api/axios";
import CourseCard from "./CourseCard";
import InstructorCard from "./InstructorCard";
import { EXPLORE_CATEGORIES, INSTRUCTORS_TAB, ALL_TAB } from "../data/exploreCategories";
import "../styles/explore.css";

const SEARCH_DEBOUNCE_MS = 300;
const TABS = [ALL_TAB, INSTRUCTORS_TAB, ...EXPLORE_CATEGORIES];

// The Explore page — was the dead "Courses" sidebar tab. Category tabs +
// search filter instantly, no navigation. The personalized, major-driven
// feed lives on the Home page (ExploreTab.jsx) now.
export default function DiscoverTab({ searchQuery = "" }) {
  const [activeTab, setActiveTab] = useState(ALL_TAB);
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
    if (activeTab !== ALL_TAB) params.category = activeTab;
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
          Explore
        </h1>

        <div className="explore-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`explore-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {showInstructorRow && (
          <section style={{ marginBottom: "8px" }}>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.1rem", margin: "0 0 16px 0" }}>
              Instructors matching "{debouncedSearch}"
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
            <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="cc-skeleton solid-card skeleton-shimmer" style={{ height: "220px" }} />
              ))}
            </div>
          ) : instructors.length > 0 ? (
            <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
              {instructors.map((instructor, idx) => (
                <InstructorCard key={instructor.id} instructor={instructor} idx={idx} />
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
              {debouncedSearch ? `No instructors found for "${debouncedSearch}".` : "No instructors yet."}
            </p>
          )
        ) : coursesLoading ? (
          <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cc-skeleton solid-card skeleton-shimmer" style={{ height: "320px" }} />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {courses.map((course, idx) => (
              <CourseCard key={course._id || idx} course={course} idx={idx} />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
            {debouncedSearch
              ? `No courses found for "${debouncedSearch}"${activeTab !== ALL_TAB ? ` in ${activeTab}` : ""}.`
              : `No courses found in ${activeTab}.`}
          </p>
        )}
      </div>
    </div>
  );
}
