try {
  if (localStorage.getItem("dcf-theme") === "dark") {
    document.documentElement.dataset.theme = "dark";
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#0B2026");
  }
} catch {
  /* storage can be blocked; the page still works in light mode */
}
