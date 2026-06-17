document.addEventListener("DOMContentLoaded", () => {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("#siteMenu");

  if (!topbar || !toggle || !menu) return;

  const setOpen = (isOpen) => {
    topbar.classList.toggle("is-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  toggle.addEventListener("click", () => {
    setOpen(!topbar.classList.contains("is-menu-open"));
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!topbar.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 1101px)").matches) {
      setOpen(false);
    }
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
