import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import CourseCard from "./CourseCard";
import CardSkeleton from "./common/CardSkeleton";
import GlobalAnnouncementBanner from "./GlobalAnnouncementBanner";
import { useTranslation } from "react-i18next";
import { MAJORS } from "../data/majors";
import "../styles/home.css";

const SEARCH_DEBOUNCE_MS = 300;

// This is the Home page — it personalizes the feed by the student's major,
// showing a grid of suggested courses for that major grouped by semester.
export default function ExploreTab({ user, searchQuery = "", selectedMajor = "", selectedCollege = "", isLightMode }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  
  const effectiveMajor = selectedMajor || selectedCollege || "";
  const isAllMajors = effectiveMajor === "";
  const activeMajorId = effectiveMajor;

  const majorObj = MAJORS.find((m) => m.id === activeMajorId);
  const majorLabel = majorObj ? t(`majors.${majorObj.id}`, majorObj.label) : activeMajorId;

  const userCollege = user?.college || "";
  const userMajor = user?.major || "";
  const userSchoolLevel = user?.academicType === "school" ? user?.academicGroup : "";
  const hasUserProgram = Boolean(userCollege || userMajor || userSchoolLevel);

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
  const [websiteContent, setWebsiteContent] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [majorCourses, setMajorCourses] = useState([]);
  const [majorLoading, setMajorLoading] = useState(false);

  const [homeCourses, setHomeCourses] = useState([]);
  const [homeLoading, setHomeLoading] = useState(false);

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

  // Search overrides: flat results grid.
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

  // Filtered by specific major from top dropdown
  useEffect(() => {
    if (debouncedSearch || isAllMajors) return;
    const controller = new AbortController();
    setMajorLoading(true);
    api.get("/courses", { params: { major: activeMajorId, limit: 50 }, signal: controller.signal })
      .then((res) => setMajorCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setMajorLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, isAllMajors, activeMajorId]);

  // Default Home feed: Personalized to student's college & major
  useEffect(() => {
    if (debouncedSearch || !isAllMajors) return;
    const controller = new AbortController();
    setHomeLoading(true);

    const params = { limit: 50 };
    if (hasUserProgram) {
      if (user?.academicType === "school" && userSchoolLevel) {
        params.academicType = "school";
        params.academicGroup = userSchoolLevel;
      } else {
        if (userCollege) params.userCollege = userCollege;
        if (userMajor) params.userMajor = userMajor;
      }
    }

    api.get("/courses", { params, signal: controller.signal })
      .then((res) => setHomeCourses(res.data.courses || []))
      .catch((err) => { if (err.code !== "ERR_CANCELED") console.error(err); })
      .finally(() => { if (!controller.signal.aborted) setHomeLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, isAllMajors, hasUserProgram, userCollege, userMajor, userSchoolLevel, user?.academicType]);

  const activeCoursesList = !isAllMajors ? majorCourses : homeCourses;
  const coursesBySemester = activeCoursesList.reduce((groups, course) => {
    const key = course.semester || 'Unassigned';
    (groups[key] ||= []).push(course);
    return groups;
  }, {});

  const skeletonGrid = <CardSkeleton type="course" count={4} />;

  return (
    <>
      <GlobalAnnouncementBanner />

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
                : activeMajorId
                ? t('student.home.subtitle_major', "Here's what's next in your {{major}} path.", { major: majorLabel })
                : t('student.home.subtitle_default', "Discover new skills, dive into hot topics, and learn from the industry's best instructors.")}
            </p>
          </div>

        </div>
      )}

      {/* Promo Banner */}
      {websiteContent?.homepage?.banner?.enabled && (websiteContent.homepage.banner.title?.trim() || websiteContent.homepage.banner.description?.trim()) && (
        <div
          className="solid-card animate-entrance"
          style={{
            animationDelay: "0.2s",
            marginBottom: "24px",
            background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
            color: "#ffffff",
            padding: "16px 24px",
            borderRadius: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 14px rgba(249, 115, 22, 0.2)"
          }}
        >
          <div>
            {websiteContent.homepage.banner.title && (
              <h3 style={{ margin: 0, fontWeight: "bold", fontSize: "1.05rem" }}>
                {websiteContent.homepage.banner.title}
              </h3>
            )}
            {websiteContent.homepage.banner.description && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.88rem", opacity: 0.95 }}>
                {websiteContent.homepage.banner.description}
              </p>
            )}
          </div>
          {websiteContent.homepage.banner.ctaText && websiteContent.homepage.banner.ctaUrl && (
            <Link
              to={websiteContent.homepage.banner.ctaUrl}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "0.88rem",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
              }}
            >
              {websiteContent.homepage.banner.ctaText}
            </Link>
          )}
        </div>
      )}

      {!user?.major && !activeMajorId && !debouncedSearch && user?.role === 'student' && (
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
                <div className="cc-grid">{searchResults.map((course, idx) => <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />)}</div>
              ) : (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_results_for', 'No courses found for "{{query}}".', { query: debouncedSearch })}
                </p>
              )}
            </section>
          ) : !isAllMajors && activeMajorId ? (
            <section className="dashboard-section animate-entrance">
              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                {t('student.home.courses_for_major', 'Courses for {{major}}', { major: majorLabel })}
              </h2>
              {majorLoading ? skeletonGrid : <>
                {Object.entries(coursesBySemester).sort(([a], [b]) => Number(a) - Number(b)).map(([semester, courses]) => (
                  <div key={semester} className="home-semester-section">
                    {semester !== 'Unassigned' ? (
                      <h2>{t('student.home.semester_n', 'Semester {{n}}', { n: semester })}</h2>
                    ) : Object.keys(coursesBySemester).length > 1 ? (
                      <h2>{t('student.home.other_courses', 'Other Courses')}</h2>
                    ) : null}
                    <div className="cc-grid">
                      {courses.map((course, idx) => (
                        <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
                      ))}
                    </div>
                  </div>
                ))}
              </>}
              {majorCourses.length === 0 && !majorLoading && (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_major_courses', 'No {{major}} courses are available yet. Check back soon.', { major: majorLabel })}
                </p>
              )}
            </section>
          ) : hasUserProgram ? (
            <section className="dashboard-section animate-entrance">
              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                {userMajor
                  ? t('student.home.courses_for_major', 'Courses for {{major}}', { major: userMajor })
                  : userCollege
                  ? t('student.home.courses_for_college', 'Courses for {{college}}', { college: userCollege })
                  : t('student.home.courses_for_you', 'Courses For You')}
              </h2>
              {homeLoading ? skeletonGrid : homeCourses.length > 0 ? (
                Object.entries(coursesBySemester).sort(([a], [b]) => Number(a) - Number(b)).map(([semester, courses]) => (
                  <div key={semester} className="home-semester-section">
                    {semester !== 'Unassigned' ? (
                      <h2>{t('student.home.semester_n', 'Semester {{n}}', { n: semester })}</h2>
                    ) : Object.keys(coursesBySemester).length > 1 ? (
                      <h2>{t('student.home.other_courses', 'Other Courses')}</h2>
                    ) : null}
                    <div className="cc-grid">
                      {courses.map((course, idx) => (
                        <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-secondary)", padding: "32px 0", textAlign: "center" }}>
                  {t('student.home.no_program_courses', 'No courses found for your program yet. Check back soon or select a major above.')}
                </p>
              )}
            </section>
          ) : (
            <section className="dashboard-section animate-entrance">
              <h2
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                {t('student.home.all_courses', 'All Courses')}
              </h2>
              {homeLoading ? skeletonGrid : homeCourses.length > 0 ? (
                <div className="cc-grid">
                  {homeCourses.map((course, idx) => (
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
