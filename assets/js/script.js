// predictive search: filters the site's own product/collection/page data as
// the user types, matching the real theme's Suggestions/Pages/Collections/
// Products layout. There's no backend here, so this is a client-side index.
(function () {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("searchResults");
  if (!input || !resultsEl) return;

  const innerEl = resultsEl.querySelector(".search-results__inner");
  const viewMoreEl = document.getElementById("searchViewMore");
  const emptyEl = document.getElementById("searchEmpty");

  const suggestionsGroup = document.getElementById("searchSuggestionsGroup");
  const suggestionsList = document.getElementById("searchSuggestionsList");
  const pagesGroup = document.getElementById("searchPagesGroup");
  const pagesList = document.getElementById("searchPagesList");
  const collectionsGroup = document.getElementById("searchCollectionsGroup");
  const collectionsList = document.getElementById("searchCollectionsList");
  const productsGroup = document.getElementById("searchProductsGroup");
  const productsList = document.getElementById("searchProductsList");

  const index = {
    suggestions: [
      "linen dress",
      "midi skirt",
      "wide leg trousers",
      "overshirt",
      "cardigan",
      "knit top",
      "wool coat",
      "co-ord set",
      "tailored shorts",
      "linen shirt",
    ],
    pages: ["The Lookbook", "Journal", "Theme Features"],
    collections: [
      "New", "Clothing", "Sale", "Tops", "Bottoms", "Dresses", "Layers", "Linen",
      "The Linen Edit", "Everyday Essentials", "New Dresses", "New Tops",
      "New Bottoms", "New Layers", "New Linen", "Minimalist Staples",
      "Soft Tailoring", "Neutral Tones", "Monochrome Looks", "Workwear",
      "Weekend", "Vacation Ready", "Event Dressing", "Staff Picks",
      "Spring / Summer Edit", "All New", "New This Week",
    ],
    products: [
      { name: "The Lido Short", image: "./assets/images/products/product-lido-short.png" },
      { name: "The Brisa Overshirt", image: "./assets/images/products/product-brisa-overshirt.png" },
      { name: "The Cove Skirt", image: "./assets/images/products/product-cove-skirt.png" },
      { name: "The Arden Co-ord", image: "./assets/images/products/product-arden-coord.png" },
      { name: "The Vela Shirt", image: "./assets/images/products/product-vela-shirt.png" },
      { name: "The Wren Coat", image: "./assets/images/products/product-wren-coat.png" },
      { name: "The Ceru Knit", image: "./assets/images/products/product-ceru-knit.png" },
      { name: "The Hana Overshirt", image: "./assets/images/products/product-hana-overshirt.png" },
      { name: "The Lark Jacket", image: "./assets/images/products/product-lark-jacket.png" },
      { name: "The Eno Cardigan", image: "./assets/images/products/product-eno-cardigan.png" },
    ],
  };

  function matches(text, query) {
    return text.toLowerCase().includes(query);
  }

  function fillList(listEl, items, render) {
    listEl.innerHTML = items.map(render).join("");
  }

  function runSearch() {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      resultsEl.hidden = true;
      return;
    }

    const matchedSuggestions = index.suggestions.filter((s) => matches(s, query)).slice(0, 4);
    const matchedPages = index.pages.filter((p) => matches(p, query)).slice(0, 3);
    const matchedCollections = index.collections.filter((c) => matches(c, query)).slice(0, 5);
    const matchedProducts = index.products.filter((p) => matches(p.name, query)).slice(0, 4);

    const hasResults =
      matchedSuggestions.length || matchedPages.length || matchedCollections.length || matchedProducts.length;

    resultsEl.hidden = false;
    innerEl.hidden = !hasResults;
    viewMoreEl.hidden = !hasResults;
    emptyEl.hidden = hasResults;

    if (!hasResults) {
      emptyEl.textContent = `No results found for "${input.value.trim()}"`;
      return;
    }

    suggestionsGroup.hidden = !matchedSuggestions.length;
    fillList(suggestionsList, matchedSuggestions, (s) => `<li><a href="#">${s}</a></li>`);

    pagesGroup.hidden = !matchedPages.length;
    fillList(pagesList, matchedPages, (p) => `<li><a href="#">${p}</a></li>`);

    collectionsGroup.hidden = !matchedCollections.length;
    fillList(collectionsList, matchedCollections, (c) => `<li><a href="#">${c}</a></li>`);

    productsGroup.hidden = !matchedProducts.length;
    fillList(
      productsList,
      matchedProducts,
      (p) => `<li><a href="#"><img src="${p.image}" alt="${p.name}"><span>${p.name}</span></a></li>`
    );
  }

  input.addEventListener("input", runSearch);
})();

