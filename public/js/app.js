(() => {
  // =========================================================
  // Helpers
  // =========================================================
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // =========================================================
  // Scroll restoration
  // =========================================================
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  // =========================================================
  // Lenis
  // =========================================================
  const LenisCtor = window.Lenis || window.lenis || window.Lenis?.default;

  if (!LenisCtor) {
    console.warn("Lenis non chargé.");
    return;
  }

  const lenis = new LenisCtor({
    duration: 1.1,
    smoothWheel: true,
    smoothTouch: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // =========================================================
  // Position initiale
  // Haut de page OU ancre présente dans l'URL
  // =========================================================
  function goToInitialPosition() {
    const hash = window.location.hash;

    // Pas d'ancre : haut de page
    if (!hash) {
      window.scrollTo(0, 0);
      lenis.scrollTo(0, { immediate: true });
      return;
    }

    // Ancre présente : #dbds, #offline, #karma...
    const target = $(hash);

    if (!target) return;

    lenis.scrollTo(target, {
      offset: -88,
      immediate: true,
    });
  }

  requestAnimationFrame(() => {
    goToInitialPosition();
  });

  // Cache navigateur arrière / avant
  window.addEventListener("pageshow", () => {
    requestAnimationFrame(() => {
      goToInitialPosition();
    });
  });

  // =========================================================
  // GSAP / ScrollTrigger
  // =========================================================
  const hasGSAP = !!window.gsap;
  const hasST = !!window.ScrollTrigger;

  if (hasGSAP && hasST) {
    gsap.registerPlugin(ScrollTrigger);

    // Lenis <-> ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    ScrollTrigger.clearScrollMemory();

    // =========================================================
    // Reveal au scroll
    // =========================================================
    const revealEls = gsap.utils.toArray("[data-reveal]");

    if (revealEls.length) {
      if (reduceMotion) {
        gsap.set(revealEls, {
          autoAlpha: 1,
          y: 0,
        });
      } else {
        gsap.set(revealEls, {
          autoAlpha: 0,
          y: 26,
        });

        ScrollTrigger.batch(revealEls, {
          start: "top 82%",

          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: "power2.out",
              stagger: 0.08,
              overwrite: true,
            }),

          onEnterBack: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              stagger: 0.06,
              overwrite: true,
            }),

          onLeaveBack: (batch) =>
            gsap.set(batch, {
              autoAlpha: 0,
              y: 26,
              overwrite: true,
            }),
        });
      }
    }

    // =========================================================
    // Parallax couvertures
    // =========================================================
    const parallaxImgs = $$(".act [data-parallax] img");

    if (parallaxImgs.length && !reduceMotion) {
      parallaxImgs.forEach((img) => {
        const wrap = img.closest("[data-parallax]");

        if (!wrap) return;

        gsap.fromTo(
          img,
          {
            yPercent: -12,
            scale: 1.12,
          },
          {
            yPercent: 12,
            scale: 1.12,
            ease: "none",

            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      });
    }

    // =========================================================
    // Refresh après chargement des images
    // =========================================================
    function refreshOnImagesLoaded() {
      const imgs = Array.from(document.images || []);

      if (!imgs.length) return;

      let left = imgs.length;

      const done = () => {
        left -= 1;

        if (left <= 0) {
          ScrollTrigger.refresh();

          setTimeout(() => {
            ScrollTrigger.refresh();

            if (window.location.hash) {
              goToInitialPosition();
            }
          }, 120);
        }
      };

      imgs.forEach((img) => {
        if (img.complete) {
          done();
        } else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      });
    }

    document.addEventListener("DOMContentLoaded", () => {
      ScrollTrigger.refresh();

      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 120);
    });

    refreshOnImagesLoaded();

    window.addEventListener("load", () => {
      ScrollTrigger.clearScrollMemory();
      ScrollTrigger.refresh();

      goToInitialPosition();

      setTimeout(() => {
        ScrollTrigger.refresh();

        if (window.location.hash) {
          goToInitialPosition();
        }
      }, 150);
    });
  } else {
    console.warn(
      "GSAP/ScrollTrigger non chargés : animations scroll désactivées.",
    );

    window.addEventListener("load", () => {
      goToInitialPosition();
    });
  }

  // =========================================================
  // Navigation interne à la page
  // Exemple : sélection Romans -> fiche du roman
  // =========================================================
  function scrollToTarget(selector) {
    const el = $(selector);

    if (!el) return;

    lenis.scrollTo(el, {
      offset: -88,
      immediate: false,
    });

    if (hasGSAP && hasST) {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 220);
    }
  }

  $$("[data-scrollto]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const selector = link.getAttribute("data-scrollto");

      if (!selector) return;

      const target = $(selector);

      if (!target) return;

      e.preventDefault();

      // On garde l'URL propre lors du scroll interne.
      history.replaceState(null, "", window.location.pathname);

      scrollToTarget(selector);
    });
  });

  // =========================================================
  // Custom cursor
  // =========================================================
  const cursor = $(".cursor");

  if (cursor) {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    let tx = x;
    let ty = y;

    window.addEventListener(
      "mousemove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
      },
      { passive: true },
    );

    if (hasGSAP) {
      gsap.ticker.add(() => {
        x += (tx - x) * 0.18;
        y += (ty - y) * 0.18;

        cursor.style.transform = `translate(${x}px, ${y}px)`;
      });
    } else {
      const tick = () => {
        x += (tx - x) * 0.18;
        y += (ty - y) * 0.18;

        cursor.style.transform = `translate(${x}px, ${y}px)`;

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    // Liens / boutons
    const hoverables = $$("a, button, .btn");

    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("is-hover");
      });

      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("is-hover");
      });
    });

    // Trigger warnings
    const dangers = $$("[data-danger]");

    dangers.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("is-danger");
      });

      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("is-danger");
      });
    });
  }

  // =========================================================
  // Transition entre pages
  // =========================================================
  const overlay = $(".page-fade");

  if (overlay && hasGSAP) {
    $$('a[href^="/"]').forEach((link) => {
      const href = link.getAttribute("href") || "";

      // Les liens vers une ancre doivent naviguer normalement.
      // Exemple : /romans.html#offline
      if (href.includes("#")) return;

      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        e.preventDefault();

        gsap.to(overlay, {
          opacity: 1,
          duration: 0.22,
          ease: "power1.out",

          onComplete: () => {
            window.location.href = href;
          },
        });
      });
    });

    gsap.set(overlay, {
      opacity: 1,
    });

    gsap.to(overlay, {
      opacity: 0,
      duration: 0.28,
      ease: "power1.out",
      delay: 0.02,
    });
  }
})();
