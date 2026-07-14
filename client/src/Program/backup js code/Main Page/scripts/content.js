const currentUser = {
  name: "Ahmed Nashaat",
  email: "ahmadnashat04@gmail.com",
  role: "student",
};

// --- MOCK DATA ---
const suggestedCourses = [
  { title: "Advanced React Patterns", category: "Development", instructor: "Dr. Sarah", rating: "4.9", students: "12k", color: "linear-gradient(135deg, #3B82F6, #8B5CF6)" },
  { title: "Python for Data Science", category: "Data", instructor: "Dr. Omar", rating: "4.8", students: "8.5k", color: "linear-gradient(135deg, #10B981, #3B82F6)" },
  { title: "UI/UX Masterclass", category: "Design", instructor: "Prof. Layla", rating: "4.9", students: "15k", color: "linear-gradient(135deg, #EC4899, #8B5CF6)" },
  { title: "Business Marketing", category: "Business", instructor: "Dr. Khaled", rating: "4.7", students: "10k", color: "linear-gradient(135deg, #F59E0B, #EF4444)" },
];

const learningPaths = [
  { title: "Become a Full-Stack Web Developer", courses: 8, duration: "6 Months", color: "linear-gradient(135deg, #8B5CF6, #3B82F6)" },
  { title: "Data Scientist Career Path", courses: 6, duration: "4 Months", color: "linear-gradient(135deg, #10B981, #F59E0B)" },
];

const topInstructors = [
  { name: "Dr. Khaled", role: "AI Researcher", image: "https://i.pravatar.cc/150?u=drkhaled" },
  { name: "Dr. Sarah", role: "Frontend Lead", image: "https://i.pravatar.cc/150?u=drsarah" },
  { name: "Prof. Layla", role: "Design Director", image: "https://i.pravatar.cc/150?u=proflayla" },
  { name: "Dr. Omar", role: "Data Scientist", image: "https://i.pravatar.cc/150?u=dromar" }
];

const topTopics = ["Web Development", "Artificial Intelligence", "Data Science", "UI/UX Design", "Cybersecurity", "Cloud Computing"];
const trending = ["Next.js App Router", "Deep Learning Fundamentals", "Figma Advanced Prototyping", "Docker & Kubernetes"];

const enrolledCourses = [
  { title: "Full-Stack Web Development", instructor: "Dr. Sarah", progress: 65, lastLesson: "Understanding React Hooks", image: "linear-gradient(135deg, #3B82F6, #8B5CF6)" },
  { title: "Data Structures & Algorithms", instructor: "Dr. Omar", progress: 30, lastLesson: "Big O Notation", image: "linear-gradient(135deg, #10B981, #3B82F6)" },
  { title: "UI/UX Design Fundamentals", instructor: "Prof. Layla", progress: 100, lastLesson: "Final Project Submitted", image: "linear-gradient(135deg, #EC4899, #8B5CF6)" },
];

const contentDiv = document.querySelector(".content");

// --- EXPLORE STATE ---
let currentCategory = "All";
window.setCategory = function(event, cat) {
    if (event) event.preventDefault();
    currentCategory = cat;
    updateFilteredCourses();
};

