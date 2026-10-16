window.iwalpapper?.on?.("settings", (s) => {
  const style = document.body.style;
  style.setProperty("--from", s.from);
  style.setProperty("--to", s.to);
  style.setProperty("--angle", s.style === "Vertical" ? "180deg" : "135deg");
  // Speed changes the rate, not the duration: a new duration would move the drift to another
  // point of its loop, so every step of the slider would jump it ahead.
  for (const animation of document.getAnimations()) animation.updatePlaybackRate(s.speed);
});
