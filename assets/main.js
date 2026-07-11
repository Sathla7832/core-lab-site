document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".nav-toggle");
  if (toggle) document.querySelector(".nav-links").classList.toggle("open");
});
