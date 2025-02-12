const paralax_el = document.querySelectorAll(".paralax");
const main = document.querySelector("main");
let xValue = 0, yValue = 0;

window.addEventListener("mousemove", (e) => {
  xValue = (e.clientX - window.innerWidth / 2) / 50;
  yValue = (e.clientY - window.innerHeight / 2) / 50;

  paralax_el.forEach((el) => {
    let speedx = el.dataset.speedx;
    let speedy = el.dataset.speedy;
    let speedz = el.dataset.speedz;
    let isInLeft = parseFloat(getComputedStyle(el).left) < window.innerWidth / 2 ? 1 : -1;
    let zValue = (e.clientX - parseFloat(getComputedStyle(el).left)) * isInLeft * 0.1;
    el.style.transform = `translateX(calc(-50% + ${-xValue * speedx}px)) translateY(calc(-50% + ${yValue * speedy}px)) perspective(1000px) translateZ(${zValue * speedz}px)`;
  });
});

if (window.innerWidth >=725){
  main.style.maxHeight = `${window.innerWidth * 0.8}px`;
}
