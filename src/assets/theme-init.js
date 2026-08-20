(() => {
  const savedTheme = localStorage.getItem("centro-ti-theme") || localStorage.getItem("reservalab-theme");
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("app-dark", theme === "dark");
})();
