document.addEventListener("click", (event) => {
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
