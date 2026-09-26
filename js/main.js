/*
  Page behavior
  -------------
  initScrollReveal() — fades sections in as they enter the viewport.
  initBenefitTabs() — section 3 ("Benefit with Agentic Networking").
    Tabs auto-advance on a timer; users can still click a tab to jump.
  initScrollAudiences() — section 4. Scroll moves photos; active audience follows scroll.
*/

document.addEventListener("DOMContentLoaded", function () {
  initScrollReveal();
  initBenefitTabs();
  initProofCompare();
  initScrollAudiences();
});

function initScrollReveal() {
  document.documentElement.classList.add("js");
  var nodes = document.querySelectorAll("[data-reveal]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || !("IntersectionObserver" in window)) {
    nodes.forEach(function (node) {
      node.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  nodes.forEach(function (node) {
    observer.observe(node);
  });
}

function initBenefitTabs() {
  var section = document.querySelector("[data-benefit-tabs]");
  if (!section) return;

  var tabs = Array.prototype.slice.call(section.querySelectorAll("[data-tab]"));
  var panels = Array.prototype.slice.call(section.querySelectorAll("[data-panel]"));
  var count = tabs.length;
  var current = -1;
  var timer = null;
  var inView = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function autoplayMs() {
    var root = getComputedStyle(document.documentElement);
    var raw = root.getPropertyValue("--benefit-tab-autoplay-duration").trim() || "5s";
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return 1500;
  }

  function playBar() {
    section.classList.remove("is-advancing");
    void section.offsetWidth;
    section.classList.add("is-advancing");
  }

  function setActive(index) {
    if (index < 0 || index >= count) index = 0;
    if (index === current) return;
    current = index;

    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });

    panels.forEach(function (panel, i) {
      var on = i === index;
      panel.classList.toggle("is-active", on);
      panel.setAttribute("aria-hidden", on ? "false" : "true");
    });
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    section.classList.remove("is-advancing");
  }

  function startAutoplay(force) {
    stopAutoplay();
    if (!inView || reduceMotion.matches || count <= 1) return;
    if (!force && section.matches(":hover")) return;
    playBar();
    timer = window.setInterval(function () {
      setActive((current + 1) % count);
      playBar();
    }, autoplayMs());
  }

  function beginInView() {
    inView = true;
    current = -1;
    setActive(0);
    startAutoplay();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      inView = true;
      setActive(Number(tab.getAttribute("data-tab")));
      startAutoplay(true);
    });
  });

  section.addEventListener("focusin", stopAutoplay);
  section.addEventListener("focusout", function (event) {
    if (!section.contains(event.relatedTarget)) startAutoplay();
  });

  reduceMotion.addEventListener("change", function () {
    if (reduceMotion.matches) stopAutoplay();
    else startAutoplay();
  });

  setActive(0);

  if ("IntersectionObserver" in window) {
    var viewObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) beginInView();
        else {
          inView = false;
          stopAutoplay();
        }
      });
    }, { threshold: 0.35 });
    viewObserver.observe(section);
  } else {
    beginInView();
  }
}

