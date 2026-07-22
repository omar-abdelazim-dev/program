import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import CourseCard from "./CourseCard";

const SEARCH_DEBOUNCE_MS = 300;

export default function ExploreTab({ user, searchQuery = "" }) {
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  const categories = ["All", "Development", "Design", "Data", "Business"];
  const [currentCategory, setCurrentCategory] = useState("All");
  const categoryContainerRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
  const [websiteContent, setWebsiteContent] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (currentCategory !== "All") params.category = currentCategory;
        const [res, contentRes] = await Promise.all([
          api.get("/courses", { params, signal: controller.signal }),
          api.get("/website/public/content").catch(() => null),
        ]);
        setCourses(res.data.data || res.data.courses || []);
        if (contentRes && contentRes.data) {
          setWebsiteContent(contentRes.data);
        }
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        console.error("Failed to fetch courses", err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchCourses();
    return () => controller.abort();
  }, [debouncedSearch, currentCategory]);

  return (
    <>
      {/* Hero Banner */}
      {(!websiteContent ||
        websiteContent.homepage?.sectionsVisibility?.hero) && (
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
              {websiteContent?.homepage?.hero?.title
                ? websiteContent.homepage.hero.title.replace(
                    "{name}",
                    firstName,
                  )
                : `Ready to level up, ${firstName}?`}
            </h1>
            <p
              className="saas-description"
              style={{ color: "var(--text-secondary)", marginBottom: "0" }}
            >
              {websiteContent?.homepage?.hero?.subtitle ||
                "Discover new skills, dive into hot topics, and learn from the industry's best instructors."}
            </p>
          </div>
          <button
            type="button"
            className="hero-btn solid-btn"
            style={{
              padding: "12px 24px",
              borderRadius: "50px",
              background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
              color: "#ffffff",
              fontWeight: "600",
            }}
          >
            {websiteContent?.homepage?.hero?.primaryButtonText ||
              "Explore Catalog"}
          </button>
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
            <h3 style={{ margin: 0, fontWeight: "bold" }}>
              {websiteContent.homepage.banner.title}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
              {websiteContent.homepage.banner.description}
            </p>
          </div>
          {websiteContent.homepage.banner.ctaText && (
            <button
              className="solid-btn"
              style={{
                background: "var(--bg-main)",
                color: "var(--text-primary)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "50px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {websiteContent.homepage.banner.ctaText}
            </button>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="main-column" style={{ width: "100%" }}>
          <section
            className="dashboard-section animate-entrance"
            style={{ animationDelay: "0.4s" }}
          >
            <div
              className="section-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ color: "var(--text-primary)", margin: 0, fontSize: "1.5rem" }}>
                Recommended for You
              </h2>
              <a
                href="#"
                className="view-all"
                style={{
                  color: "var(--text-secondary)",
                  background: "var(--bg-surface)",
                  border: "none",
                  padding: "8px 24px",
                  borderRadius: "50px",
                  textDecoration: "none",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                  display: "inline-block",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0px 4px 10px rgba(0,0,0,0.1)";
                }}
              >
                View all
              </a>
            </div>

            {/* Category filters */}
            <div
              className="category-filters"
              style={{
                position: "relative",
                display: "flex",
                gap: "12px",
                marginBottom: "32px",
                flexWrap: "wrap",
              }}
              ref={categoryContainerRef}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="filter-btn"
                  style={{
                    background:
                      cat === currentCategory
                        ? "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)"
                        : "var(--bg-surface)",
                    color:
                      cat === currentCategory
                        ? "#ffffff"
                        : "var(--text-secondary)",
                    border: "none",
                    padding: "8px 24px",
                    borderRadius: "50px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow:
                      cat !== currentCategory
                        ? "0px 4px 10px rgba(0,0,0,0.1)"
                        : "none",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentCategory(cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Course grid */}
            {isLoading ? (
              <div
                className="cc-skeleton-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "24px",
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="cc-skeleton solid-card"
                    style={{
                      height: "320px",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  />
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div
                className="cc-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "24px",
                }}
              >
                {courses.map((course, idx) => (
                  <CourseCard
                    key={course._id || idx}
                    course={course}
                    idx={idx}
                  />
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: "var(--text-secondary)",
                  padding: "32px 0",
                  textAlign: "center",
                }}
              >
                {debouncedSearch
                  ? `No courses found for "${debouncedSearch}"${currentCategory !== "All" ? ` in ${currentCategory}` : ""}.`
                  : "No courses found in this category."}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
