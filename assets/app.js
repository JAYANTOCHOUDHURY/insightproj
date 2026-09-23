/* =========================================================
   INSIGHT STUDIOS
   Premium Cinematic Production Website
   Enhanced JavaScript v2.0
========================================================= */

(() => {
    "use strict";


    /* =========================================================
       00. GLOBAL UTILITIES
    ========================================================= */

    const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isCoarsePointer = () =>
        window.matchMedia("(pointer: coarse)").matches;

    const isTouchDevice = () =>
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const debounce = (fn, wait = 200) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    };

    const throttle = (fn, limit = 100) => {
        let inThrottle = false;
        return (...args) => {
            if (inThrottle) return;
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        };
    };

    const lerp = (start, end, amount) =>
        start + (end - start) * amount;

    const clamp = (value, min, max) =>
        Math.min(Math.max(value, min), max);


    /* =========================================================
       01. GLOBAL STATE
    ========================================================= */

    const state = {
        isMobileMenuOpen: false,
        isCoarsePointer: isCoarsePointer(),
        isTouchDevice: isTouchDevice(),
        prefersReducedMotion: prefersReducedMotion(),
        lenis: null,
        isPageVisible: true,
        hasGsap: false,
        hasScrollTrigger: false,
        hasLenis: false,
        scrollY: 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };


    /* =========================================================
       02. DOM READY
    ========================================================= */

    document.addEventListener("DOMContentLoaded", () => {

        /* Register GSAP plugins */
        state.hasGsap = typeof gsap !== "undefined";
        state.hasScrollTrigger = typeof ScrollTrigger !== "undefined";
        state.hasLenis = typeof Lenis !== "undefined";

        if (state.hasGsap && state.hasScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
        }


        /* =================================================
           ELEMENT REFERENCES
        ================================================== */

        const body = document.body;
        const html = document.documentElement;

        const header = document.querySelector(".site-header");
        const cursor = document.querySelector(".custom-cursor");
        const menuToggle = document.querySelector(".menu-toggle");
        const mobileNavigation = document.querySelector(".mobile-navigation");

        const mobileNavigationLinks = document.querySelectorAll(
            ".mobile-nav-links a, .mobile-navigation-bottom a"
        );

        const navLinks = document.querySelectorAll(
            ".nav-links > a, .work-trigger"
        );

        const scrollRevealElements = document.querySelectorAll(".scroll-reveal");
        const fadeElements = document.querySelectorAll(".fade-up");
        const clipRevealElements = document.querySelectorAll(".clip-reveal");
        const parallaxImages = document.querySelectorAll(".parallax-img");


        /* =================================================
           PAGE VISIBILITY (perf optimization)
        ================================================== */

        function initPageVisibility() {
            if (state.prefersReducedMotion) {
                html.classList.add("reduced-motion");
            }

            html.classList.add("js-ready");

            document.addEventListener("visibilitychange", () => {
                state.isPageVisible = !document.hidden;
            });
        }


        /* =================================================
           SMOOTH SCROLL (LENIS)
        ================================================== */

        function initSmoothScroll() {
            if (state.prefersReducedMotion || !state.hasLenis) return;

            try {
                state.lenis = new Lenis({
                    duration: 1.15,
                    easing: (t) => 1 - Math.pow(1 - t, 4),
                    direction: "vertical",
                    gestureDirection: "vertical",
                    smoothWheel: true,
                    smoothTouch: false,
                    wheelMultiplier: 0.9,
                    touchMultiplier: 1,
                    infinite: false
                });

                if (state.hasScrollTrigger) {
                    state.lenis.on("scroll", ScrollTrigger.update);
                }

                if (state.hasGsap) {
                    gsap.ticker.add((time) => {
                        if (state.isPageVisible && state.lenis) {
                            state.lenis.raf(time * 1000);
                        }
                    });
                    gsap.ticker.lagSmoothing(0, 0);
                } else {
                    const lenisRAF = (time) => {
                        if (state.lenis) state.lenis.raf(time);
                        requestAnimationFrame(lenisRAF);
                    };
                    requestAnimationFrame(lenisRAF);
                }
            } catch (error) {
                console.warn("Lenis initialization failed:", error);
            }
        }


        /* =================================================
           ENHANCED CUSTOM CURSOR
           - Multi-state system
           - Magnetic pull
           - Contextual labels
           - Text input mode
        ================================================== */

        function initCustomCursor() {

            /* Skip on touch / reduced motion / missing element */
            if (!cursor || state.isCoarsePointer || state.prefersReducedMotion) {
                if (cursor) cursor.style.display = "none";
                return;
            }

            /* ---------------------------------------------------
               Cursor State
            --------------------------------------------------- */

            const cursorState = {
                mouseX: window.innerWidth / 2,
                mouseY: window.innerHeight / 2,
                cursorX: window.innerWidth / 2,
                cursorY: window.innerHeight / 2,
                dotX: window.innerWidth / 2,
                dotY: window.innerHeight / 2,
                isActive: false,
                isHovering: false,
                isTextInput: false,
                isDown: false,
                currentLabel: "",
                hoverTarget: null,
                magneticTarget: null,
                magneticStrength: 0.35
            };

            /* Create trailing dot element */
            const trailingDot = document.createElement("div");
            trailingDot.className = "custom-cursor__dot";
            trailingDot.setAttribute("aria-hidden", "true");
            document.body.appendChild(trailingDot);

            /* Add ring wrapper for styling */
            cursor.classList.add("custom-cursor--enhanced");
            cursor.style.opacity = "1";

            /* ---------------------------------------------------
               Detect hover targets (delegated)
            --------------------------------------------------- */

            const HOVER_SELECTOR = [
                "a",
                "button",
                "[role='button']",
                ".work-item",
                ".film-card",
                ".photo-feature",
                ".photo-project",
                ".photo-wide-project",
                ".making-feature",
                ".making-project",
                ".making-wide-project",
                ".service-row",
                ".photo-category",
                ".team-value",
                ".about-principle",
                ".about-capability-item",
                ".team-member-image",
                ".contact-submit"
            ].join(",");

            const MAGNETIC_SELECTOR = [
                ".header-cta",
                ".cta-button",
                ".contact-submit",
                ".hero-discover",
                "[data-magnetic]"
            ].join(",");

            const TEXT_INPUT_SELECTOR =
                "input[type='text'], input[type='email'], input[type='tel'], input[type='search'], textarea, [contenteditable='true']";


            /* ---------------------------------------------------
               Update cursor label based on target
            --------------------------------------------------- */

            function resolveCursorLabel(target) {
                if (!target) return "";

                /* Explicit label via data attribute */
                const explicit = target.getAttribute("data-cursor");
                if (explicit) return explicit;

                /* Contextual defaults */
                if (target.matches(".work-item, .film-card, .photo-feature, .photo-project, .photo-wide-project, .making-feature, .making-project, .making-wide-project, .team-member-image")) {
                    return "VIEW";
                }

                if (target.matches(".contact-submit, [type='submit']")) {
                    return "SEND";
                }

                if (target.matches(".service-row, .about-principle, .about-capability-item, .team-value, .photo-category")) {
                    return "EXPLORE";
                }

                if (target.matches("a[href^='mailto:']")) {
                    return "EMAIL";
                }

                if (target.matches("a[href^='tel:']")) {
                    return "CALL";
                }

                if (target.matches("a[href$='.pdf']")) {
                    return "PDF";
                }

                return "";
            }


            /* ---------------------------------------------------
               Pointer event listeners
            --------------------------------------------------- */

            document.addEventListener(
                "mousemove",
                (event) => {
                    cursorState.mouseX = event.clientX;
                    cursorState.mouseY = event.clientY;

                    /* Find element under cursor */
                    const target = event.target;

                    /* Text input mode */
                    if (target.matches && target.matches(TEXT_INPUT_SELECTOR)) {
                        cursorState.isTextInput = true;
                    } else {
                        cursorState.isTextInput = false;
                    }

                    /* Magnetic target */
                    const magnetic = target.closest ? target.closest(MAGNETIC_SELECTOR) : null;

                    if (magnetic && magnetic !== cursorState.magneticTarget) {
                        cursorState.magneticTarget = magnetic;
                    } else if (!magnetic) {
                        cursorState.magneticTarget = null;
                    }

                    /* Hover target */
                    const hover = target.closest ? target.closest(HOVER_SELECTOR) : null;

                    if (hover && hover !== cursorState.hoverTarget) {
                        cursorState.hoverTarget = hover;
                        cursorState.isHovering = true;
                        cursorState.currentLabel = resolveCursorLabel(hover);
                        cursor.classList.add("active");
                        cursor.classList.toggle("has-label", !!cursorState.currentLabel);
                        cursor.textContent = cursorState.currentLabel;
                    } else if (!hover && cursorState.hoverTarget) {
                        cursorState.hoverTarget = null;
                        cursorState.isHovering = false;
                        cursorState.currentLabel = "";
                        cursor.classList.remove("active", "has-label");
                        cursor.textContent = "";
                    }
                },
                { passive: true }
            );


            /* ---------------------------------------------------
               Mouse down / up state
            --------------------------------------------------- */

            document.addEventListener("mousedown", () => {
                cursorState.isDown = true;
                cursor.classList.add("is-down");
            });

            document.addEventListener("mouseup", () => {
                cursorState.isDown = false;
                cursor.classList.remove("is-down");
            });


            /* ---------------------------------------------------
               Hide cursor when leaving viewport
            --------------------------------------------------- */

            document.addEventListener("mouseleave", () => {
                cursor.classList.add("hidden");
                trailingDot.classList.add("hidden");
            });

            document.addEventListener("mouseenter", () => {
                cursor.classList.remove("hidden");
                trailingDot.classList.remove("hidden");
            });


            /* ---------------------------------------------------
               Render loop
            --------------------------------------------------- */

            const render = () => {
                if (!state.isPageVisible) {
                    requestAnimationFrame(render);
                    return;
                }

                /* Calculate target position */
                let targetX = cursorState.mouseX;
                let targetY = cursorState.mouseY;

                /* Magnetic pull towards magnetic target center */
                if (cursorState.magneticTarget) {
                    const rect = cursorState.magneticTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;

                    targetX = lerp(cursorState.mouseX, centerX, cursorState.magneticStrength);
                    targetY = lerp(cursorState.mouseY, centerY, cursorState.magneticStrength);
                }

                /* Main cursor (smooth) */
                cursorState.cursorX = lerp(cursorState.cursorX, targetX, 0.18);
                cursorState.cursorY = lerp(cursorState.cursorY, targetY, 0.18);

                /* Trailing dot (faster) */
                cursorState.dotX = lerp(cursorState.dotX, targetX, 0.35);
                cursorState.dotY = lerp(cursorState.dotY, targetY, 0.35);

                /* Apply transforms */
                cursor.style.transform =
                    `translate3d(${cursorState.cursorX}px, ${cursorState.cursorY}px, 0) translate(-50%, -50%)`;

                trailingDot.style.transform =
                    `translate3d(${cursorState.dotX}px, ${cursorState.dotY}px, 0) translate(-50%, -50%)`;

                /* Toggle classes */
                cursor.classList.toggle("is-text-input", cursorState.isTextInput);
                cursor.classList.toggle("is-magnetic", !!cursorState.magneticTarget);

                trailingDot.classList.toggle("is-text-input", cursorState.isTextInput);

                requestAnimationFrame(render);
            };

            requestAnimationFrame(render);
        }


        /* =================================================
           HEADER SCROLL EFFECT
        ================================================== */

        function initHeader() {
            if (!header) return;

            let ticking = false;

            const updateHeader = () => {
                const scrolled = window.scrollY > 40;
                header.classList.toggle("scrolled", scrolled);
                state.scrollY = window.scrollY;
                ticking = false;
            };

            window.addEventListener(
                "scroll",
                () => {
                    if (!ticking) {
                        requestAnimationFrame(updateHeader);
                        ticking = true;
                    }
                },
                { passive: true }
            );

            updateHeader();
        }


        /* =================================================
           HERO ENTRANCE ANIMATION
        ================================================== */

        function initHeroAnimation() {

            if (!state.hasGsap || state.prefersReducedMotion) {
                fadeElements.forEach((el) => el.classList.add("is-visible"));
                clipRevealElements.forEach((el) => el.classList.add("is-visible"));
                return;
            }

            const heroBackground = document.querySelector(".hero-bg");
            const heroTitle = document.querySelector(".hero-title");
            const heroTopline = document.querySelector(".hero-topline");
            const heroKicker = document.querySelector(".hero-kicker");
            const heroBottom = document.querySelector(".hero-bottom");
            const scrollMark = document.querySelector(".hero-scroll-mark");

            /* Initial states */
            if (heroBackground) gsap.set(heroBackground, { scale: 1.12 });
            if (heroTitle) gsap.set(heroTitle, {
                clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)"
            });

            const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

            if (heroBackground) {
                tl.to(heroBackground, {
                    scale: 1,
                    duration: 2.2,
                    ease: "power3.out"
                }, 0);
            }

            if (heroTopline) {
                tl.fromTo(heroTopline,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.9 },
                    0.35
                );
            }

            if (heroKicker) {
                tl.fromTo(heroKicker,
                    { y: 25, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8 },
                    0.55
                );
            }

            if (heroTitle) {
                tl.to(heroTitle, {
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                    duration: 1.35,
                    ease: "power4.out"
                }, 0.45);
            }

            if (heroBottom) {
                tl.fromTo(heroBottom,
                    { y: 35, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1 },
                    0.85
                );
            }

            if (scrollMark) {
                tl.fromTo(scrollMark,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.8 },
                    1.15
                );
            }
        }


        /* =================================================
           SCROLL REVEALS
        ================================================== */

        function initScrollReveals() {

            if (!scrollRevealElements.length) return;

            if (state.prefersReducedMotion || !state.hasGsap || !state.hasScrollTrigger) {
                scrollRevealElements.forEach((el) => el.classList.add("is-visible"));
                return;
            }

            scrollRevealElements.forEach((element, index) => {
                gsap.fromTo(element,
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 1.05,
                        delay: (index % 3) * 0.05,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: element,
                            start: "top 86%",
                            once: true,
                            toggleClass: {
                                targets: element,
                                className: "is-visible"
                            }
                        }
                    }
                );
            });
        }


        /* =================================================
           PARALLAX
        ================================================== */

        function initParallax() {

            if (
                !parallaxImages.length ||
                state.prefersReducedMotion ||
                !state.hasGsap ||
                !state.hasScrollTrigger
            ) return;

            parallaxImages.forEach((image) => {
                const isHero = image.closest(".hero-bg");
                const amount = isHero ? 8 : 12;

                gsap.fromTo(image,
                    { yPercent: -amount },
                    {
                        yPercent: amount,
                        ease: "none",
                        scrollTrigger: {
                            trigger: image.parentElement,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );
            });
        }


        /* =================================================
           WORK ITEM HOVER
        ================================================== */

        function initWorkHover() {

            const workItems = document.querySelectorAll(".work-item");

            if (state.isCoarsePointer || state.prefersReducedMotion || !state.hasGsap) return;

            workItems.forEach((item) => {
                const image = item.querySelector("img");
                if (!image) return;

                item.addEventListener("mouseenter", () => {
                    gsap.to(image, {
                        scale: 1.06,
                        duration: 1,
                        ease: "power3.out",
                        overwrite: true
                    });
                });

                item.addEventListener("mouseleave", () => {
                    gsap.to(image, {
                        scale: 1.015,
                        duration: 0.9,
                        ease: "power3.out",
                        overwrite: true
                    });
                });
            });
        }


        /* =================================================
           MOBILE MENU (with focus trap)
        ================================================== */

        function initMobileMenu() {
            if (!menuToggle || !mobileNavigation) return;

            const focusableSelector =
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

            let previouslyFocused = null;

            const openMenu = () => {
                state.isMobileMenuOpen = true;
                previouslyFocused = document.activeElement;

                menuToggle.classList.add("is-open");
                mobileNavigation.classList.add("is-open");
                menuToggle.setAttribute("aria-expanded", "true");
                menuToggle.setAttribute("aria-label", "Close navigation menu");
                mobileNavigation.setAttribute("aria-hidden", "false");

                /* Lock body scroll (preserve scroll position) */
                const scrollY = window.scrollY;
                body.style.position = "fixed";
                body.style.top = `-${scrollY}px`;
                body.style.width = "100%";
                body.dataset.scrollY = scrollY;

                /* Animate menu items */
                if (state.hasGsap && !state.prefersReducedMotion) {
                    const items = mobileNavigation.querySelectorAll(".mobile-nav-links a");
                    gsap.fromTo(items,
                        { y: 35, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.65,
                            stagger: 0.07,
                            delay: 0.15,
                            ease: "power3.out"
                        }
                    );
                }

                /* Focus first focusable item */
                setTimeout(() => {
                    const focusables = mobileNavigation.querySelectorAll(focusableSelector);
                    if (focusables.length) focusables[0].focus();
                }, 250);
            };

            const closeMenu = () => {
                state.isMobileMenuOpen = false;

                menuToggle.classList.remove("is-open");
                mobileNavigation.classList.remove("is-open");
                menuToggle.setAttribute("aria-expanded", "false");
                menuToggle.setAttribute("aria-label", "Open navigation menu");
                mobileNavigation.setAttribute("aria-hidden", "true");

                /* Restore body scroll */
                const scrollY = body.dataset.scrollY ? parseInt(body.dataset.scrollY, 10) : 0;
                body.style.position = "";
                body.style.top = "";
                body.style.width = "";
                delete body.dataset.scrollY;
                window.scrollTo(0, scrollY);

                /* Restore focus */
                if (previouslyFocused && previouslyFocused.focus) {
                    previouslyFocused.focus();
                } else {
                    menuToggle.focus();
                }
            };

            /* Toggle */
            menuToggle.addEventListener("click", () => {
                state.isMobileMenuOpen ? closeMenu() : openMenu();
            });

            /* Close on link click */
            mobileNavigationLinks.forEach((link) => {
                link.addEventListener("click", closeMenu);
            });

            /* Escape key */
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && state.isMobileMenuOpen) {
                    closeMenu();
                }

                /* Focus trap */
                if (event.key === "Tab" && state.isMobileMenuOpen) {
                    const focusables = Array.from(
                        mobileNavigation.querySelectorAll(focusableSelector)
                    ).filter((el) => el.offsetParent !== null);

                    if (!focusables.length) return;

                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];

                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            });

            /* Click outside */
            mobileNavigation.addEventListener("click", (event) => {
                if (event.target === mobileNavigation) {
                    closeMenu();
                }
            });

            /* Close on resize to desktop */
            const handleResize = debounce(() => {
                if (window.innerWidth > 1024 && state.isMobileMenuOpen) {
                    closeMenu();
                }
            }, 200);

            window.addEventListener("resize", handleResize, { passive: true });
        }


        /* =================================================
           MOBILE MENU ACCESSIBILITY
        ================================================== */

        function initMenuAccessibility() {
            if (!menuToggle || !mobileNavigation) return;

            menuToggle.setAttribute("aria-expanded", "false");
            mobileNavigation.setAttribute("aria-hidden", "true");
        }


        /* =================================================
           IMAGE LOAD REFRESH
        ================================================== */

        function initImageRefresh() {

            const images = document.querySelectorAll("img");
            if (!images.length) return;

            const refresh = debounce(() => {
                if (state.hasScrollTrigger) ScrollTrigger.refresh();
            }, 200);

            images.forEach((image) => {
                if (!image.complete) {
                    image.addEventListener("load", refresh, { once: true, passive: true });
                    image.addEventListener("error", refresh, { once: true, passive: true });
                }
            });

            setTimeout(refresh, 800);
        }


        /* =================================================
           RESIZE HANDLING
        ================================================== */

        function initResizeHandling() {

            const handleResize = debounce(() => {
                state.viewportWidth = window.innerWidth;
                state.viewportHeight = window.innerHeight;

                if (state.hasScrollTrigger) ScrollTrigger.refresh();
            }, 250);

            window.addEventListener("resize", handleResize, { passive: true });
        }


        /* =================================================
           ANCHOR LINKS
        ================================================== */

        function initAnchorLinks() {

            const anchors = document.querySelectorAll('a[href^="#"]');

            anchors.forEach((link) => {
                link.addEventListener("click", (event) => {
                    const targetId = link.getAttribute("href");

                    if (!targetId || targetId === "#") return;

                    const target = document.querySelector(targetId);
                    if (!target) return;

                    event.preventDefault();

                    if (state.lenis && typeof state.lenis.scrollTo === "function") {
                        state.lenis.scrollTo(target, { offset: -80, duration: 1.1 });
                    } else {
                        target.scrollIntoView({
                            behavior: state.prefersReducedMotion ? "auto" : "smooth"
                        });
                    }
                });
            });
        }


        /* =================================================
           ACTIVE NAVIGATION
        ================================================== */

        function initActiveNavigation() {

            const currentPage = window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

            navLinks.forEach((link) => {
                const href = link.getAttribute("href");
                if (!href) return;

                const linkPage = href.split("/").pop().toLowerCase();

                const isHome =
                    (currentPage === "" || currentPage === "index.html") &&
                    linkPage === "index.html";

                const isMatch = linkPage === currentPage;

                if (isHome || isMatch) {
                    link.classList.add("active");
                }
            });
        }


        /* =================================================
           INITIALIZE ALL
        ================================================== */

        initPageVisibility();
        initMenuAccessibility();
        initSmoothScroll();
        initCustomCursor();
        initHeader();
        initHeroAnimation();
        initScrollReveals();
        initParallax();
        initWorkHover();
        initMobileMenu();
        initImageRefresh();
        initResizeHandling();
        initAnchorLinks();
        initActiveNavigation();


        /* =================================================
           FINAL REFRESH
        ================================================== */

        setTimeout(() => {
            if (state.hasScrollTrigger) ScrollTrigger.refresh();
        }, 1000);


        /* =================================================
           CLEANUP ON UNLOAD
        ================================================== */

        window.addEventListener("beforeunload", () => {
            if (state.lenis && typeof state.lenis.destroy === "function") {
                state.lenis.destroy();
            }
        });
    });


    /* =========================================================
       PAGE-SPECIFIC MODULES
    ========================================================= */


    /* =========================================================
       ABOUT PAGE
    ========================================================= */

    const isAboutPage = document.body.classList.contains("about-page");

    if (isAboutPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            /* Hero image scale-in */
            const heroImage = document.querySelector(".about-hero-background .parallax-img");

            if (heroImage && hasGsap && !reducedMotion) {
                gsap.fromTo(heroImage,
                    { scale: 1.12 },
                    { scale: 1, duration: 2.2, ease: "power3.out" }
                );
            }

            /* Large image hover */
            const largeImage = document.querySelector("[data-about-image]");

            if (largeImage && hasGsap && !reducedMotion) {
                const img = largeImage.querySelector("img");
                if (img) {
                    largeImage.addEventListener("mouseenter", () => {
                        gsap.to(img, { scale: 1.08, duration: 1, ease: "power3.out", overwrite: true });
                    });
                    largeImage.addEventListener("mouseleave", () => {
                        gsap.to(img, { scale: 1.05, duration: 0.9, ease: "power3.out", overwrite: true });
                    });
                }
            }

            /* Principle hover */
            document.querySelectorAll(".about-principle").forEach((principle) => {
                const number = principle.querySelector(".about-principle-number");
                const heading = principle.querySelector("h3");
                if (!number || !heading || !hasGsap) return;

                principle.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(number, { x: 6, duration: 0.4, ease: "power3.out" });
                    gsap.to(heading, { x: 8, duration: 0.5, ease: "power3.out" });
                });

                principle.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(number, { x: 0, duration: 0.4, ease: "power3.out" });
                    gsap.to(heading, { x: 0, duration: 0.5, ease: "power3.out" });
                });
            });

            /* Capability cards hover */
            document.querySelectorAll(".about-capability-item").forEach((card) => {
                const title = card.querySelector("h3");
                const arrow = card.querySelector(".text-link span:last-child");
                if (!title || !hasGsap) return;

                card.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(title, { x: 8, duration: 0.5, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 5, y: -5, duration: 0.4, ease: "power3.out" });
                });

                card.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(title, { x: 0, duration: 0.5, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: 0.4, ease: "power3.out" });
                });
            });

            /* Statement parallax */
            const statementImage = document.querySelector(".about-statement-bg .parallax-img");

            if (statementImage && hasGsap && hasScrollTrigger && !reducedMotion) {
                gsap.fromTo(statementImage,
                    { yPercent: -8 },
                    {
                        yPercent: 8,
                        ease: "none",
                        scrollTrigger: {
                            trigger: ".about-statement",
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );
            }

            /* Scroll mark animation */
            const scrollLabel = document.querySelector(".about-scroll-label span:last-child");

            if (scrollLabel && hasGsap && !reducedMotion) {
                gsap.to(scrollLabel, {
                    y: 6,
                    duration: 0.9,
                    repeat: -1,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }
        });
    }


    /* =========================================================
       FILMS PAGE
    ========================================================= */

    const isFilmsPage = document.body.classList.contains("films-page");

    if (isFilmsPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            /* Hero image intro */
            const heroImage = document.querySelector(".films-hero-background .parallax-img");

            if (heroImage && hasGsap && !reducedMotion) {
                gsap.fromTo(heroImage,
                    { scale: 1.12 },
                    { scale: 1, duration: 2.2, ease: "power3.out" }
                );
            }

            /* Film card hover */
            document.querySelectorAll(".film-card").forEach((card) => {
                const image = card.querySelector(".film-card-image img");
                const play = card.querySelector(".film-play");
                if (!image || !hasGsap) return;

                card.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.06, duration: 1, ease: "power3.out", overwrite: true });
                    if (play) gsap.to(play, { y: 0, duration: 0.45, ease: "power3.out" });
                });

                card.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.015, duration: 0.9, ease: "power3.out", overwrite: true });
                    if (play) gsap.to(play, { y: 15, duration: 0.4, ease: "power3.out" });
                });
            });

            /* Film card tilt */
            document.querySelectorAll(".film-card-featured").forEach((card) => {
                if (isCoarsePointer() || reducedMotion || !hasGsap) return;

                card.addEventListener("mousemove", (event) => {
                    const rect = card.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    const rotateY = ((x / rect.width) - 0.5) * 2;
                    const rotateX = ((y / rect.height) - 0.5) * -2;
                    const image = card.querySelector(".film-card-image");
                    if (!image) return;

                    gsap.to(image, {
                        rotateX, rotateY,
                        transformPerspective: 1000,
                        duration: 0.5,
                        ease: "power2.out",
                        overwrite: true
                    });
                });

                card.addEventListener("mouseleave", () => {
                    const image = card.querySelector(".film-card-image");
                    if (!image) return;

                    gsap.to(image, {
                        rotateX: 0, rotateY: 0,
                        duration: 0.7,
                        ease: "power3.out",
                        overwrite: true
                    });
                });
            });

            /* Scroll indicator */
            const scrollArrow = document.querySelector(".films-scroll-label span:last-child");

            if (scrollArrow && hasGsap && !reducedMotion) {
                gsap.to(scrollArrow, {
                    y: 6, duration: 0.9, repeat: -1, yoyo: true, ease: "power1.inOut"
                });
            }

            /* Capability rows hover */
            document.querySelectorAll(".films-capability-row").forEach((row) => {
                const number = row.querySelector("> span");
                const title = row.querySelector("h3");
                if (!number || !title || !hasGsap) return;

                row.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(number, { x: 5, duration: 0.4, ease: "power3.out" });
                    gsap.to(title, { x: 8, duration: 0.5, ease: "power3.out" });
                });

                row.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(number, { x: 0, duration: 0.4, ease: "power3.out" });
                    gsap.to(title, { x: 0, duration: 0.5, ease: "power3.out" });
                });
            });

            /* Statement parallax */
            const statementImage = document.querySelector(".films-statement-background .parallax-img");

            if (statementImage && hasGsap && hasScrollTrigger && !reducedMotion) {
                gsap.fromTo(statementImage,
                    { yPercent: -8 },
                    {
                        yPercent: 8,
                        ease: "none",
                        scrollTrigger: {
                            trigger: ".films-statement",
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );
            }
        });
    }


    /* =========================================================
       PHOTOGRAPHY PAGE
    ========================================================= */

    const isPhotographyPage = document.body.classList.contains("photography-page");

    if (isPhotographyPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            /* Hero */
            const heroImage = document.querySelector(".photo-hero-background img");
            const heroContent = document.querySelector(".photo-hero-content");
            const heroTop = document.querySelector(".photo-hero-top");
            const heroBottom = document.querySelector(".photo-hero-bottom");

            if (!reducedMotion && hasGsap) {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                if (heroImage) {
                    tl.fromTo(heroImage,
                        { scale: 1.12, opacity: 0 },
                        { scale: 1.04, opacity: 1, duration: 1.8 },
                        0
                    );
                }
                if (heroTop) {
                    tl.fromTo(heroTop,
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.9 },
                        0.35
                    );
                }
                if (heroContent) {
                    tl.fromTo(heroContent,
                        { y: 45, opacity: 0 },
                        { y: 0, opacity: 1, duration: 1.05 },
                        0.45
                    );
                }
                if (heroBottom) {
                    tl.fromTo(heroBottom,
                        { y: 25, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.85 },
                        0.75
                    );
                }
            }

            /* Hero parallax */
            if (!reducedMotion && hasGsap && hasScrollTrigger && heroImage) {
                gsap.to(heroImage, {
                    yPercent: 8,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".photo-hero",
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }

            /* Project reveals */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                const projectImages = document.querySelectorAll(
                    ".photo-feature-image, .photo-project-image, .photo-wide-image"
                );

                projectImages.forEach((image, index) => {
                    gsap.fromTo(image,
                        { y: 45, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 1.05,
                            ease: "power3.out",
                            delay: index * 0.04,
                            scrollTrigger: {
                                trigger: image,
                                start: "top 88%",
                                once: true
                            }
                        }
                    );
                });
            }

            /* Parallax */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                document.querySelectorAll(".photo-parallax-image").forEach((image) => {
                    const parent = image.closest(".photo-feature, .photo-wide-project");
                    if (!parent) return;

                    gsap.fromTo(image,
                        { yPercent: -4 },
                        {
                            yPercent: 4,
                            ease: "none",
                            scrollTrigger: {
                                trigger: parent,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: true
                            }
                        }
                    );
                });
            }

            /* Project hover */
            document.querySelectorAll(
                ".photo-feature, .photo-project, .photo-wide-project"
            ).forEach((project) => {
                const image = project.querySelector(
                    ".photo-feature-image img, .photo-project-image img, .photo-wide-image img"
                );
                if (!image || !hasGsap) return;

                project.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.045, duration: 0.9, ease: "power3.out" });
                });

                project.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1, duration: 1, ease: "power3.out" });
                });
            });

            /* Category hover */
            document.querySelectorAll(".photo-category").forEach((category) => {
                const heading = category.querySelector("h3");
                const arrow = category.querySelector(".photo-category-arrow");

                category.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    if (heading) gsap.to(heading, { x: 8, duration: 0.45, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 5, y: -5, duration: 0.45, ease: "power3.out" });
                });

                category.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    if (heading) gsap.to(heading, { x: 0, duration: 0.5, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: 0.5, ease: "power3.out" });
                });
            });

            /* Statement */
            const statementImage = document.querySelector(".photo-statement-background img");
            const statementHeading = document.querySelector(".photo-statement-content h2");

            if (!reducedMotion && hasGsap && hasScrollTrigger && statementImage) {
                gsap.fromTo(statementImage,
                    { yPercent: -7 },
                    {
                        yPercent: 7,
                        ease: "none",
                        scrollTrigger: {
                            trigger: ".photo-statement",
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );
            }

            if (!reducedMotion && hasGsap && hasScrollTrigger && statementHeading) {
                gsap.fromTo(statementHeading,
                    { y: 60, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1.1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ".photo-statement",
                            start: "top 70%",
                            once: true
                        }
                    }
                );
            }

            /* CTA */
            const cta = document.querySelector(".photo-final-grid");

            if (!reducedMotion && hasGsap && hasScrollTrigger && cta) {
                gsap.fromTo(cta,
                    { y: 50, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: cta,
                            start: "top 82%",
                            once: true
                        }
                    }
                );
            }
        });
    }


    /* =========================================================
       MAKING OF PAGE
    ========================================================= */

    const isMakingOfPage = document.body.classList.contains("making-of-page");

    if (isMakingOfPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            const heroImage = document.querySelector(".making-hero-background img");
            const heroTop = document.querySelector(".making-hero-top");
            const heroContent = document.querySelector(".making-hero-content");
            const heroBottom = document.querySelector(".making-hero-bottom");

            /* Hero intro */
            if (!reducedMotion && hasGsap) {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                if (heroImage) {
                    tl.fromTo(heroImage,
                        { scale: 1.13, opacity: 0 },
                        { scale: 1.06, opacity: 1, duration: 1.8 },
                        0
                    );
                }
                if (heroTop) {
                    tl.fromTo(heroTop,
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.9 },
                        0.35
                    );
                }
                if (heroContent) {
                    tl.fromTo(heroContent,
                        { y: 45, opacity: 0 },
                        { y: 0, opacity: 1, duration: 1.05 },
                        0.45
                    );
                }
                if (heroBottom) {
                    tl.fromTo(heroBottom,
                        { y: 25, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.85 },
                        0.75
                    );
                }
            }

            /* Hero parallax */
            if (!reducedMotion && hasGsap && hasScrollTrigger && heroImage) {
                gsap.to(heroImage, {
                    yPercent: 8,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".making-hero",
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }

            /* Process reveals */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                document.querySelectorAll(".making-process-item").forEach((item, index) => {
                    gsap.fromTo(item,
                        { y: 35, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 0.8,
                            ease: "power3.out",
                            delay: index * 0.06,
                            scrollTrigger: {
                                trigger: item,
                                start: "top 88%",
                                once: true
                            }
                        }
                    );
                });
            }

            /* Project reveals */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                const projectImages = document.querySelectorAll(
                    ".making-feature-image, .making-project-image, .making-wide-image"
                );

                projectImages.forEach((image, index) => {
                    gsap.fromTo(image,
                        { y: 45, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 1.05,
                            ease: "power3.out",
                            delay: index * 0.04,
                            scrollTrigger: {
                                trigger: image,
                                start: "top 88%",
                                once: true
                            }
                        }
                    );
                });
            }

            /* Parallax */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                document.querySelectorAll(".making-parallax-image").forEach((image) => {
                    const parent = image.closest(".making-feature, .making-wide-project");
                    if (!parent) return;

                    gsap.fromTo(image,
                        { yPercent: -4 },
                        {
                            yPercent: 4,
                            ease: "none",
                            scrollTrigger: {
                                trigger: parent,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: true
                            }
                        }
                    );
                });
            }

            /* Project hover */
            document.querySelectorAll(
                ".making-feature, .making-project, .making-wide-project"
            ).forEach((project) => {
                const image = project.querySelector(
                    ".making-feature-image img, .making-project-image img, .making-wide-image img"
                );
                if (!image) return;

                project.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.045, duration: 0.9, ease: "power3.out" });
                });

                project.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1, duration: 1, ease: "power3.out" });
                });
            });

            /* Process hover */
            document.querySelectorAll(".making-process-item").forEach((item) => {
                const heading = item.querySelector("h3");
                if (!heading) return;

                item.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(heading, { x: 8, duration: 0.45, ease: "power3.out" });
                });

                item.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(heading, { x: 0, duration: 0.5, ease: "power3.out" });
                });
            });

            /* Statement */
            const statementImage = document.querySelector(".making-statement-background img");
            const statementHeading = document.querySelector(".making-statement-content h2");

            if (!reducedMotion && hasGsap && hasScrollTrigger && statementImage) {
                gsap.fromTo(statementImage,
                    { yPercent: -7 },
                    {
                        yPercent: 7,
                        ease: "none",
                        scrollTrigger: {
                            trigger: ".making-statement",
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true
                        }
                    }
                );
            }

            if (!reducedMotion && hasGsap && hasScrollTrigger && statementHeading) {
                gsap.fromTo(statementHeading,
                    { y: 60, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1.1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ".making-statement",
                            start: "top 70%",
                            once: true
                        }
                    }
                );
            }

            /* CTA */
            const cta = document.querySelector(".making-final-grid");

            if (!reducedMotion && hasGsap && hasScrollTrigger && cta) {
                gsap.fromTo(cta,
                    { y: 50, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: cta,
                            start: "top 82%",
                            once: true
                        }
                    }
                );
            }
        });
    }


    /* =========================================================
       TEAM PAGE
    ========================================================= */

    const isTeamPage = document.body.classList.contains("team-page");

    if (isTeamPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            const heroTop = document.querySelector(".team-hero-top");
            const heroContent = document.querySelector(".team-hero-content");
            const heroBottom = document.querySelector(".team-hero-bottom");
            const heroTitle = document.querySelector(".team-title");

            /* Hero intro */
            if (!reducedMotion && hasGsap) {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                if (heroTop) {
                    tl.fromTo(heroTop,
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.9 },
                        0.25
                    );
                }
                if (heroContent) {
                    tl.fromTo(heroContent,
                        { y: 45, opacity: 0 },
                        { y: 0, opacity: 1, duration: 1.05 },
                        0.4
                    );
                }
                if (heroBottom) {
                    tl.fromTo(heroBottom,
                        { y: 25, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.85 },
                        0.7
                    );
                }
            }

            /* Title movement */
            if (!reducedMotion && hasGsap && hasScrollTrigger && heroTitle) {
                gsap.to(heroTitle, {
                    yPercent: 10,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".team-hero",
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }

            /* Member reveals */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                document.querySelectorAll(".team-member").forEach((member, index) => {
                    gsap.fromTo(member,
                        { y: 55, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 1,
                            delay: index * 0.08,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: member,
                                start: "top 84%",
                                once: true
                            }
                        }
                    );
                });
            }

            /* Member image hover */
            document.querySelectorAll(".team-member-image").forEach((container) => {
                const image = container.querySelector("img");
                if (!image) return;

                container.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.055, duration: 0.9, ease: "power3.out" });
                });

                container.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    gsap.to(image, { scale: 1.015, duration: 1, ease: "power3.out" });
                });
            });

            /* Statement */
            const statement = document.querySelector(".team-statement-content");

            if (!reducedMotion && hasGsap && hasScrollTrigger && statement) {
                gsap.fromTo(statement,
                    { y: 60, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1.1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ".team-statement",
                            start: "top 70%",
                            once: true
                        }
                    }
                );
            }

            /* Values */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                document.querySelectorAll(".team-value").forEach((value, index) => {
                    gsap.fromTo(value,
                        { y: 30, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 0.75,
                            delay: index * 0.05,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: value,
                                start: "top 90%",
                                once: true
                            }
                        }
                    );
                });
            }

            /* Values hover */
            document.querySelectorAll(".team-value").forEach((value) => {
                const heading = value.querySelector("h3");
                const arrow = value.querySelector(".team-value-arrow");

                value.addEventListener("mouseenter", () => {
                    if (reducedMotion) return;
                    if (heading) gsap.to(heading, { x: 8, duration: 0.45, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 5, y: -5, duration: 0.45, ease: "power3.out" });
                });

                value.addEventListener("mouseleave", () => {
                    if (reducedMotion) return;
                    if (heading) gsap.to(heading, { x: 0, duration: 0.5, ease: "power3.out" });
                    if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: 0.5, ease: "power3.out" });
                });
            });

            /* CTA */
            const cta = document.querySelector(".team-final-grid");

            if (!reducedMotion && hasGsap && hasScrollTrigger && cta) {
                gsap.fromTo(cta,
                    { y: 50, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: cta,
                            start: "top 82%",
                            once: true
                        }
                    }
                );
            }
        });
    }


    /* =========================================================
       CONTACT PAGE
    ========================================================= */

    const isContactPage = document.body.classList.contains("contact-page");

    if (isContactPage) {

        document.addEventListener("DOMContentLoaded", () => {
            const reducedMotion = prefersReducedMotion();
            const hasGsap = typeof gsap !== "undefined";
            const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

            const heroTop = document.querySelector(".contact-hero-top");
            const heroContent = document.querySelector(".contact-hero-content");
            const heroBottom = document.querySelector(".contact-hero-bottom");
            const heroTitle = document.querySelector(".contact-title");

            /* Hero intro */
            if (!reducedMotion && hasGsap) {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

                if (heroTop) {
                    tl.fromTo(heroTop,
                        { y: 20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.9 },
                        0.25
                    );
                }
                if (heroContent) {
                    tl.fromTo(heroContent,
                        { y: 45, opacity: 0 },
                        { y: 0, opacity: 1, duration: 1.05 },
                        0.4
                    );
                }
                if (heroBottom) {
                    tl.fromTo(heroBottom,
                        { y: 25, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.85 },
                        0.7
                    );
                }
            }

            /* Title movement */
            if (!reducedMotion && hasGsap && hasScrollTrigger && heroTitle) {
                gsap.to(heroTitle, {
                    yPercent: 9,
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".contact-hero",
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }

            /* Layout reveal */
            if (!reducedMotion && hasGsap && hasScrollTrigger) {
                const details = document.querySelector(".contact-details");
                const form = document.querySelector(".contact-form-wrapper");

                if (details) {
                    gsap.fromTo(details,
                        { y: 45, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 1,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: ".contact-main",
                                start: "top 78%",
                                once: true
                            }
                        }
                    );
                }

                if (form) {
                    gsap.fromTo(form,
                        { y: 55, opacity: 0 },
                        {
                            y: 0, opacity: 1,
                            duration: 1.05,
                            delay: 0.1,
                            ease: "power3.out",
                            scrollTrigger: {
                                trigger: ".contact-main",
                                start: "top 78%",
                                once: true
                            }
                        }
                    );
                }
            }

            /* Form field focus */
            document.querySelectorAll(".contact-form-field").forEach((field) => {
                const input = field.querySelector("input, textarea");
                if (!input) return;

                input.addEventListener("focus", () => {
                    if (reducedMotion) return;
                    gsap.to(field, {
                        paddingLeft: 8, paddingRight: 8,
                        duration: 0.35,
                        ease: "power3.out"
                    });
                });

                input.addEventListener("blur", () => {
                    if (reducedMotion) return;
                    gsap.to(field, {
                        paddingLeft: 0, paddingRight: 0,
                        duration: 0.4,
                        ease: "power3.out"
                    });
                });
            });

            /* Form submission */
            const form = document.querySelector(".contact-form");
            const submit = document.querySelector(".contact-submit");
            const message = document.querySelector(".contact-form-message");

            if (form) {
                form.addEventListener("submit", (event) => {
                    event.preventDefault();

                    const nameInput = document.querySelector("#contact-name");
                    const emailInput = document.querySelector("#contact-email");
                    const projectInput = document.querySelector("#contact-project");

                    if (!nameInput || !emailInput || !projectInput) return;

                    const name = nameInput.value.trim();
                    const email = emailInput.value.trim();
                    const project = projectInput.value.trim();

                    if (!name || !email || !project) {
                        if (message) message.textContent = "Please complete all fields before submitting.";
                        return;
                    }

                    if (!emailInput.checkValidity()) {
                        if (message) message.textContent = "Please enter a valid email address.";
                        emailInput.focus();
                        return;
                    }

                    if (message) {
                        message.textContent =
                            "Your brief is ready to send. Connect this form to your preferred email or backend service to receive submissions.";
                    }

                    if (submit) submit.blur();
                });
            }

            /* Statement */
            const statement = document.querySelector(".contact-statement-content");

            if (!reducedMotion && hasGsap && hasScrollTrigger && statement) {
                gsap.fromTo(statement,
                    { y: 60, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 1.1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: ".contact-statement",
                            start: "top 70%",
                            once: true
                        }
                    }
                );
            }

            /* Final reveal */
            const final = document.querySelector(".contact-final-inner");

            if (!reducedMotion && hasGsap && hasScrollTrigger && final) {
                gsap.fromTo(final,
                    { y: 40, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 0.9,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: final,
                            start: "top 85%",
                            once: true
                        }
                    }
                );
            }
        });
    }

})();