// eased mouse-wheel scrolling for the whole page. CSS scroll-behavior:smooth
// (already set on <html>) only smooths anchor/programmatic jumps — it does
// nothing for ordinary wheel scrolling, which is what actually feels smooth
// or not on a desktop mouse. Left untouched on touch devices (native touch
// scroll is already smooth/inertial) and for reduced-motion users, and it
// steps aside over anything that scrolls its own content (drawers, dropdown,
// horizontal product carousels) so those keep their native wheel behavior.
(function () {
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isTouch || reduceMotion) return;

  const innerScrollSelector =
    ".mobile-nav, .cart-drawer, .header__currency-list, .header__search-bar, .product-modal__inner";
  // this one is separate from the blanket exclusions above: it only scrolls
  // horizontally (scroll-snap-type: x), and Chrome's snap containers can
  // absorb even a plain vertical mouse-wheel notch instead of letting it
  // bubble to the page — so it's excluded only for genuinely horizontal
  // gestures (trackpad swipe, shift+wheel), not a normal vertical scroll
  const carouselSelector = ".product-row__scroller";

  // fixed per-frame multiplier (not time-based decay) — matches the exact
  // glide feel of the reference implementation this was ported from
  const ease = 0.1;
  const LINE_HEIGHT = 34; // px per "line" when a device reports DOM_DELTA_LINE
  let current = window.scrollY;
  let target = window.scrollY;
  let raf = null;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeDelta(e) {
    if (e.deltaMode === 1) return e.deltaY * LINE_HEIGHT; // DOM_DELTA_LINE
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // DOM_DELTA_PAGE
    return e.deltaY; // DOM_DELTA_PIXEL
  }

  function step() {
    current += (target - current) * ease;

    if (Math.abs(target - current) < 0.5) {
      current = target;
      window.scrollTo({ top: current, left: 0, behavior: "instant" });
      raf = null;
      return;
    }

    // must be "instant" — the page has CSS scroll-behavior:smooth, and without
    // this every single lerp frame would ALSO get browser-level smoothing on
    // top of our own, compounding into stutter instead of clean motion
    window.scrollTo({ top: current, left: 0, behavior: "instant" });
    raf = requestAnimationFrame(step);
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.target.closest(innerScrollSelector)) return;
      if (e.target.closest(carouselSelector) && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.ctrlKey) return; // let pinch-zoom / ctrl+wheel zoom through untouched

      e.preventDefault();
      target = clamp(target + normalizeDelta(e), 0, maxScroll());
      if (!raf) raf = requestAnimationFrame(step);
    },
    { passive: false }
  );

  // stay in sync when scroll happens some other way (keyboard, scrollbar drag,
  // anchor jump) so the next wheel tick continues from the right place
  window.addEventListener(
    "scroll",
    () => {
      if (!raf) {
        current = window.scrollY;
        target = window.scrollY;
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    target = clamp(target, 0, maxScroll());
  });
})();

// announcement bar rotation
(function () {
  const slides = document.querySelectorAll(".announcement-bar__slide");
  if (!slides.length) return;
  let current = 0;
  setInterval(() => {
    slides[current].classList.remove("is-active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("is-active");
  }, 4000);
})();

// smooth accordion for the mobile nav's nested <details>, and the footer's
// link columns on mobile — native open/close has no transition, so height is
// animated manually while the real "open" attribute stays in sync (for the
// chevron-rotate CSS and a11y). The footer columns are pointer-events:none
// on desktop, so this simply never fires there.
(function () {
  const summaries = document.querySelectorAll(
    ".mobile-nav__details > summary, .footer__accordion > summary"
  );
  if (!summaries.length) return;

  // the footer columns ship "open" in the HTML (so desktop always shows
  // them, no JS required there) — on mobile widths, collapse them by
  // default like a normal accordion, no animation needed for this
  if (window.matchMedia("(max-width: 900px)").matches) {
    document.querySelectorAll(".footer__accordion").forEach((details) => {
      details.removeAttribute("open");
    });
  }

  summaries.forEach((summary) => {
    const details = summary.parentElement;
    const content = summary.nextElementSibling;
    if (!content) return;
    // footer columns fade+slide alongside the height change, timed to match
    // the real theme's collapsible (slower ease-out on open, quicker on close)
    const isFooter = details.classList.contains("footer__accordion");

    summary.addEventListener("click", (e) => {
      e.preventDefault();

      content.getAnimations().forEach((anim) => anim.cancel());

      if (details.hasAttribute("open")) {
        // closing: freeze at current height, then animate down to 0
        const startHeight = content.scrollHeight;
        content.style.height = startHeight + "px";
        if (isFooter) {
          content.style.transition =
            "height .3s cubic-bezier(.25,.46,.45,.94), opacity .3s cubic-bezier(.25,.46,.45,.94)";
          content.style.opacity = "1";
        }
        content.offsetHeight; // force reflow so the browser sees the "from" state
        content.style.height = "0px";
        if (isFooter) content.style.opacity = "0";

        content.addEventListener(
          "transitionend",
          function onEnd(ev) {
            if (ev.propertyName !== "height") return;
            details.removeAttribute("open");
            content.style.height = "";
            if (isFooter) {
              content.style.opacity = "";
              content.style.transition = "";
            }
          },
          { once: true }
        );
      } else {
        // opening: reveal the content, animate from 0 up to its natural height
        details.setAttribute("open", "");
        const endHeight = content.scrollHeight;
        content.style.height = "0px";
        if (isFooter) {
          content.style.transition =
            "height .35s cubic-bezier(.25,.46,.45,.94), opacity 1s cubic-bezier(.25,.46,.45,.94)";
          content.style.opacity = "0";
        }
        content.offsetHeight; // force reflow
        content.style.height = endHeight + "px";
        if (isFooter) content.style.opacity = "1";

        content.addEventListener(
          "transitionend",
          function onEnd(ev) {
            if (ev.propertyName !== "height") return;
            content.style.height = "";
            if (isFooter) {
              content.style.opacity = "";
              content.style.transition = "";
            }
          },
          { once: true }
        );
      }
    });
  });
})();

// currency selector dropdown
(function () {
  const toggle = document.getElementById("currencyToggle");
  const list = document.getElementById("currencyList");
  if (!toggle || !list) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    list.classList.toggle("is-open");
  });

  document.addEventListener("click", (e) => {
    if (!list.contains(e.target)) list.classList.remove("is-open");
  });
})();

