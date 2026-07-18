const activityCarousel = document.querySelector("[data-activity-carousel]");
const activityStatus = document.querySelector("[data-activity-status]");
const activityControls = Array.from(document.querySelectorAll("[data-activity-scroll]"));

function activityStep() {
  if (!activityCarousel) return 0;
  const track = activityCarousel.querySelector(".activity-strip");
  const card = activityCarousel.querySelector(".activity-card");
  if (!track || !card) return 0;
  const gap = parseFloat(getComputedStyle(track).gap || "0");
  return card.getBoundingClientRect().width + gap;
}

function updateActivityControls() {
  if (!activityCarousel) return;
  const cards = activityCarousel.querySelectorAll(".activity-card");
  const step = activityStep();
  const index = step ? Math.min(cards.length, Math.max(1, Math.round(activityCarousel.scrollLeft / step) + 1)) : 1;
  const maxScroll = activityCarousel.scrollWidth - activityCarousel.clientWidth - 2;

  if (activityStatus && cards.length) {
    activityStatus.textContent = `${index} / ${cards.length}`;
  }

  activityControls.forEach((control) => {
    const direction = Number(control.dataset.activityScroll || 1);
    control.disabled = direction < 0 ? activityCarousel.scrollLeft <= 2 : activityCarousel.scrollLeft >= maxScroll;
  });
}

document.addEventListener("click", (event) => {
  const activityButton = event.target.closest("[data-activity-scroll]");
  if (activityButton) {
    const carousel = activityCarousel;
    const step = activityStep();
    if (carousel && step) {
      const direction = Number(activityButton.dataset.activityScroll || 1);
      carousel.scrollBy({ left: direction * step, behavior: "smooth" });
    }
    return;
  }

  const toggle = event.target.closest(".nav-toggle");
  if (!toggle) return;

  const nav = document.querySelector(".nav-links");
  if (!nav) return;

  const isOpen = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(isOpen));
  toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const nav = document.querySelector(".nav-links.open");
  const toggle = document.querySelector(".nav-toggle");
  if (!nav || !toggle) return;
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
  toggle.focus();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest(".contact-form[data-mailto]");
  if (!form) return;
  event.preventDefault();

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const recipient = form.dataset.mailto;
  const subject = "CORE Lab website inquiry";
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message
  ].join("\n");

  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

if (activityCarousel) {
  activityCarousel.addEventListener("scroll", updateActivityControls, { passive: true });
  activityCarousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const step = activityStep();
    if (!step) return;
    event.preventDefault();
    activityCarousel.scrollBy({ left: (event.key === "ArrowLeft" ? -1 : 1) * step, behavior: "smooth" });
  });
  window.addEventListener("resize", updateActivityControls);
  updateActivityControls();
}

const publicationTools = document.querySelector("[data-publication-tools]");
if (publicationTools) {
  const search = publicationTools.querySelector("[data-publication-search]");
  const area = publicationTools.querySelector("[data-publication-area]");
  const status = publicationTools.querySelector("[data-publication-status]");
  const years = Array.from(document.querySelectorAll("[data-publication-year]"));
  const allItems = Array.from(document.querySelectorAll(".pub-item"));
  if (area) area.value = "";

  const applyPublicationFilters = () => {
    const query = String(search?.value || "").trim().toLocaleLowerCase();
    const selectedArea = String(area?.value || "");
    const filtersActive = Boolean(query || selectedArea);
    let visibleTotal = 0;

    years.forEach((year) => {
      const items = Array.from(year.querySelectorAll(".pub-item"));
      let visibleYear = 0;
      items.forEach((item) => {
        const matchesText = !query || item.textContent.toLocaleLowerCase().includes(query);
        const matchesArea = !selectedArea || String(item.dataset.pubAreas || "").split("|").includes(selectedArea);
        item.hidden = !(matchesText && matchesArea);
        if (!item.hidden) visibleYear += 1;
      });

      year.hidden = visibleYear === 0;
      year.open = filtersActive ? visibleYear > 0 : year.dataset.defaultOpen === "true";
      const yearLink = publicationTools.querySelector(`[data-publication-year-link="${year.dataset.publicationYear}"]`);
      if (yearLink) yearLink.hidden = year.hidden;
      const count = year.querySelector(".publication-year-count");
      if (count) count.textContent = `${visibleYear} ${visibleYear === 1 ? "article" : "articles"}`;

      const divider = year.querySelector(".publication-divider");
      if (divider) {
        const before = Array.from(divider.parentElement.children).slice(0, Array.from(divider.parentElement.children).indexOf(divider)).some((node) => node.matches?.(".pub-item") && !node.hidden);
        const after = Array.from(divider.parentElement.children).slice(Array.from(divider.parentElement.children).indexOf(divider) + 1).some((node) => node.matches?.(".pub-item") && !node.hidden);
        divider.hidden = !(before && after);
      }
      visibleTotal += visibleYear;
    });

    if (status) status.textContent = `Showing ${visibleTotal} of ${allItems.length} publications`;
  };

  search?.addEventListener("input", applyPublicationFilters);
  area?.addEventListener("change", applyPublicationFilters);
  publicationTools.querySelector("[data-publication-expand]")?.addEventListener("click", () => {
    years.filter((year) => !year.hidden).forEach((year) => { year.open = true; });
  });
  publicationTools.querySelector("[data-publication-collapse]")?.addEventListener("click", () => {
    years.filter((year) => !year.hidden).forEach((year) => { year.open = false; });
  });
  publicationTools.querySelectorAll('.publication-year-nav a').forEach((link) => {
    link.addEventListener("click", () => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) target.open = true;
    });
  });
  applyPublicationFilters();
}

window.addEventListener("load", () => {
  window.setTimeout(() => {
    const visitorStats = document.querySelector("[data-visitor-stats]");
    if (!visitorStats) return;

    const values = Array.from(visitorStats.querySelectorAll("strong"));
    const hasLoadedValue = values.some((value) => value.textContent.trim() && value.textContent.trim() !== "--");
    if (!hasLoadedValue) {
      visitorStats.hidden = true;
    }
  }, 3500);
});