function updateFilteredCourses() {
    const filteredCourses = currentCategory === "All" ? suggestedCourses : suggestedCourses.filter(c => c.category === currentCategory);
    const coursesRow = document.querySelector('.courses-row');
    if (!coursesRow) return;

    coursesRow.innerHTML = filteredCourses.length > 0 ? filteredCourses.map((course, idx) => `
        <div class="course-card glass-card animate-entrance" style="animation-delay: ${0.05 + (idx * 0.1)}s">
            <div class="course-thumb" style="background: ${course.color}"></div>
            <div class="course-info">
                <h3>${course.title}</h3>
                <p>${course.instructor}</p>
                <div class="course-meta">
                    <span class="rating">⭐ ${course.rating}</span>
                    <span class="students">👨‍🎓 ${course.students}</span>
                </div>
            </div>
        </div>
    `).join('') : '<p style="color: var(--c-sub);">No courses found in this category.</p>';

    // Update active state on filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.innerText === currentCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- RENDER EXPLORE ---
function renderExplore() {
  const firstName = currentUser.name.split(" ")[0];
  const categories = ["All", "Development", "Design", "Data", "Business"];
  const filteredCourses = currentCategory === "All" ? suggestedCourses : suggestedCourses.filter(c => c.category === currentCategory);

  contentDiv.innerHTML = `
    <!-- Hero Banner -->
    <div class="hero-section glass-card animate-entrance" style="animation-delay: 0.1s">
      <div class="hero-content">
        <h1>Ready to level up, ${firstName}?</h1>
        <p>Discover new skills, dive into hot topics, and learn from the industry's best instructors.</p>
      </div>
      <button type="button" class="hero-btn glass-btn">Explore Catalog</button>
    </div>

    <div class="dashboard-grid">
      <div class="main-column">

        <!-- Learning Paths (NEW) -->
        <section class="dashboard-section animate-entrance" style="animation-delay: 0.2s">
          <h2>Curated Learning Paths</h2>
          <div class="paths-row">
            ${learningPaths.map((path, idx) => `
              <div class="path-card glass-card animate-entrance" style="animation-delay: ${0.3 + (idx * 0.1)}s; background: ${path.color}">
                <h3>${path.title}</h3>
                <p>${path.courses} Courses • ${path.duration}</p>
                <button type="button" class="path-btn">Start Path</button>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Suggested Courses with Filters (NEW) -->
        <section class="dashboard-section animate-entrance" style="animation-delay: 0.4s">
          <div class="section-header">
            <h2>Recommended for You</h2>
            <a href="#" class="view-all">View all</a>
          </div>
          
          <div class="category-filters">
            ${categories.map(cat => `
              <button type="button" class="filter-btn glass-card hover-glow ${cat === currentCategory ? 'active' : ''}" onclick="setCategory(event, '${cat}')">${cat}</button>
            `).join('')}
          </div>

          <div class="courses-row">
            ${filteredCourses.length > 0 ? filteredCourses.map((course, idx) => `
              <div class="course-card glass-card animate-entrance" style="animation-delay: ${0.1 + (idx * 0.1)}s">
                <div class="course-thumb" style="background: ${course.color}"></div>
                <div class="course-info">
                  <h3>${course.title}</h3>
                  <p>${course.instructor}</p>
                  <div class="course-meta">
                    <span class="rating">⭐ ${course.rating}</span>
                    <span class="students">👨‍🎓 ${course.students}</span>
                  </div>
                </div>
              </div>
            `).join('') : '<p style="color: var(--c-sub);">No courses found in this category.</p>'}
          </div>
        </section>

        <!-- Top Instructors -->
        <section class="dashboard-section animate-entrance" style="animation-delay: 0.5s">
          <h2>Top Instructors</h2>
          <div class="instructors-row">
            ${topInstructors.map((inst, idx) => `
              <div class="instructor-card glass-card animate-entrance" style="animation-delay: ${0.6 + (idx * 0.1)}s">
                <img class="inst-avatar" src="${inst.image}" alt="${inst.name}" style="object-fit: cover;" />
                <h3>${inst.name}</h3>
                <p>${inst.role}</p>
                <button type="button" class="follow-btn glass-btn">Follow</button>
              </div>
            `).join('')}
          </div>
        </section>
      </div>

      <div class="side-column">
        <!-- Top Topics -->
        <section class="dashboard-section side-card glass-card animate-entrance" style="animation-delay: 0.4s">
          <h2>Top Topics</h2>
          <div class="topics-pills">
            ${topTopics.map((topic, idx) => `
              <span class="topic-pill glass-card hover-glow animate-entrance" style="animation-delay: ${0.5 + (idx * 0.05)}s">${topic}</span>
            `).join('')}
          </div>
        </section>

        <!-- Trending -->
        <section class="dashboard-section side-card glass-card animate-entrance" style="animation-delay: 0.6s">
          <h2>Trending This Week <span class="fire-emoji">🔥</span></h2>
          <ul class="trending-list">
            ${trending.map((trend, i) => `
              <li class="glass-card hover-glow animate-entrance" style="animation-delay: ${0.7 + (i * 0.1)}s"><span class="trend-num">${i + 1}</span> ${trend}</li>
            `).join('')}
          </ul>
        </section>
      </div>
    </div>
  `;
}

// --- RENDER DASHBOARD ---
function renderDashboard() {
  const completed = enrolledCourses.filter(c => c.progress === 100).length;

  contentDiv.innerHTML = `
    <div class="hero-section glass-card animate-entrance" style="animation-delay: 0.1s; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1));">
        <div class="hero-content">
            <h1>Your Progress Dashboard</h1>
            <p>You are enrolled in ${enrolledCourses.length} courses and have completed ${completed}. Keep going!</p>
        </div>
    </div>

    <!-- Stats Grid -->
    <div class="topics-pills animate-entrance" style="margin-top: 32px; animation-delay: 0.2s;">
        <div class="side-card glass-card hover-glow" style="flex: 1; text-align: center;">
            <h1 style="color: var(--c-orange); margin: 0 0 10px 0; font-size: 2.5rem;">${enrolledCourses.length}</h1>
            <p style="margin: 0; font-weight: 600;">Enrolled Courses</p>
        </div>
        <div class="side-card glass-card hover-glow" style="flex: 1; text-align: center;">
            <h1 style="color: var(--c-purple); margin: 0 0 10px 0; font-size: 2.5rem;">${completed}</h1>
            <p style="margin: 0; font-weight: 600;">Completed</p>
        </div>
        <div class="side-card glass-card hover-glow" style="flex: 1; text-align: center;">
            <h1 style="color: var(--c-pink); margin: 0 0 10px 0; font-size: 2.5rem;">3</h1>
            <p style="margin: 0; font-weight: 600;">Assignments Due</p>
        </div>
    </div>

    <!-- Continue Learning (NEW) -->
    <section class="dashboard-section animate-entrance" style="animation-delay: 0.4s; margin-top: 40px;">
      <h2>Continue Learning</h2>
      <div class="continue-row">
        ${enrolledCourses.filter(c => c.progress < 100).map((course, idx) => `
          <div class="continue-card glass-card animate-entrance" style="animation-delay: ${0.5 + (idx * 0.1)}s">
            <div class="continue-info">
              <div class="continue-thumb" style="background: ${course.image}"></div>
              <div class="continue-details">
                <h3>${course.title}</h3>
                <p>Up next: <strong style="color: var(--c-light);">${course.lastLesson}</strong></p>
                <div class="progress-bar-container">
                  <div class="progress-bar" style="width: ${course.progress}%"></div>
                </div>
                <span class="progress-text">${course.progress}% Complete</span>
              </div>
            </div>
            <button type="button" class="glass-btn play-btn">▶ Resume</button>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

// --- TAB SWITCHING LOGIC ---
const tabExplore = document.getElementById("tab-explore");
const tabDashboard = document.getElementById("tab-dashboard");
const navIndicator = document.getElementById("navIndicator");
const tabs = [tabExplore, tabDashboard];

function updateIndicator(activeTab) {
  if (!navIndicator || !activeTab) return;
  const leftPos = activeTab.offsetLeft;
  const width = activeTab.offsetWidth;
  navIndicator.style.left = leftPos + "px";
  navIndicator.style.width = width + "px";
}

function switchTab(activeTab, renderFunc) {
  tabs.forEach(tab => tab?.classList.remove("active"));
  activeTab?.classList.add("active");
  updateIndicator(activeTab);
  renderFunc();
}

if (tabExplore && tabDashboard) {
  tabExplore.addEventListener("click", () => switchTab(tabExplore, renderExplore));
  tabDashboard.addEventListener("click", () => switchTab(tabDashboard, renderDashboard));
}

// Initial Load
renderExplore();

setTimeout(() => {
  updateIndicator(tabExplore);
}, 50);

window.addEventListener("resize", () => {
  const activeTab = document.querySelector(".nav-tab.active");
  if (activeTab) updateIndicator(activeTab);
});

// --- THEME TOGGLE LOGIC ---
const themeToggleBtn = document.getElementById("themeToggle");
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
  });
}

// Initial Load
renderExplore();
