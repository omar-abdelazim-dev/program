import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import CourseCard from "./CourseCard";
import { useTranslation } from "react-i18next";
import { getMajor } from "../data/majors";
import "../styles/home.css";

const SEARCH_DEBOUNCE_MS = 300;

// This is the Home page (formerly a generic "Explore" catalog) — it now
// personalizes the feed by the student's major, showing one horizontally
// scrollable row of suggested courses per semester. Category-driven
// browsing lives on the separate /student/explore page now.
export default function ExploreTab({ user, searchQuery = "", isLightMode }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  const major = getMajor(user?.major);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
  const [websiteContent, setWebsiteContent] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [semesterCourses, setSemesterCourses] = useState({});
  const [semestersLoading, setSemestersLoading] = useState(false);

  const [fallbackCourses, setFallbackCourses] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    api.get("/website/public/content").then((res) => {
      setWebsiteContent(res.data);
    }).catch(() => {});
  }, []);

  // Search overrides personalization — a flat results grid.
  useEffect(() => {
    if (!debouncedSearch) return;
    const controller = new AbortController();
    setSearchLoading(true);
    api.get("/courses", { params: { search: debouncedSearch }, signal: controller.signal })
      .then((res) => setSearchResults(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch]);

  // Personalized: one request per semester of the student's major.
  useEffect(() => {
    if (debouncedSearch || !major) return;
    const controller = new AbortController();
    setSemestersLoading(true);
    const requests = Array.from({ length: major.semesters }, (_, i) => i + 1).map((semester) =>
      api.get("/courses", { params: { major: major.id, semester, limit: 10 }, signal: controller.signal })
        .then((res) => [semester, res.data.courses || []])
        .catch(() => [semester, []])
    );
    Promise.all(requests).then((results) => {
      if (controller.signal.aborted) return;
      const bySemester = {};
      for (const [semester, courses] of results) bySemester[semester] = courses;
      setSemesterCourses(bySemester);
      setSemestersLoading(false);
    });
    return () => controller.abort();
  }, [debouncedSearch, major]);

  // No major set yet: fall back to a single general "Recommended" grid.
  useEffect(() => {
    if (debouncedSearch || major) return;
    const controller = new AbortController();
    setFallbackLoading(true);
    api.get("/courses", { params: { limit: 12 }, signal: controller.signal })
      .then((res) => setFallbackCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setFallbackLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, major]);

  const skeletonGrid = (
    <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "24px" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="cc-skeleton solid-card skeleton-shimmer" style={{ height: "320px" }} />
      ))}
    </div>
  );

  return (
    <>
      {/* Hero Banner */}
      {(!websiteContent || websiteContent.homepage?.sectionsVisibility?.hero) && (
        <div
          className="hero-section solid-card animate-entrance"
          style={{
            animationDelay: "0.1s",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "40px",
            marginBottom: "24px",
            ...(websiteContent?.homepage?.hero?.heroImage
              ? {
                  backgroundImage: `linear-gradient(rgba(21, 20, 30, 0.8), rgba(21, 20, 30, 0.8)), url(${websiteContent.homepage.hero.heroImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
        >
          <div className="hero-content">
            <h1
              className="saas-page-title"
              style={{ color: "var(--text-primary)", marginBottom: "8px" }}
            >
              {isRTL && websiteContent?.homepage?.hero?.titleAr
                ? websiteContent.homepage.hero.titleAr
                : websiteContent?.homepage?.hero?.title
                ? websiteContent.homepage.hero.title.replace("{name}", firstName)
                : t('student.home.welcome_name', 'Welcome back, {{name}}', { name: firstName })}
            </h1>
            <p
              className="saas-description"
              style={{ color: "var(--text-secondary)", marginBottom: "0" }}
            >
              {isRTL && websiteContent?.homepage?.hero?.subtitleAr
                ? websiteContent.homepage.hero.subtitleAr
                : websiteContent?.homepage?.hero?.subtitle
                ? websiteContent.homepage.hero.subtitle
                : major
                ? t('student.home.subtitle_major', "Here's what's next in your {{major}} path.", { major: major.label })
                : t('student.home.subtitle_default', "Discover new skills, dive into hot topics, and learn from the industry's best instructors.")}
            </p>
          </div>

        </div>
      )}

      {/* Promo Banner */}
      {websiteContent?.homepage?.banner?.enabled && (
        <div
          className="solid-card animate-entrance"
          style={{
            animationDelay: "0.2s",
            marginBottom: "24px",
            background: "var(--color-accent)",
            color: "var(--bg-main)",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontWeight: "bold" }}>{websiteContent.homepage.banner.title}</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>{websiteContent.homepage.banner.description}</p>
          </div>
        </div>
      )}

      {!major && !debouncedSearch && user?.role === 'student' && (
        <div className="home-major-prompt animate-entrance">
          <span>{t('student.home.set_major_prompt', 'Set your major in Settings to personalize your home feed with courses for your program.')}</span>
          <Link to="/student/settings">{t('student.home.set_major_link', 'Set your major →')}</Link>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="main-column" style={{ width: "100%" }}>
          {debouncedSearch ? (
            <section className="dashboard-section animate-entrance">
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 20px 0", fontSize: "1.5rem" }}>
                {t('student.home.search_results_for', 'Search results for "{{query}}"', { query: debouncedSearch })}
              </h2>
              {searchLoading ? skeletonGrid : searchResults.length > 0 ? (
                <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "24px" }}>
                  {searchResults.map((course, idx) => (
                    <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_results_for', 'No courses found for "{{query}}".', { query: debouncedSearch })}
                </p>
              )}
            </section>
          ) : major ? (
            semestersLoading ? (
              skeletonGrid
            ) : Object.values(semesterCourses).some((c) => c.length > 0) ? (
              Array.from({ length: major.semesters }, (_, i) => i + 1)
                .filter((semester) => (semesterCourses[semester] || []).length > 0)
                .map((semester) => (
                  <section key={semester} className="home-semester-section animate-entrance">
                    <h2>{t('student.home.semester_label', '{{major}} – Semester {{semester}}', { major: major.label, semester })}</h2>
                    <div className="home-semester-track">
                      {semesterCourses[semester].map((course, idx) => (
                        <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
                      ))}
                    </div>
                  </section>
                ))
            ) : (
              <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                {t('student.home.no_major_courses', 'No {{major}} courses are available yet. Check back soon.', { major: major.label })}
              </p>
            )
          ) : (
            <section className="dashboard-section animate-entrance">
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 20px 0", fontSize: "1.5rem" }}>
                {t('student.recommended_for_you', 'Recommended for You')}
              </h2>
              {fallbackLoading ? skeletonGrid : fallbackCourses.length > 0 ? (
                <div className="cc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "24px" }}>
                  {fallbackCourses.map((course, idx) => (
                    <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_courses_available', 'No courses available yet.')}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

