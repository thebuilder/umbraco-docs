const initialized = new WeakSet<HTMLElement>();
const STAGGER_MS = 60;
// Caps the wait for the last element of a large batch at 360ms.
const MAX_STAGGER_STEPS = 6;

export function initializeUmbracoDocs(root: ParentNode = document): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const landing of root.querySelectorAll<HTMLElement>("[data-udocs-root]")) {
    if (initialized.has(landing)) continue;
    initialized.add(landing);
    const reveals = landing.querySelectorAll<HTMLElement>("[data-udocs-reveal]");
    // LandingRoot hid the reveal targets before first paint. If this ran too late, it already gave
    // up and showed them, and hiding them again now would fade visible content out.
    const gaveUp = landing.dataset.udocsMotion === "false";
    if (!reducedMotion && !gaveUp && "IntersectionObserver" in window) {
      landing.dataset.udocsMotion = "true";
      landing.dataset.udocsObserved = "true";
      const observer = new IntersectionObserver((entries) => {
        // Elements that come into view together ripple in, in page order, instead of landing as one block.
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          element.style.setProperty("--udocs-reveal-stagger", `${Math.min(order++, MAX_STAGGER_STEPS) * STAGGER_MS}ms`);
          element.dataset.udocsVisible = "true";
          observer.unobserve(element);
        }
      }, { rootMargin: "0px 0px -10%", threshold: 0.1 });
      reveals.forEach((element) => observer.observe(element));
    } else {
      reveals.forEach((element) => { element.dataset.udocsVisible = "true"; });
    }

    landing.querySelectorAll<HTMLButtonElement>("[data-udocs-copy]").forEach((button) => {
      const status = button.parentElement?.querySelector<HTMLElement>("[data-udocs-copy-status]");
      button.addEventListener("click", async () => {
        const value = button.dataset.udocsCopy;
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          button.dataset.udocsCopied = "true";
          if (status) status.textContent = "Copied";
          window.setTimeout(() => {
            delete button.dataset.udocsCopied;
            if (status) status.textContent = "";
          }, 1600);
        } catch {
          button.dataset.udocsCopyFailed = "true";
          if (status) status.textContent = "Copy failed. Select and copy the command manually.";
        }
      });
    });
  }
}
