// sideBar.js

const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sideBar");
  const collapseBtn = document.getElementById("collapseBtn");
  const themeBtn = document.getElementById("themeToggle");
  const contentArea = document.querySelector(".content");
  const buttons = document.querySelectorAll(
    ".sideBarButton:not(.collapse-btn)",
  );

  // 1. Single function that handles rendering and button styling
  function renderTab(tabKey) {
    // Load the HTML content from content.js
    if (TABS_CONTENT[tabKey]) {
      contentArea.innerHTML = TABS_CONTENT[tabKey];
    } else {
      // Fallback placeholder if the content template isn't written yet
      contentArea.innerHTML = `<h1>${tabKey}</h1>`;
    }

    // Clear active styling from ALL buttons
    buttons.forEach((b) => b.classList.remove("active"));

    // Add active styling to the current tab button
    const activeBtn = document.querySelector(`.${tabKey}.sideBarButton`);
    if (activeBtn) activeBtn.classList.add("active");
  }

  // 2. Render Dashboard on start
  renderTab("dashboard");

  // 3. Tooltips for collapsed state
  buttons.forEach((btn) => {
    const label = btn.querySelector(".btn-label");
    if (label) btn.setAttribute("data-tooltip", label.textContent.trim());
  });

  // 4. Click listener: Dynamically call renderTab on click
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Get the first class of the button (e.g. "dashboard", "myCourses", "browseCourses")
      const tabKey = btn.classList[0];
      renderTab(tabKey);
    });
  });

  // 5. Collapse sidebar listener
  collapseBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });

  // 6. Light / dark toggle listener
  let isLight = false;
  themeBtn.addEventListener("click", () => {
    isLight = !isLight;
    document.body.classList.toggle("light-mode", isLight);
    themeBtn.innerHTML = isLight ? MOON_ICON : SUN_ICON;
  });
});
