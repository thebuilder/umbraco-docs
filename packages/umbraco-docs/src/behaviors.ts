const initialized = new WeakSet<HTMLElement>();

export function initializeUmbracoDocs(root: ParentNode = document): void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const landing of root.querySelectorAll<HTMLElement>("[data-udocs-root]")) {
    if (initialized.has(landing)) continue;
    initialized.add(landing);
    const reveals = landing.querySelectorAll<HTMLElement>("[data-udocs-reveal]");
    if (!reducedMotion && "IntersectionObserver" in window) {
      landing.dataset.udocsMotion = "true";
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.udocsVisible = "true";
          observer.unobserve(entry.target);
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
