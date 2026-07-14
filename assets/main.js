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
  window.addEventListener("resize", updateActivityControls);
  updateActivityControls();
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
