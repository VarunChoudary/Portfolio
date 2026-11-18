function setupTheme() {
  const button = document.querySelector("#theme-toggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const nextTheme = theme === "dark" ? "light" : "dark";
    const label = `Switch to ${nextTheme} theme`;
    button.setAttribute("aria-label", label);
    button.title = label;
    themeColor.content = theme === "dark" ? "#181818" : "#f8f7fa";
  }

  applyTheme(document.documentElement.dataset.theme);
  button.hidden = false;
  button.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try {
      localStorage.setItem("varun-portfolio-theme", theme);
    } catch {
      // The switch still works for this page when storage is unavailable.
    }
  });
}

function setupMobileNavigation() {
  const button = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const links = [...menu.querySelectorAll("a")];
  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  const mobile = matchMedia("(max-width: 740px)");

  function setMenu(open, restoreFocus = false) {
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    document.body.classList.toggle("menu-open", open);
    main.inert = open;
    footer.inert = open;
    menu.hidden = !open;

    if (open) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (menu.hidden) return;
          menu.classList.add("is-open");
          links[0].focus({ preventScroll: true });
        });
      });
    } else {
      menu.classList.remove("is-open");
      if (restoreFocus) button.focus();
    }
  }

  button.addEventListener("click", () => setMenu(menu.hidden));
  links.forEach((link) => {
    link.addEventListener("click", () => {
      setMenu(false);
      const target = document.getElementById(link.hash.slice(1));
      target.focus({ preventScroll: true });
    });
  });
  document.querySelector(".brand").addEventListener("click", () => {
    if (!menu.hidden) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) setMenu(false, true);
  });
  mobile.addEventListener("change", (event) => {
    if (!event.matches && !menu.hidden) setMenu(false);
  });

  document.documentElement.dataset.enhanced = "";
  button.hidden = false;
}

function setupRequestTrace(motionPreference) {
  const figure = document.querySelector("#request-trace");
  const plane = figure.querySelector(".trace-plane");
  const signal = figure.querySelector(".trace-signal");
  const button = figure.querySelector(".trace-replay");
  const label = figure.querySelector("[data-replay-label]");
  const status = figure.querySelector("[data-trace-status]");
  const announcement = figure.querySelector("[data-trace-announcement]");

  let run = 0;
  let announce = false;
  let stopAutoplay;

  function showDestination() {
    plane.dataset.state = "complete";
    status.textContent = "Reached FastAPI";
    if (announce) announcement.textContent = "The request passed through NGINX and reached FastAPI on Amazon EC2.";
  }

  function play(manual = false) {
    stopAutoplay?.();
    const currentRun = ++run;
    announce = manual;
    announcement.textContent = "";
    plane.dataset.state = "ready";

    if (motionPreference.matches) {
      showDestination();
      return;
    }

    status.textContent = "In transit";
    // Let the previous CSS animation reset before restarting the route.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (currentRun !== run) return;
      if (motionPreference.matches) showDestination();
      else plane.dataset.state = "playing";
    }));
  }

  function updatePreference() {
    const reduced = motionPreference.matches;
    label.textContent = reduced ? "Show path" : "Replay";
    button.setAttribute("aria-label", reduced ? "Show path" : "Replay request");
    if (reduced) {
      stopAutoplay?.();
      if (plane.dataset.state === "playing") showDestination();
    }
  }

  button.hidden = false;
  updatePreference();
  button.addEventListener("click", () => play(true));
  motionPreference.addEventListener("change", updatePreference);
  signal.addEventListener("animationend", (event) => {
    if (event.animationName === "request-travel" && plane.dataset.state === "playing") showDestination();
  });

  if (motionPreference.matches || !("IntersectionObserver" in window)) return;
  const visibleThreshold = 0.9;
  let visible = false;
  let autoplayTimer;

  function scheduleAutoplay() {
    window.clearTimeout(autoplayTimer);
    if (run || !visible || document.hidden || motionPreference.matches) return;

    autoplayTimer = window.setTimeout(() => {
      if (!document.hidden && !motionPreference.matches) play();
    }, 450);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= visibleThreshold;
    scheduleAutoplay();
  }, {
    threshold: visibleThreshold,
    rootMargin: "-80px 0px 0px 0px",
  });

  stopAutoplay = () => {
    window.clearTimeout(autoplayTimer);
    observer.disconnect();
    document.removeEventListener("visibilitychange", scheduleAutoplay);
    stopAutoplay = undefined;
  };
  document.addEventListener("visibilitychange", scheduleAutoplay);
  observer.observe(plane);
}

function setupArchitectureTabs() {
  const tabList = document.querySelector(".explorer-tabs");
  const tabs = [...tabList.querySelectorAll("button")];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

  function selectTab(selectedIndex, focus = false) {
    tabs.forEach((tab, index) => {
      const active = index === selectedIndex;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
    if (focus) tabs[selectedIndex].focus();
  }

  tabList.setAttribute("role", "tablist");
  tabs.forEach((tab, index) => {
    const panel = panels[index];
    tab.setAttribute("role", "tab");
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", () => selectTab(index));
    tab.addEventListener("keydown", (event) => {
      const next = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (typeof next !== "number") return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  selectTab(0);
  tabList.hidden = false;
}

function setupSectionReveals(reducedMotion) {
  if (reducedMotion || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      target.classList.replace("motion-pending", "motion-complete");
      observer.unobserve(target);
    });
  }, { rootMargin: "0px 0px -24px 0px" });

  document.querySelectorAll("[data-reveal]").forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight - 24) return;
    element.classList.add("motion-pending");
    observer.observe(element);
  });
}

function setupScrollEffects(reducedMotion) {
  const links = [...document.querySelectorAll(".desktop-nav a, .mobile-nav a, .header-contact")];
  const sections = [...document.querySelectorAll("main > section[id]")];
  const statement = document.querySelector(".statement-copy");
  const words = [];

  if (!reducedMotion) {
    statement.querySelectorAll("[data-reveal-line]").forEach((line) => {
      const text = line.textContent.trim().split(/\s+/);
      line.replaceChildren();
      text.forEach((word, index) => {
        if (index) line.append(" ");
        const span = document.createElement("span");
        span.className = "statement-word";
        span.dataset.word = word;
        span.textContent = word;
        line.append(span);
        words.push(span);
      });
    });
  }

  let revealed = 0;
  let activeSection = "";
  let scheduled = false;

  function update() {
    scheduled = false;
    const height = window.innerHeight;
    if (revealed < words.length) {
      const top = statement.getBoundingClientRect().top;
      const travel = Math.min(280, height * 0.38);
      const fraction = Math.max(0, Math.min(1, (height * 0.89 - top) / travel));
      const target = Math.ceil(fraction * words.length);
      while (revealed < target) words[revealed++].classList.add("is-revealed");
    }

    let nextSection = sections.findLast((section) => section.getBoundingClientRect().top <= height * 0.4)?.id;
    if (window.scrollY + height >= document.documentElement.scrollHeight - 2) {
      nextSection = sections.at(-1).id;
    }
    if (nextSection === activeSection) return;
    activeSection = nextSection;
    links.forEach((link) => {
      if (link.hash === `#${activeSection}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  update();
}

setupTheme();
setupMobileNavigation();
setupArchitectureTabs();
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
setupRequestTrace(motionPreference);
setupSectionReveals(motionPreference.matches);
setupScrollEffects(motionPreference.matches);
