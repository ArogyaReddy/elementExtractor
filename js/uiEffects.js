/**
 * @section: uiEffects.js — Fun Animations (Confetti)
 */
export function showConfetti() {
  const c = document.createElement('div');
  c.className = 'ai-confetti';
  for (let i = 0; i < 18; ++i) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = `hsl(${Math.floor(Math.random()*360)},90%,60%)`;
    c.appendChild(s);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1200);
}
