import { Dangle } from '../../lib/dangle';

function updateDangle() {
  dangle.setOption({
    stretch: el.offsetWidth,
    minStep: 0,
    maxStep: 4,
  });
}

function updateCarousel() {
  const step = dangle.step;
  const items = document.getElementsByClassName('carousel-item');
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as HTMLElement;
    const index = +item.getAttribute('index');
    if (Math.abs(index - step) > 1) {
      item.style.display = 'none';
      continue;
    }
    item.style.display = 'block';
    const transition = index * el.offsetWidth - dangle.value;
    item.style.transform = `translateX(${transition}px)`;
  }
}

const el = document.getElementById('carousel');
const dangle = new Dangle(el);
dangle.onDidChangeValue.subscribe((value) => {
  updateCarousel();
});
updateDangle();
window.addEventListener('resize', () => {
  updateDangle();
  updateCarousel();
});
updateCarousel();
