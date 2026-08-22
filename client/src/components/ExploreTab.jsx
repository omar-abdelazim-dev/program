import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import CourseCard from "./CourseCard";
import CardSkeleton from "./common/CardSkeleton";
import { useTranslation } from "react-i18next";
import { COLLEGES } from "../data/colleges";
import "../styles/home.css";

const SEARCH_DEBOUNCE_MS = 300;

// This is the Home page — it now personalizes the feed by the student's college,
// showing a grid of suggested courses for that college.
export default function ExploreTab({ user, searchQuery = "", isLightMode }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  
  const userAcademicType = user?.academicType || 'college';
  const userCollegeId = userAcademicType === 'college' ? user?.college : '';
  const userSchoolLevel = userAcademicType === 'school' ? user?.academicGroup : '';
  const userAcademicGroup = userSchoolLevel || userCollegeId;
  const collegeObj = COLLEGES.find((c) => c.id === userCollegeId);
  let collegeLabel = collegeObj ? t(collegeObj.key, collegeObj.id) : userCollegeId;
  
  if (collegeLabel && typeof collegeLabel === 'string') {
    collegeLabel = collegeLabel.replace(/^College of /i, '').trim();
  }

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
  const [websiteContent, setWebsiteContent] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [collegeCourses, setCollegeCourses] = useState([]);
  const [collegeLoading, setCollegeLoading] = useState(false);

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

  // Personalized: request courses for the student's college.
  useEffect(() => {
    if (debouncedSearch || !userAcademicGroup) return;
    const controller = new AbortController();
    setCollegeLoading(true);
    api.get("/courses", { params: userAcademicType === 'school'
      ? { academicType: 'school', academicGroup: userSchoolLevel, limit: 50 }
      : { college: userCollegeId, limit: 50 }, signal: controller.signal })
      .then((res) => setCollegeCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setCollegeLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, userAcademicGroup, userAcademicType, userCollegeId, userSchoolLevel]);

  // No college set yet: fall back to a single general "Recommended" grid.
  useEffect(() => {
    if (debouncedSearch || userAcademicGroup) return;
    const controller = new AbortController();
    setFallbackLoading(true);
    api.get("/courses", { params: { limit: 12 }, signal: controller.signal })
      .then((res) => setFallbackCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setFallbackLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, userAcademicGroup]);

  const coursesBySemester = collegeCourses.reduce((groups, course) => {
    const key = course.semester || 'Unassigned';
    (groups[key] ||= []).push(course);
    return groups;
  }, {});

  const skeletonGrid = <CardSkeleton type="course" count={4} />;

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
                : userAcademicGroup
                ? t('student.home.subtitle_college', "Here's what's next in your {{college}} path.", { college: collegeLabel })
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

      {!userAcademicGroup && !debouncedSearch && user?.role === 'student' && (
        <div className="home-major-prompt animate-entrance">
          <span>{t('student.home.set_college_prompt', 'Set your college in Settings to personalize your home feed with courses for your program.')}</span>
          <Link to="/student/settings">{t('student.home.set_college_link', 'Set your college →')}</Link>
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
                <div className="cc-grid">{searchResults.map((course, idx) => <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />)}</div>
              ) : (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_results_for', 'No courses found for "{{query}}".', { query: debouncedSearch })}
                </p>
              )}
            </section>
          ) : userAcademicGroup ? (
            <section className="dashboard-section animate-entrance">
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 20px 0", fontSize: "1.5rem" }}>
                {userAcademicType === 'school' ? `${userSchoolLevel} courses` : t('student.home.courses_for_college', 'Courses for {{college}}', { college: collegeLabel })}
              </h2>
              {collegeLoading ? skeletonGrid : <>
                {Object.entries(coursesBySemester).sort(([a], [b]) => Number(a) - Number(b)).map(([semester, courses]) => (
                  <div key={semester} className="home-semester-section"><h2>{semester === 'Unassigned' ? t('student.home.courses', 'Courses') : `${userAcademicType === 'school' ? userSchoolLevel : collegeLabel} Semester ${semester}`}</h2><div className="cc-grid">{courses.map((course, idx) => <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />)}</div></div>
                ))}
              </>}
              {collegeCourses.length === 0 && !collegeLoading && (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_college_courses', 'No {{college}} courses are available yet. Check back soon.', { college: collegeLabel })}
                </p>
              )}
            </section>
          ) : (
            <section className="dashboard-section animate-entrance">
              <h2 style={{ color: "var(--text-primary)", margin: "0 0 20px 0", fontSize: "1.5rem" }}>
                {t('student.home.all_courses', 'All Courses')}
              </h2>
              {fallbackLoading ? skeletonGrid : fallbackCourses.length > 0 ? (
                <div className="cc-grid">{fallbackCourses.map((course, idx) => <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />)}</div>
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
