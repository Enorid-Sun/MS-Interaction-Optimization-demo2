/* Static, synthetic camera fixtures only. No camera/inference API is connected.
 * This adapter starts only after the existing entry-recognition flow succeeds. */
(() => {
  "use strict";
  if (document.body.dataset.planBPage !== "immersive") return;
  const states = [
    { image: "assets/immersive-camera/reached.png", name: "Both target positions reached", hands: [[732,350],[943,350]] },
    { image: "assets/immersive-camera/one-missed.png", name: "One target position not reached", hands: [[732,350],[1035,462]] },
    { image: "assets/immersive-camera/both-missed.png", name: "Both target positions not reached", hands: [[674,456],[998,460]] }
  ];
  const targets = [[732,350],[943,350]], tolerance = 42;
  const initial = { seconds: 132, capacityKg: 81, energyKj: 2.7, caloriesKcal: 14 };
  const button = document.getElementById("iwCameraButton");
  const image = document.getElementById("iwCameraImage");
  const points = document.getElementById("iwCameraPoints");
  const screen = document.getElementById("immersiveWorkoutScreen");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = false, playing = false, ready = false, revision = 0;
  let index = 0, bag = [], elapsed = 0, last = 0, frame = 0, revealAge = null, bridge;
  function reveal() {
    points.querySelectorAll(".camera-target").forEach(el => el.classList.add(el.dataset.result));
    revealAge = null;
  }
  async function show(next, animate = true) {
    const ticket = ++revision;
    ready = false; button.disabled = true;
    button.classList.remove("animating");
    points.replaceChildren();
    image.src = states[next].image;
    try { await image.decode(); } catch {
      if (ticket === revision) {
        button.setAttribute("aria-label", "Demo image unavailable. Reload the page.");
        image.alt = "Demo image unavailable. Reload the page.";
      }
      return;
    }
    if (ticket !== revision) return;
    index = next;
    image.alt = states[index].name + " — AI-generated gym image";
    const results = targets.map(([x,y],i) => {
      const [wx,wy] = states[index].hands[i];
      const hit = Math.hypot(wx-x,wy-y) <= tolerance;
      return { x,y,wx,wy,hit };
    });
    points.innerHTML = results.map(({x,y,wx,wy,hit}) =>
      `<g>${hit ? "" : `<path class="camera-guide" d="M${wx} ${wy} L${x} ${y}"/><circle class="camera-track" cx="${wx}" cy="${wy}" r="11"/>`}
      <g class="camera-target" data-result="${hit ? "hit" : "miss"}" transform="translate(${x} ${y})">
      <circle class="camera-halo" r="40"/><circle class="camera-ring" r="40"/>
      <path class="camera-cross" d="M-11 0H11 M0 -11V11"/><path class="camera-check" d="M-17 0 L-4 13 L20 -15"/>
      <text class="camera-target-label" text-anchor="middle" y="-56">未到位</text></g></g>`
    ).join("");
    button.dataset.state = String(index);
    button.dataset.hits = results.map(r=>r.hit ? "1" : "0").join("");
    button.setAttribute("aria-label", states[index].name + ". Select another simulated image.");
    ready = true; button.disabled = !playing;
    revealAge = 0;
    if (!animate || reduced.matches) reveal();
    else { void button.offsetWidth; button.classList.add("animating"); }
    if (animate) screen.dispatchEvent(new CustomEvent("planb:camera-demo-result", {
      detail: { source: "simulation", stateIndex:index, reached:results.map(r=>r.hit) }
    }));
  }
  function randomNext() {
    if (!active || !playing || !ready) return;
    if (!bag.length) {
      bag = states.map((_,i)=>i);
      for (let i=bag.length-1;i>0;i--) {
        const j = Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]];
      }
      if (bag[bag.length-1]===index) [bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
    }
    show(bag.pop());
  }
  function tick(now) {
    const dt = Math.min(now-last,100); last=now;
    if (playing && !document.hidden) {
      elapsed += dt;
      if (revealAge !== null) { revealAge += dt; if (revealAge >= 320) reveal(); }
      const seconds=initial.seconds+Math.floor(elapsed/1000);
      document.getElementById("iwCameraTime").textContent =
        String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
      bridge.onTick(elapsed/1000);
    }
    if (active) frame=requestAnimationFrame(tick);
  }
  function togglePlaying() {
    playing = !playing;
    screen.classList.toggle("camera-paused",!playing);
    button.disabled = !playing || !ready;
    const control=document.getElementById("iwPlayBtn");
    control.textContent=playing ? "Pause" : "Play";
    control.setAttribute("aria-pressed",String(!playing));
    bridge.onPlaying(playing); last=performance.now();
  }
  button.addEventListener("click",randomNext);
  states.forEach(state => { const preload=new Image();preload.src=state.image; });
  show(0,false);
  document.addEventListener("visibilitychange",()=>{last=performance.now();});
  reduced.addEventListener("change",()=>{if(reduced.matches)reveal();});
  window.PlanBCameraDemo = {
    get active() { return active; },
    start(callbacks) {
      if(active)return;
      bridge=callbacks;active=true;playing=true;last=performance.now();
      button.disabled=!ready;screen.dataset.dataSource="simulation";
      frame=requestAnimationFrame(tick);
    },
    togglePlaying,
    snapshot() {
      return { dataSource:"camera-position-simulation",isSimulated:true,
        sceneLabel:"Simulated position demo",
        durationSeconds:initial.seconds+Math.floor(elapsed/1000),
        capacityKg:initial.capacityKg,energyKj:initial.energyKj,caloriesKcal:initial.caloriesKcal,
        aiSummary:"Synthetic images and preset target positions; no camera measurement or AI score." };
    },
    stop() { active=false;playing=false;cancelAnimationFrame(frame); }
  };
})();
