document.addEventListener("click", (event) => {
  const activityButton = event.target.closest("[data-activity-scroll]");
  if (activityButton) {
    const carousel = document.querySelector("[data-activity-carousel]");
    const track = carousel && carousel.querySelector(".activity-strip");
    const card = carousel && carousel.querySelector(".activity-card");
    if (carousel && track && card) {
      const direction = Number(activityButton.dataset.activityScroll || 1);
      const gap = parseFloat(getComputedStyle(track).gap || "0");
      carousel.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
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
