/**
 * Mounts a floating, draggable overlay scrollbar on the right edge of the viewport.
 * Keeps native document scrolling, sticky headers, and wheel/touch momentum untouched.
 */
export function initOverlayScrollbar() {
  const track = document.createElement("div");
  track.className = "overlay-scrollbar-track";
  track.setAttribute("aria-hidden", "true");

  const thumb = document.createElement("div");
  thumb.className = "overlay-scrollbar-thumb";

  track.appendChild(thumb);
  document.body.appendChild(track);

  const stickyChrome = document.getElementById("sticky-chrome");

  let isDragging = false;
  let isHovering = false;
  let dragStartY = 0;
  let dragStartScrollY = 0;
  /** @type {number | null} */
  let hideTimer = null;

  function showBriefly() {
    track.classList.add("is-active");
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }
    if (!isDragging && !isHovering) {
      hideTimer = window.setTimeout(() => {
        track.classList.remove("is-active");
      }, 900);
    }
  }

  function update() {
    // Keep the floating track cleanly below the frozen topbar
    const topOffset = stickyChrome
      ? stickyChrome.getBoundingClientRect().height + 4
      : 4;
    track.style.top = `${topOffset}px`;

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 1) {
      track.classList.add("is-hidden");
      return;
    }

    track.classList.remove("is-hidden");

    const trackHeight = track.clientHeight;
    if (trackHeight <= 0) return;

    const thumbHeight = Math.max(
      28,
      Math.min(trackHeight, (clientHeight / scrollHeight) * trackHeight),
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const ratio = Math.max(0, Math.min(1, window.scrollY / maxScroll));
    const thumbTop = ratio * maxThumbTop;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }

  window.addEventListener(
    "scroll",
    () => {
      update();
      showBriefly();
    },
    { passive: true },
  );

  window.addEventListener("resize", update, { passive: true });

  // Recalculate thumb height whenever cards, inventory, or features change page height
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(document.body);
  if (stickyChrome) {
    resizeObserver.observe(stickyChrome);
  }

  thumb.addEventListener("pointerenter", () => {
    isHovering = true;
    showBriefly();
  });

  thumb.addEventListener("pointerleave", () => {
    isHovering = false;
    showBriefly();
  });

  thumb.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    isDragging = true;
    dragStartY = event.clientY;
    dragStartScrollY = window.scrollY;
    track.classList.add("is-dragging", "is-active");
    thumb.setPointerCapture(event.pointerId);
  });

  thumb.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    const trackHeight = track.clientHeight;
    const thumbHeight = thumb.getBoundingClientRect().height;
    const maxThumbTop = Math.max(1, trackHeight - thumbHeight);

    const deltaY = event.clientY - dragStartY;
    const nextScrollY = dragStartScrollY + (deltaY / maxThumbTop) * maxScroll;
    window.scrollTo(0, Math.max(0, Math.min(maxScroll, nextScrollY)));
  });

  /** @param {PointerEvent} event */
  function endDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove("is-dragging");
    if (thumb.hasPointerCapture(event.pointerId)) {
      thumb.releasePointerCapture(event.pointerId);
    }
    showBriefly();
  }

  thumb.addEventListener("pointerup", endDrag);
  thumb.addEventListener("pointercancel", endDrag);

  update();
}
