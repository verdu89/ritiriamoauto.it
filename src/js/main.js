console.log("ritiriamoauto.it ready");
document.getElementById("y").textContent = new Date().getFullYear();

// Placeholder submit (poi colleghiamo Google Script)
const form = document.getElementById("leadForm");
const ok = document.getElementById("ok");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  ok.style.display = "block";
  form.reset();
  setTimeout(() => (ok.style.display = "none"), 3500);
});
