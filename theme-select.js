document.addEventListener("DOMContentLoaded", () => {
  hydrateThemeSelects();

  const observer = new MutationObserver(() => {
    hydrateThemeSelects();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".theme-select")) {
      closeAllThemeSelects();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllThemeSelects();
    }
  });
});

function hydrateThemeSelects() {
  document.querySelectorAll(".quick-filter-field select").forEach((select) => {
    if (!select.dataset.themeSelectReady) {
      createThemeSelect(select);
    }
    updateThemeSelect(select);
  });
}

function createThemeSelect(select) {
  select.dataset.themeSelectReady = "true";
  select.classList.add("native-theme-select");

  const root = document.createElement("div");
  root.className = "theme-select";

  const button = document.createElement("button");
  button.className = "theme-select-button";
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const value = document.createElement("span");
  value.className = "theme-select-value";

  const icon = document.createElement("i");
  icon.dataset.lucide = "chevron-down";
  icon.setAttribute("aria-hidden", "true");

  const menu = document.createElement("div");
  menu.className = "theme-select-menu";
  menu.setAttribute("role", "listbox");

  button.append(value, icon);
  root.append(button, menu);
  select.insertAdjacentElement("afterend", root);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !root.classList.contains("is-open");
    closeAllThemeSelects(root);
    setThemeSelectOpen(root, willOpen);
  });

  select.addEventListener("change", () => {
    updateThemeSelect(select);
  });
}

function updateThemeSelect(select) {
  const root = select.nextElementSibling;
  if (!root?.classList.contains("theme-select")) return;

  const signature = [
    select.value,
    ...Array.from(select.options).map((option) => `${option.value}:${option.textContent}:${option.disabled}`),
  ].join("|");

  if (root.dataset.signature === signature) return;
  root.dataset.signature = signature;

  const value = root.querySelector(".theme-select-value");
  const menu = root.querySelector(".theme-select-menu");
  const selectedOption = select.selectedOptions[0] || select.options[0];

  value.textContent = selectedOption?.textContent || "";
  menu.innerHTML = "";

  Array.from(select.options).forEach((option) => {
    const item = document.createElement("button");
    item.className = "theme-select-option";
    item.type = "button";
    item.setAttribute("role", "option");
    item.dataset.value = option.value;
    item.textContent = option.textContent;
    item.disabled = option.disabled;

    if (option.value === select.value) {
      item.classList.add("is-selected");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }

    item.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      setThemeSelectOpen(root, false);
    });

    menu.append(item);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setThemeSelectOpen(root, isOpen) {
  root.classList.toggle("is-open", isOpen);
  root.querySelector(".theme-select-button")?.setAttribute("aria-expanded", String(isOpen));
}

function closeAllThemeSelects(except) {
  document.querySelectorAll(".theme-select.is-open").forEach((root) => {
    if (root !== except) {
      setThemeSelectOpen(root, false);
    }
  });
}