function initScrollAudiences() {
  var section = document.querySelector("[data-scroll-audiences]");
  if (!section) return;

  var photos = section.querySelector("[data-audiences-photos]");
  var viewport = section.querySelector("[data-audiences-viewport]");
  var items = Array.prototype.slice.call(section.querySelectorAll("[data-audience]"));
  var heads = Array.prototype.slice.call(section.querySelectorAll(".audience__head"));
  var count = items.length;
  var current = -1;
  var compact = window.matchMedia("(max-width: 720px)");
  var targets = [];
  var lastProgress = 0;
  var pendingIndex = -2;
  var dwellTimer = null;

  function pinOffset() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--audiences-sticky-offset").trim() || "120px";
    if (raw.endsWith("vh")) return window.innerHeight * parseFloat(raw) / 100;
    if (raw.endsWith("px")) return parseFloat(raw);
    return 120;
  }

  function progress() {
    var scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    var traveled = Math.min(Math.max(pinOffset() - section.getBoundingClientRect().top, 0), scrollable);
    return traveled / scrollable;
  }

  function dwellMs() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--audience-open-delay").trim() || "0.5s";
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return 500;
  }

  function measureTargets() {
    targets = [];
    if (!photos || !viewport || compact.matches) return;
    var viewportTop = viewport.getBoundingClientRect().top;
    var images = photos.querySelectorAll("[data-audience-photo]");
    for (var i = 0; i < count; i++) {
      var head = items[i].querySelector(".audience__head");
      var img = images[i];
      if (!head || !img) {
        targets.push(0);
        continue;
      }
      targets.push(head.getBoundingClientRect().top - viewportTop - img.offsetTop);
    }
  }

  function endPaddingPx() {
    return window.innerHeight * 0.5;
  }

  function alignmentProgress(value) {
    var scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return value;
    var alignSpan = Math.max(scrollable - endPaddingPx(), 1);
    return Math.min(Math.max(value, 0) * scrollable / alignSpan, 1);
  }

  function tailProgress(value) {
    var scrollable = section.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    var alignSpan = Math.max(scrollable - endPaddingPx(), 1);
    var intoTail = value * scrollable - alignSpan;
    if (intoTail <= 0) return 0;
    return Math.min(intoTail / endPaddingPx(), 1);
  }

  function finalPhotoShift() {
    if (!photos || !viewport || !targets.length) return targets[targets.length - 1] || 0;
    var images = photos.querySelectorAll("[data-audience-photo]");
    var img = images[images.length - 1];
    var aligned = targets[targets.length - 1];
    if (!img) return aligned;
    var pad = 48;
    var fullyVisible = viewport.clientHeight - pad - img.offsetTop - img.offsetHeight;
    return Math.min(aligned, fullyVisible);
  }

  function transformForProgress(value) {
    if (!targets.length) return 0;
    var aligned;
    if (count < 2) {
      aligned = targets[0];
    } else {
      var clamped = alignmentProgress(value);
      if (clamped >= 1) {
        aligned = targets[count - 1];
      } else {
        var scaled = clamped * (count - 1);
        var index = Math.min(count - 2, Math.floor(scaled));
        var local = scaled - index;
        aligned = targets[index] + (targets[index + 1] - targets[index]) * local;
      }
    }
    var tail = tailProgress(value);
    if (tail <= 0) return aligned;
    var end = finalPhotoShift();
    return aligned + (end - aligned) * tail;
  }

  function professionalOpenShift() {
    var images = photos.querySelectorAll("[data-audience-photo]");
    var img = images[0];
    if (!img) return targets[1] || 0;
    var remain = window.innerHeight * 0.15;
    return remain - img.offsetTop - img.offsetHeight;
  }

  function reachedIndex(ty) {
    var index = -1;
    for (var i = 0; i < targets.length; i++) {
      var mark = i === 1 ? professionalOpenShift() : targets[i];
      if (ty <= mark + 1.5) index = i;
    }
    return index;
  }

  function applyTransform(value) {
    if (!photos || compact.matches) return 0;
    var ty = transformForProgress(value);
    photos.style.transform = "translate3d(0, " + ty + "px, 0)";
    return ty;
  }

  function clearDwell() {
    if (!dwellTimer) return;
    window.clearTimeout(dwellTimer);
    dwellTimer = null;
  }

  function setActive(index) {
    if (index >= count) index = count - 1;
    if (index === current) return;
    current = index;

    items.forEach(function (item, i) {
      var on = index >= 0 && i === index;
      item.classList.toggle("is-active", on);
      var panel = item.querySelector(".audience__panel");
      var tab = item.querySelector(".audience__head");
      if (tab) {
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      }
      if (panel) panel.setAttribute("aria-hidden", on ? "false" : "true");
      var action = item.querySelector(".audience__panel .button");
      if (action) action.tabIndex = on ? 0 : -1;
    });
  }

  function queueActive(index) {
    if (index === current) {
      pendingIndex = index;
      clearDwell();
      return;
    }
    if (index === pendingIndex && dwellTimer) return;
    pendingIndex = index;
    clearDwell();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var wait = reduce || index === 0 || index === 1 ? 0 : dwellMs();
    dwellTimer = window.setTimeout(function () {
      dwellTimer = null;
      if (pendingIndex !== index) return;
      setActive(index);
      measureTargets();
      applyTransform(lastProgress);
    }, wait);
  }

  function updateFromScroll() {
    if (compact.matches) return;

    measureTargets();
    var block = section.closest("#audiences") || section;
    var rect = section.getBoundingClientRect();

    if (block.getBoundingClientRect().top > window.innerHeight) {
      lastProgress = 0;
      applyTransform(0);
      pendingIndex = -1;
      clearDwell();
      setActive(-1);
      return;
    }

    if (rect.top > pinOffset()) {
      lastProgress = 0;
      applyTransform(0);
      queueActive(0);
      return;
    }

    lastProgress = progress();
    var ty = applyTransform(lastProgress);
    var index = reachedIndex(ty);
    queueActive(index < 0 ? 0 : index);
  }

  function scrollToIndex(index) {
    if (compact.matches) {
      setActive(index);
      return;
    }

    var scrollable = section.offsetHeight - window.innerHeight;
    var alignSpan = Math.max(scrollable - endPaddingPx(), 0);
    var sectionTop = window.scrollY + section.getBoundingClientRect().top;
    var band = count < 2 ? 0 : index / (count - 1);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: sectionTop - pinOffset() + alignSpan * band,
      behavior: reduce ? "auto" : "smooth"
    });
  }

  heads.forEach(function (head) {
    head.addEventListener("click", function () {
      var item = head.closest("[data-audience]");
      if (!item) return;
      scrollToIndex(Number(item.getAttribute("data-audience")));
    });
  });

  function onScrollOrResize() {
    updateFromScroll();
  }

  window.addEventListener("scroll", updateFromScroll, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
  compact.addEventListener("change", onScrollOrResize);

  updateFromScroll();
}

