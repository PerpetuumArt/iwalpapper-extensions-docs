let seconds = false;
function render() {
  const now = new Date();
  time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined });
  date.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}
window.iwalpapper?.on?.("settings", (s) => { seconds = s.seconds; render(); });
render();
setInterval(render, 1000);