// shared off-canvas system: mobile nav drawer + cart drawer, one overlay
(function () {
  const menuToggle = document.getElementById("menuToggle");
  const mobileNavClose = document.getElementById("mobileNavClose");
  const mobileNav = document.getElementById("mobileNav");

  const cartToggle = document.getElementById("cartToggle");
  const cartClose = document.getElementById("cartClose");
  const cartDrawer = document.getElementById("cartDrawer");

  const overlay = document.getElementById("navOverlay");
  if (!overlay) return;

  function closeAll() {
    mobileNav && mobileNav.classList.remove("is-open");
    cartDrawer && cartDrawer.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    document.body.classList.remove("nav-open");
  }

  function openPanel(panel) {
    closeAll();
    panel.classList.add("is-open");
    overlay.classList.add("is-visible");
    document.body.classList.add("nav-open");
  }

  menuToggle &&
    menuToggle.addEventListener("click", () => openPanel(mobileNav));
  mobileNavClose && mobileNavClose.addEventListener("click", closeAll);

  cartToggle &&
    cartToggle.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel(cartDrawer);
    });
  cartClose && cartClose.addEventListener("click", closeAll);

  overlay.addEventListener("click", closeAll);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
})();

// shopping cart: quick-add buttons populate the cart drawer with real line items
(function () {
  const cartItemsEl = document.getElementById("cartItems");
  const cartEmptyEl = document.getElementById("cartEmpty");
  const cartFooterEl = document.getElementById("cartFooter");
  const cartNoteWrapEl = document.getElementById("cartNoteWrap");
  const cartSubtotalEl = document.getElementById("cartSubtotal");
  const cartCountEl = document.querySelector(".header__cart-count");
  const cartDrawer = document.getElementById("cartDrawer");
  const mobileNav = document.getElementById("mobileNav");
  const overlay = document.getElementById("navOverlay");
  if (!cartItemsEl || !cartDrawer || !overlay) return;

  let cart = [];

  function formatPrice(amount) {
    return "$" + amount.toFixed(0);
  }

  function render() {
    const hasItems = cart.length > 0;
    cartEmptyEl.hidden = hasItems;
    cartFooterEl.hidden = !hasItems;
    cartNoteWrapEl.hidden = !hasItems;

    cartItemsEl.innerHTML = cart
      .map(
        (item) => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item__image">
                <div class="cart-item__details">
                    <p class="cart-item__title">${item.name}</p>
                    <div class="cart-item__qty">
                        <button type="button" class="cart-item__qty-btn" data-action="decrease" aria-label="Decrease quantity">&minus;</button>
                        <span class="cart-item__qty-value">${item.qty}</span>
                        <button type="button" class="cart-item__qty-btn" data-action="increase" aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <span class="cart-item__price">${formatPrice(item.price * item.qty)}</span>
            </div>
        `,
      )
      .join("");

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    cartSubtotalEl.textContent = formatPrice(subtotal);

    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCountEl) cartCountEl.textContent = count;
  }

  function openCart() {
    mobileNav && mobileNav.classList.remove("is-open");
    cartDrawer.classList.add("is-open");
    overlay.classList.add("is-visible");
    document.body.classList.add("nav-open");
  }

  function addToCart({ id, name, price, image }) {
    const existing = cart.find((item) => item.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id, name, price, image, qty: 1 });
    }
    render();
    openCart();
  }

  // the quick-view modal has its own Add to cart button; it dispatches this
  // event rather than reaching into this closure directly
  window.addEventListener("quickview:addtocart", (e) => {
    addToCart(e.detail);
  });

  cartItemsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".cart-item__qty-btn");
    if (!btn) return;
    const row = btn.closest(".cart-item");
    const id = row.dataset.id;
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    if (btn.dataset.action === "increase") {
      item.qty += 1;
    } else {
      item.qty -= 1;
      if (item.qty <= 0) {
        cart = cart.filter((i) => i.id !== id);
      }
    }
    render();
  });

  render();
})();

// search bar dropdown
(function () {
  const bar = document.getElementById("searchBar");
  const searchToggle = document.getElementById("searchToggle");
  const searchToggleMobile = document.getElementById("searchToggleMobile");
  const openBtns = [searchToggle, searchToggleMobile];
  const closeBtn = document.getElementById("searchClose");
  if (!bar) return;

  function closeSearch() {
    bar.classList.remove("is-open");
    const input = bar.querySelector("input");
    const results = document.getElementById("searchResults");
    if (input) input.value = "";
    if (results) results.hidden = true;
  }

  openBtns.forEach((btn) => {
    btn &&
      btn.addEventListener("click", () => {
        bar.classList.toggle("is-open");
        if (bar.classList.contains("is-open")) {
          const input = bar.querySelector("input");
          input && setTimeout(() => input.focus(), 150);
        }
      });
  });

  closeBtn && closeBtn.addEventListener("click", closeSearch);

  // click outside the search bar (and its toggle buttons) closes it
  document.addEventListener("click", (e) => {
    if (!bar.classList.contains("is-open")) return;
    const clickedInside = bar.contains(e.target);
    const clickedToggle =
      (searchToggle && searchToggle.contains(e.target)) ||
      (searchToggleMobile && searchToggleMobile.contains(e.target));
    if (!clickedInside && !clickedToggle) closeSearch();
  });
})();

// mega menu: hover-to-open on desktop, click still works via native <details>
(function () {
  const items = document.querySelectorAll(".megamenu-details");
  if (!items.length) return;

  let closeTimer = null;
  const isDesktop = () => window.matchMedia("(min-width: 901px)").matches;

  items.forEach((details) => {
    details.addEventListener("mouseenter", () => {
      if (!isDesktop()) return;
      clearTimeout(closeTimer);
      items.forEach((d) => {
        if (d !== details) d.removeAttribute("open");
      });
      details.setAttribute("open", "");
    });

    details.addEventListener("mouseleave", () => {
      if (!isDesktop()) return;
      closeTimer = setTimeout(() => details.removeAttribute("open"), 150);
    });
  });

  document.addEventListener("click", (e) => {
    items.forEach((details) => {
      if (!details.contains(e.target)) details.removeAttribute("open");
    });
  });
})();

// sticky header — switches from transparent hero-overlay to solid bar
// once scrolled past the shoppable hero section
(function () {
  const header = document.getElementById("siteHeader");
  const hero = document.querySelector(".shoppable-hero");
  if (!header) return;

  const onScroll = () => {
    const threshold = hero
      ? Math.max(hero.offsetHeight - header.offsetHeight, 80)
      : 80;
    header.classList.toggle("is-stuck", window.scrollY > threshold);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();

// scroll reveal animations (fade + rise, staggered via --i)
(function () {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
  );

  targets.forEach((el) => observer.observe(el));
})();

// shoppable hero hotspot popovers
(function () {
  const dots = document.querySelectorAll(".shoppable-hero__dot");
  if (!dots.length) return;

  function resetPopovers() {
    document.querySelectorAll(".shoppable-hero__popover").forEach((p) => {
      p.classList.remove("is-visible");
      p.style.transform = "";
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = document.getElementById(dot.dataset.target);
      const isVisible = target.classList.contains("is-visible");

      resetPopovers();

      if (!isVisible) {
        target.classList.add("is-visible");

        // hotspots near the left/right edge of the image would otherwise
        // push the centered popover off-screen — nudge it back in, same
        // idea as the real theme's anchor-positioning collision avoidance
        const margin = 12;
        const rect = target.getBoundingClientRect();
        let shift = 0;
        if (rect.left < margin) shift = margin - rect.left;
        else if (rect.right > window.innerWidth - margin)
          shift = window.innerWidth - margin - rect.right;
        if (shift !== 0) {
          target.style.transform = `translate(calc(-50% + ${shift}px), 28px)`;
        }
      }
    });
  });

  document.addEventListener("click", resetPopovers);
})();

// quick view modal — opens from each product card's Quick View bar; reuses
// the same manual height-animation technique as the footer/mobile-nav
// accordions for its Description/Materials/Certifications/Shipping tabs
(function () {
  const PRODUCTS = {
  "lido-short": {
    "title": "The Lido Short",
    "material": "Organic cotton",
    "priceCompare": "$120",
    "priceSale": "$96",
    "priceSave": "Save $24",
    "descPara": "The Lido Short is a relaxed warm-weather staple with a clean, tailored finish. Cut in a light oat linen blend, it sits high on the waist and features soft front pleats that give it shape while keeping the overall look easy and unfussy.",
    "bullets": [
      "High-rise fit",
      "Tailored short silhouette",
      "Soft front pleats",
      "Linen-blend texture",
      "Warm-weather essential"
    ],
    "stylingTip": "Style it with light knits, simple tanks, or oversized shirts for an effortless summer uniform.",
    "images": [
      "./assets/images/products/product-lido-short.png",
      "./assets/images/products/product-lido-short-hover.png",
      "./assets/images/products/product-lido-short-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "brisa-overshirt": {
    "title": "The Brisa Overshirt",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$132",
    "priceSave": "",
    "descPara": "The Brisa Overshirt is a lightweight linen layer with an easy, thrown-on feel. Made in soft sage linen, it has an oversized silhouette, open front styling, and a breezy drape that works beautifully over tanks, tees, and matching bottoms.",
    "bullets": [
      "Oversized fit",
      "Lightweight linen",
      "Open front styling",
      "Easy drape",
      "Soft sage tone"
    ],
    "stylingTip": "It’s the piece you reach for when you want a little coverage without losing that airy warm-weather ease.",
    "images": [
      "./assets/images/products/product-brisa-overshirt.png",
      "./assets/images/products/product-brisa-overshirt-hover.png",
      "./assets/images/products/product-brisa-overshirt-alt2.png",
      "./assets/images/products/product-brisa-overshirt-alt3.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "cove-skirt": {
    "title": "The Cove Skirt",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$112",
    "priceSave": "",
    "descPara": "The Cove Skirt is a clean linen midi with a simple shape and quiet detail. Cut in a warm sand linen, it sits high on the waist and falls into a straight silhouette with a side slit for ease of movement and a slightly sharper finish.",
    "bullets": [
      "Midi length",
      "High-rise waist",
      "Straight silhouette",
      "Side slit detail",
      "Soft linen texture"
    ],
    "stylingTip": "It pairs easily with slim knits, soft tees, or lightweight shirting for a look that feels minimal and refined.",
    "images": [
      "./assets/images/products/product-cove-skirt.png",
      "./assets/images/products/product-cove-skirt-hover.png",
      "./assets/images/products/product-cove-skirt-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "arden-coord": {
    "title": "The Arden Co-ord",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$214",
    "priceSave": "",
    "descPara": "The Arden Co-ord is a relaxed linen set designed to make getting dressed feel easy. The softly oversized shirt and wide-leg trouser work together as a polished matching look, but each piece can also be styled separately for a more everyday feel.",
    "bullets": [
      "Two-piece set",
      "Oversized linen shirt",
      "Wide-leg trousers",
      "Soft natural texture",
      "Easy coordinated dressing"
    ],
    "stylingTip": "Wear it as a full set for a clean tonal statement or mix the pieces into the rest of your wardrobe with ease.",
    "images": [
      "./assets/images/products/product-arden-coord.png",
      "./assets/images/products/product-arden-coord-hover.png",
      "./assets/images/products/product-arden-coord-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "vela-shirt": {
    "title": "The Vela Shirt",
    "material": "Organic cotton",
    "priceCompare": "$130",
    "priceSale": "$118",
    "priceSave": "Save $12",
    "descPara": "The Vela Shirt is a relaxed linen button-up that feels easy, airy, and versatile. Made in a soft warm ivory linen, it has a slightly oversized shape, short sleeves, and a clean collar that gives it just enough structure while still feeling effortless.",
    "bullets": [
      "Relaxed fit",
      "Button-front closure",
      "Short sleeves",
      "Soft linen texture",
      "Easy warm-weather layer"
    ],
    "stylingTip": "Wear it open over a tank or buttoned up with matching trousers for an unfussy summer set.",
    "images": [
      "./assets/images/products/product-vela-shirt.png",
      "./assets/images/products/product-vela-shirt-hover.png",
      "./assets/images/products/product-vela-shirt-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "wren-coat": {
    "title": "The Wren Coat",
    "material": "Wool-blend",
    "priceCompare": null,
    "priceSale": "$286",
    "priceSave": "",
    "descPara": "The Wren Coat is a clean longline outer layer that brings structure and warmth to cooler days. Designed in a rich camel wool-blend, it has a classic tailored silhouette, notched lapel, and a longer length that instantly sharpens whatever you wear underneath.",
    "bullets": [
      "Longline silhouette",
      "Notched lapel",
      "Wool-blend feel",
      "Clean tailored shape",
      "Cool-weather layer"
    ],
    "stylingTip": "Wear it over fine knits, crisp shirting, or easy trousers for a timeless cold-weather look.",
    "images": [
      "./assets/images/products/product-wren-coat.png",
      "./assets/images/products/product-wren-coat-hover.png",
      "./assets/images/products/product-wren-coat-alt2.png",
      "./assets/images/products/product-wren-coat-alt3.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>This coat is finished with a soft camel wool-blend that holds its shape while staying comfortable to wear all day. The blend resists wrinkling and keeps its structure through repeated wear, making it a dependable outer layer for the whole season.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Made from a wool-blend fabric chosen for warmth without excess bulk. The blend is milled to hold a clean drape while remaining soft against layers underneath.<br><br>Dry clean only. Store on a wide hanger to help the shoulders keep their shape, and steam rather than iron directly to refresh the fabric between wears.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Responsibly Sourced Wool<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Made with Care</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "ceru-knit": {
    "title": "The Ceru Knit",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$148",
    "priceSave": "",
    "descPara": "The Ceru Knit is a soft textured sweater with an easy, relaxed shape. Made in a warm ivory knit, it features a classic crew neckline, dropped shoulders, and a slightly cropped length that works beautifully with tailored or relaxed bottoms.",
    "bullets": [
      "Relaxed fit",
      "Crew neckline",
      "Dropped shoulders",
      "Textured knit",
      "Slightly cropped length"
    ],
    "stylingTip": "It’s an effortless knit that adds warmth and softness without overwhelming the rest of the look.",
    "images": [
      "./assets/images/products/product-ceru-knit.png",
      "./assets/images/products/product-ceru-knit-hover.png",
      "./assets/images/products/product-ceru-knit-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "hana-overshirt": {
    "title": "The Hana Overshirt",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$164",
    "priceSave": "",
    "descPara": "The Hana Overshirt is a lightweight layer that sits perfectly between shirt and jacket. Cut in a soft taupe woven fabric, it has an oversized silhouette, chest pocket detail, and an easy drape that makes it ideal for transitional dressing.",
    "bullets": [
      "Oversized fit",
      "Lightweight woven feel",
      "Chest pocket detail",
      "Relaxed drape",
      "Transitional layer"
    ],
    "stylingTip": "Wear it open over a simple tee or buttoned up as a softer alternative to a jacket.",
    "images": [
      "./assets/images/products/product-hana-overshirt.png",
      "./assets/images/products/product-hana-overshirt-hover.png",
      "./assets/images/products/product-hana-overshirt-alt2.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "lark-jacket": {
    "title": "The Lark Jacket",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$204",
    "priceSave": "",
    "descPara": "The Lark Jacket is a utility-inspired layer with a clean, modern edge. Made in a charcoal woven fabric, it features an oversized shirt-jacket silhouette, a structured collar, and large patch pockets that balance ease with function.",
    "bullets": [
      "Oversized fit",
      "Shirt-jacket silhouette",
      "Structured collar",
      "Patch pocket detail",
      "Charcoal woven texture"
    ],
    "stylingTip": "Style it over a simple tee and trousers for a look that feels grounded, practical, and quietly cool.",
    "images": [
      "./assets/images/products/product-lark-jacket.png",
      "./assets/images/products/product-lark-jacket-hover.png",
      "./assets/images/products/product-lark-jacket-alt2.png",
      "./assets/images/products/product-lark-jacket-alt3.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  },
  "eno-cardigan": {
    "title": "The Eno Cardigan",
    "material": "Organic cotton",
    "priceCompare": null,
    "priceSale": "$188",
    "priceSave": "",
    "descPara": "The Eno Cardigan is an easy oversized layer that brings softness and warmth to everyday dressing. Knit in a light stone yarn, it has an open front, a longer line, and a relaxed shape that feels effortless over shirting, knits, and tees.",
    "bullets": [
      "Oversized fit",
      "Open-front design",
      "Longer length",
      "Soft chunky knit",
      "Easy everyday layer"
    ],
    "stylingTip": "It’s the kind of cardigan you’ll reach for over and over when you want something comfortable, clean, and unfussy.",
    "images": [
      "./assets/images/products/product-eno-cardigan.png",
      "./assets/images/products/product-eno-cardigan-hover.png",
      "./assets/images/products/product-eno-cardigan-alt2.png",
      "./assets/images/products/product-eno-cardigan-alt3.png"
    ],
    "tabs": [
      {
        "label": "Description",
        "html": "<p>Crafted from premium linen, this piece offers natural breathability and a relaxed elegance. Linen's inherent texture creates a beautifully lived-in look that softens with every wear, while its lightweight construction makes it perfect for warm weather. The fabric drapes gracefully, providing comfortable movement throughout your day. Easy to care for and designed to develop character over time, this linen essential is a timeless addition to any wardrobe.</p>"
      },
      {
        "label": "Materials & Care",
        "html": "<p>Our pieces are crafted from premium linen sourced from European mills known for their commitment to quality and sustainable practices. Linen is a natural, breathable fabric that becomes softer and more comfortable with every wear, making it an ideal choice for timeless pieces like this skirt.<br><br>To keep your linen garment looking its best, we recommend gentle machine washing in cool water or hand washing with mild detergent. Lay flat to dry to maintain the fabric's natural drape and integrity. A light iron on low heat can help refresh the fabric if needed. Linen's natural texture is part of its charm—slight variations in color and weave are characteristics of this beautiful material, not flaws.</p>"
      },
      {
        "label": "Certifications",
        "html": "<p>Certified Organic<br>Ethically Sourced<br>Fair Trade Certified<br>Quality Assured<br>Sustainable Materials<br>Cruelty-Free<br>Made with Care<br>Eco-Friendly Production</p>"
      },
      {
        "label": "Shipping & Returns",
        "html": "<p>We ship orders within 2-3 business days. Standard delivery takes 5-7 business days. Express shipping is available at checkout for faster delivery.<br><br>Items can be returned within 30 days of purchase in original condition with tags attached. Return shipping is free on orders over $75. Refunds are processed within 5-7 business days of receiving your return.</p>"
      }
    ]
  }
};

  const modal = document.getElementById("quickViewModal");
  const overlay = document.getElementById("quickViewOverlay");
  const closeBtn = document.getElementById("quickViewClose");
  if (!modal || !overlay) return;

  const inner = modal.querySelector(".product-modal__inner");
  const titleEl = document.getElementById("quickViewTitle");
  const materialWrap = document.getElementById("quickViewMaterial");
  const materialTextEl = document.getElementById("quickViewMaterialText");
  const priceEl = document.getElementById("quickViewPrice");
  const descParaEl = document.getElementById("quickViewDescPara");
  const bulletsEl = document.getElementById("quickViewBullets");
  const stylingTipEl = document.getElementById("quickViewStylingTip");
  const mainImgEl = document.getElementById("quickViewMainImg");
  const thumbsEl = document.getElementById("quickViewThumbs");
  const accordionsEl = document.getElementById("quickViewAccordions");
  const addToCartBtn = document.getElementById("quickViewAddToCart");

  function openModal() {
    document.body.classList.add("nav-open");
    overlay.classList.add("is-visible");
    modal.classList.add("is-open");
    if (inner) inner.scrollTop = 0;
  }

  function closeModal() {
    document.body.classList.remove("nav-open");
    overlay.classList.remove("is-visible");
    modal.classList.remove("is-open");
  }

  function setThumb(images, index) {
    mainImgEl.src = images[index];
    thumbsEl.querySelectorAll("img").forEach((img, i) => {
      img.classList.toggle("is-active", i === index);
    });
    if (window.quickViewGallery) window.quickViewGallery.index = index;
  }

  // same manual scrollHeight-measure technique used for the footer and
  // mobile-nav accordions — attached fresh each time the modal repopulates
  // since this markup is rebuilt from scratch per product
  function initAccordion(details) {
    const summary = details.querySelector("summary");
    const content = details.querySelector(".product-modal__accordion-content");
    if (!summary || !content) return;

    summary.addEventListener("click", (e) => {
      e.preventDefault();
      content.getAnimations().forEach((anim) => anim.cancel());

      if (details.hasAttribute("open")) {
        const startHeight = content.scrollHeight;
        content.style.height = startHeight + "px";
        content.offsetHeight;
        content.style.height = "0px";
        content.addEventListener(
          "transitionend",
          function onEnd(ev) {
            if (ev.propertyName !== "height") return;
            details.removeAttribute("open");
            content.style.height = "";
          },
          { once: true }
        );
      } else {
        details.setAttribute("open", "");
        const endHeight = content.scrollHeight;
        content.style.height = "0px";
        content.offsetHeight;
        content.style.height = endHeight + "px";
        content.addEventListener(
          "transitionend",
          function onEnd(ev) {
            if (ev.propertyName !== "height") return;
            content.style.height = "";
          },
          { once: true }
        );
      }
    });
  }

  function populateModal(id, cardImage) {
    const data = PRODUCTS[id];
    if (!data) return;

    titleEl.textContent = data.title;

    if (data.material) {
      materialTextEl.textContent = data.material;
      materialWrap.hidden = false;
    } else {
      materialWrap.hidden = true;
    }

    priceEl.innerHTML = data.priceCompare
      ? `<span class="product-modal__price--compare">${data.priceCompare}</span><span>${data.priceSale}</span><span class="product-modal__price--save">${data.priceSave}</span>`
      : `<span>${data.priceSale}</span>`;

    descParaEl.textContent = data.descPara || "";
    bulletsEl.innerHTML = (data.bullets || [])
      .map((b) => `<li>${b}</li>`)
      .join("");

    if (data.stylingTip) {
      stylingTipEl.textContent = data.stylingTip;
      stylingTipEl.hidden = false;
    } else {
      stylingTipEl.hidden = true;
    }

    thumbsEl.innerHTML = data.images
      .map(
        (src, i) =>
          `<img src="${src}" alt="" class="${i === 0 ? "is-active" : ""}" data-index="${i}">`
      )
      .join("");
    mainImgEl.src = data.images[0];
    thumbsEl.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", () =>
        setThumb(data.images, Number(img.dataset.index))
      );
    });

    // read by the image zoom modal (further down this file) when the main
    // image is clicked, so it knows which product's photos to show and
    // which one is currently active
    window.quickViewGallery = { images: data.images, index: 0 };

    accordionsEl.innerHTML = data.tabs
      .map(
        (tab, i) => `
        <details class="product-modal__accordion"${i === 0 ? " open" : ""}>
          <summary class="product-modal__accordion-heading">${tab.label}
            <svg class="chevron product-modal__accordion-chevron" viewBox="0 0 28 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m1.57 1.59 12.76 12.77L27.1 1.59" stroke-width="2" stroke="currentColor" fill="none" />
            </svg>
          </summary>
          <div class="product-modal__accordion-content">${tab.html}</div>
        </details>`
      )
      .join("");
    accordionsEl
      .querySelectorAll(".product-modal__accordion")
      .forEach(initAccordion);

    const priceNumber = parseFloat(
      (data.priceSale || "0").replace(/[^0-9.]/g, "")
    );
    addToCartBtn.dataset.id = id;
    addToCartBtn.dataset.name = data.title;
    addToCartBtn.dataset.price = priceNumber;
    addToCartBtn.dataset.image = cardImage;
  }

  document.querySelectorAll("[data-quick-view]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      populateModal(btn.dataset.quickView, btn.dataset.image);
      openModal();
    });
  });

  addToCartBtn.addEventListener("click", () => {
    const { id, name, price, image } = addToCartBtn.dataset;
    window.dispatchEvent(
      new CustomEvent("quickview:addtocart", {
        detail: { id, name, price: parseFloat(price), image },
      })
    );
    closeModal();
  });

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);
  // the modal's own transparent backdrop area sits above the overlay
  // element (higher z-index, needed so the centered box stays clickable),
  // so a click landing directly on it — not bubbling from .product-modal__inner —
  // also needs to close it
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !modal.classList.contains("is-open")) return;
    // the size chart modal and the image zoom modal both sit on top of this
    // one — let their own handler close them first instead of dropping
    // this modal at the same time
    const sizeChart = document.getElementById("sizeChartModal");
    if (sizeChart && sizeChart.classList.contains("is-open")) return;
    const imageZoom = document.getElementById("imageZoomModal");
    if (imageZoom && imageZoom.classList.contains("is-open")) return;
    closeModal();
  });
})();

// size chart modal — opens on top of the quick view modal from its
// "Size chart" trigger; shares the one static size table the real theme
// also reuses across every product
(function () {
  const trigger = document.getElementById("quickViewSizeChart");
  const sizeChart = document.getElementById("sizeChartModal");
  const closeBtn = document.getElementById("sizeChartClose");
  if (!trigger || !sizeChart) return;

  function open() {
    sizeChart.classList.add("is-open");
  }

  function close() {
    sizeChart.classList.remove("is-open");
  }

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  closeBtn.addEventListener("click", close);
  sizeChart.addEventListener("click", (e) => {
    if (e.target === sizeChart) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sizeChart.classList.contains("is-open")) close();
  });
})();

// image zoom modal — custom-built with the project's own Swiper instance
// instead of PhotoSwipe. Opens from the quick view modal's main image;
// slides are rebuilt from window.quickViewGallery each time it opens, and
// the Swiper instance is destroyed/recreated with them since the image
// count differs per product.
(function () {
  const modal = document.getElementById("imageZoomModal");
  const swiperEl = document.getElementById("imageZoomSwiper");
  const wrapperEl = document.getElementById("imageZoomWrapper");
  const closeBtn = document.getElementById("imageZoomClose");
  const prevBtn = document.getElementById("imageZoomPrev");
  const nextBtn = document.getElementById("imageZoomNext");
  const mainImg = document.getElementById("quickViewMainImg");
  if (!modal || !swiperEl || !mainImg || typeof Swiper === "undefined") return;

  let zoomSwiper = null;

  function open(images, startIndex) {
    wrapperEl.innerHTML = images
      .map(
        (src) => `
        <div class="swiper-slide">
          <div class="swiper-zoom-container">
            <img src="${src}" alt="">
          </div>
        </div>`
      )
      .join("");

    if (zoomSwiper) zoomSwiper.destroy(true, true);
    zoomSwiper = new Swiper(swiperEl, {
      zoom: { maxRatio: 3 },
      initialSlide: startIndex || 0,
      navigation: { nextEl: nextBtn, prevEl: prevBtn },
      speed: 250,
    });

    // Swiper's zoom module defaults to double-click/double-tap; the real
    // theme's popup zoomed on a single click, so this toggles it directly.
    // A plain "click" listener would also fire after a drag-to-pan gesture
    // (mouseup lands back on the same element), instantly toggling the zoom
    // back off — so only toggle when the pointer barely moved, i.e. it was
    // actually a click and not a pan.
    wrapperEl.querySelectorAll(".swiper-zoom-container img").forEach((img) => {
      let downX = 0;
      let downY = 0;
      img.addEventListener("pointerdown", (e) => {
        downX = e.clientX;
        downY = e.clientY;
      });
      img.addEventListener("click", (e) => {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved < 10) zoomSwiper.zoom.toggle(e);
      });
    });

    modal.classList.add("is-open");
    document.body.classList.add("nav-open");
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    if (zoomSwiper) {
      zoomSwiper.destroy(true, true);
      zoomSwiper = null;
    }
  }

  mainImg.addEventListener("click", () => {
    if (!window.quickViewGallery) return;
    open(window.quickViewGallery.images, window.quickViewGallery.index);
  });

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
})();