function initProofCompare() {
  var root = document.querySelector("[data-proof-compare]");
  if (!root) return null;

  var handle = root.querySelector(".proof__compare-handle");
  if (!handle) return null;

  var dragging = false;
  var activePointer = null;
  var pctMin = 8;
  var pctMax = 92;

  function clamp(value) {
    return Math.min(pctMax, Math.max(pctMin, value));
  }

  function setPct(value, options) {
    var opts = options || {};
    var pct = clamp(value);
    root.style.setProperty("--compare-pct", String(pct));
    handle.setAttribute("aria-valuenow", String(Math.round(pct)));
    return pct;
  }

  function pctFromClientX(clientX) {
    var rect = root.getBoundingClientRect();
    if (rect.width <= 0) return setPct(50);
    return setPct(((clientX - rect.left) / rect.width) * 100);
  }

  function stopDrag() {
    dragging = false;
    activePointer = null;
    root.classList.remove("is-dragging");
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== activePointer) return;
    pctFromClientX(event.clientX);
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== activePointer) return;
    stopDrag();
  }

  function startDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    activePointer = event.pointerId;
    root.classList.add("is-dragging");
    pctFromClientX(event.clientX);
    event.preventDefault();
  }

  root.addEventListener("pointerdown", function (event) {
    if (event.target === handle || handle.contains(event.target)) return;
    startDrag(event);
  });

  handle.addEventListener("pointerdown", startDrag);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);

  handle.addEventListener("keydown", function (event) {
    var step = event.shiftKey ? 10 : 4;
    var current = parseFloat(root.style.getPropertyValue("--compare-pct")) || 50;
    if (event.key === "ArrowLeft" || event.key === "Home") {
      setPct(event.key === "Home" ? pctMin : current - step);
      event.preventDefault();
    } else if (event.key === "ArrowRight" || event.key === "End") {
      setPct(event.key === "End" ? pctMax : current + step);
      event.preventDefault();
    }
  });

  var withScene = root.querySelector(".proof__compare-scene img");
  var withoutImg = root.querySelector(".proof__without-person");
  if (withScene) {
    withScene.alt = "With Articuler: qualified VC matches and a successful introduction";
  }
  if (withoutImg) {
    withoutImg.alt = "Without Articuler: rejection email and networking fatigue";
  }

  return { setPct: setPct, root: root };
}
