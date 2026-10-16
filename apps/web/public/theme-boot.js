try {
  var key = "cayfore-theme";
  var legacy = "dcf-theme";
  var theme = localStorage.getItem(key);
  if (theme !== "dark" && theme !== "light") {
    var previous = localStorage.getItem(legacy);
    if (previous === "dark" || previous === "light") {
      theme = previous;
      localStorage.setItem(key, previous);
    }
  }
  localStorage.removeItem(legacy);
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute("content", "#0B2026");
  }
} catch {
  /* storage can be blocked; the page still works in light mode */
}
