const initialized = new WeakSet<HTMLElement>();

export function initializeUmbracoDocs(root: ParentNode = document): void {
  const landing = root.querySelector<HTMLElement>("[data-udocs-landing]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (landing && !initialized.has(landing)) {
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
  }

  root.querySelectorAll<HTMLButtonElement>("[data-udocs-copy]").forEach((button) => {
    if (initialized.has(button)) return;
    initialized.add(button);
    button.addEventListener("click", async () => {
      const value = button.dataset.udocsCopy;
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.dataset.udocsCopied = "true";
        window.setTimeout(() => { delete button.dataset.udocsCopied; }, 1600);
      } catch {
        button.dataset.udocsCopyFailed = "true";
      }
    });
  });
}
