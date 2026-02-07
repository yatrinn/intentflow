/**
 * IntentFlow Demo — Demo-specific functionality
 * 
 * Handles the persona toggle bar, event log sidebar,
 * cart drawer, search overlay, navigation links,
 * and other demo-specific interactive features.
 * 
 * @module Demo
 */

(function () {
    'use strict';

    // ── State ──
    var currentPersona = 'DEFAULT';
    var eventLogExpanded = false;
    var cartItems = [];

    // ── Product catalog for search and cart ──
    var PRODUCTS = [
        { id: 'product-gaming', name: 'UltraView Pro 27"', category: 'Gaming', price: 449, oldPrice: 599, specs: '4K UHD · 144Hz · 1ms · HDR600', image: 'assets/hero-gaming.png' },
        { id: 'product-office', name: 'UltraView Studio 32"', category: 'Professional', price: 549, oldPrice: 699, specs: '4K UHD · USB-C · 99% sRGB · Ergonomic Stand', image: 'assets/hero-office.png' },
        { id: 'product-design', name: 'UltraView Create 27"', category: 'Creative', price: 699, oldPrice: 899, specs: '4K UHD · 100% Adobe RGB · Factory Calibrated', image: 'assets/hero-design.png' },
        { id: 'product-budget', name: 'UltraView Essential 24"', category: 'Essential', price: 149, oldPrice: 199, specs: 'FHD · 75Hz · IPS · Eye-Care Tech', image: 'assets/hero-budget.png' }
    ];

    /**
     * Initialize the persona toggle bar
     */
    function initPersonaToggle() {
        var buttons = document.querySelectorAll('.persona-btn');

        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var persona = this.getAttribute('data-persona');
                if (persona === currentPersona) return;

                // Track the change
                if (window.IntentFlow && window.IntentFlow.EventTracker) {
                    window.IntentFlow.EventTracker.trackPersonaChange(persona, currentPersona);
                }

                // Update active state
                buttons.forEach(function (b) { b.classList.remove('persona-btn--active'); });
                this.classList.add('persona-btn--active');

                var previousPersona = currentPersona;
                currentPersona = persona;

                // Lock context observer so behavioral signals don't override this explicit choice
                if (window.IntentFlow && window.IntentFlow.ContextObserver && window.IntentFlow.ContextObserver.lockPersona) {
                    window.IntentFlow.ContextObserver.lockPersona();
                }

                // Trigger IntentFlow personalization with this persona
                if (window.IntentFlow && window.IntentFlow.personalize) {
                    window.IntentFlow.personalize({ intent: persona });
                }
            });
        });
    }

    /**
     * Trigger a persona change programmatically (from nav links)
     */
    function triggerPersona(persona) {
        var buttons = document.querySelectorAll('.persona-btn');
        buttons.forEach(function (btn) {
            if (btn.getAttribute('data-persona') === persona) {
                btn.click();
            }
        });
    }

    /**
     * Initialize the debug toggle button
     */
    function initDebugToggle() {
        var debugBtn = document.getElementById('toggle-debug-btn');
        if (debugBtn) {
            debugBtn.addEventListener('click', function () {
                if (window.IntentFlow && window.IntentFlow.DebugOverlay) {
                    window.IntentFlow.DebugOverlay.toggle();
                }
            });
        }
    }

    /**
     * Initialize the event log sidebar
     */
    function initEventLog() {
        var logHeader = document.querySelector('.event-log__header');
        var logContainer = document.getElementById('event-log');
        var toggleBtn = document.getElementById('event-log-toggle');

        if (logHeader) {
            logHeader.addEventListener('click', function () {
                eventLogExpanded = !eventLogExpanded;
                if (logContainer) {
                    logContainer.classList.toggle('event-log--collapsed', !eventLogExpanded);
                }
            });
        }

        // Listen for IntentFlow events
        document.addEventListener('intentflow:event', function (e) {
            addEventLogEntry(e.detail);
        });
    }

    /**
     * Add an entry to the event log
     */
    function addEventLogEntry(event) {
        var body = document.getElementById('event-log-body');
        if (!body) return;

        // Remove empty state
        var empty = body.querySelector('.event-log__empty');
        if (empty) {
            empty.remove();
        }

        // Create entry
        var entry = document.createElement('div');
        entry.className = 'event-log__entry';

        var time = new Date(event.timestamp);
        var timeStr = time.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Build data string
        var dataStr = '';
        if (event.data) {
            var keys = Object.keys(event.data);
            var highlights = [];
            for (var i = 0; i < Math.min(keys.length, 3); i++) {
                var val = event.data[keys[i]];
                if (typeof val === 'object') val = JSON.stringify(val);
                highlights.push(keys[i] + ': ' + val);
            }
            dataStr = highlights.join(' · ');
        }

        entry.innerHTML = '<span class="event-log__entry-time">' + timeStr + '</span>' +
            '<span class="event-log__entry-name">' + event.event + '</span>' +
            (dataStr ? '<span class="event-log__entry-data">' + dataStr + '</span>' : '');

        // Add to top
        body.insertBefore(entry, body.firstChild);

        // Limit entries
        var entries = body.querySelectorAll('.event-log__entry');
        if (entries.length > 20) {
            body.removeChild(entries[entries.length - 1]);
        }
    }

    // ──────────────────────────────────────────────────────────
    //  CART DRAWER
    // ──────────────────────────────────────────────────────────

    /**
     * Initialize add-to-cart buttons and cart drawer
     */
    function initCartSystem() {
        var cartBtn = document.getElementById('cart-btn');
        var cartDrawer = document.getElementById('cart-drawer');
        var cartClose = document.getElementById('cart-close');
        var cartBackdrop = document.getElementById('cart-backdrop');
        var cartCountEl = document.querySelector('.cart-count');

        // Open cart drawer
        if (cartBtn) {
            cartBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openCartDrawer();
            });
        }

        // Close cart drawer
        if (cartClose) {
            cartClose.addEventListener('click', closeCartDrawer);
        }
        if (cartBackdrop) {
            cartBackdrop.addEventListener('click', closeCartDrawer);
        }

        // Add to Cart buttons
        var cartButtons = document.querySelectorAll('.product-card__cta');
        cartButtons.forEach(function (btn, index) {
            btn.addEventListener('click', function () {
                var product = PRODUCTS[index];
                if (!product) return;

                // Add to cart
                cartItems.push(Object.assign({}, product));
                updateCartCount();
                renderCartItems();

                // Visual feedback on button
                this.textContent = '✓ Added!';
                this.style.background = 'rgba(74, 222, 128, 0.2)';
                this.style.borderColor = '#4ade80';
                this.style.color = '#4ade80';

                var self = this;
                setTimeout(function () {
                    self.textContent = 'Add to Cart';
                    self.style.background = '';
                    self.style.borderColor = '';
                    self.style.color = '';
                }, 1500);

                // Track event
                if (window.IntentFlow && window.IntentFlow.EventTracker) {
                    window.IntentFlow.EventTracker.log('add_to_cart', {
                        product: product.name,
                        price: product.price,
                        cart_count: cartItems.length
                    });
                }

                // Auto-open cart briefly
                openCartDrawer();
            });
        });

        // Checkout button
        var checkoutBtn = document.querySelector('.cart-drawer__checkout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function () {
                if (cartItems.length === 0) return;
                // Simulate checkout
                alert('Thank you! Your order of ' + cartItems.length + ' item(s) totaling $' + getCartTotal() + ' has been placed.\n\n(This is a demo — no real purchase was made.)');
                cartItems = [];
                updateCartCount();
                renderCartItems();
                closeCartDrawer();
            });
        }
    }

    function openCartDrawer() {
        var drawer = document.getElementById('cart-drawer');
        var backdrop = document.getElementById('cart-backdrop');
        if (drawer) drawer.classList.add('cart-drawer--open');
        if (backdrop) backdrop.classList.add('cart-drawer__backdrop--open');
    }

    function closeCartDrawer() {
        var drawer = document.getElementById('cart-drawer');
        var backdrop = document.getElementById('cart-backdrop');
        if (drawer) drawer.classList.remove('cart-drawer--open');
        if (backdrop) backdrop.classList.remove('cart-drawer__backdrop--open');
    }

    function updateCartCount() {
        var cartCountEl = document.querySelector('.cart-count');
        if (cartCountEl) {
            cartCountEl.textContent = cartItems.length;
            cartCountEl.style.transform = 'scale(1.3)';
            setTimeout(function () {
                cartCountEl.style.transform = 'scale(1)';
            }, 200);
        }
    }

    function getCartTotal() {
        return cartItems.reduce(function (sum, item) { return sum + item.price; }, 0);
    }

    function renderCartItems() {
        var body = document.getElementById('cart-body');
        var footer = document.getElementById('cart-footer');
        var totalEl = document.getElementById('cart-total');
        if (!body) return;

        if (cartItems.length === 0) {
            body.innerHTML = '<div class="cart-drawer__empty">Your cart is empty</div>';
            if (footer) footer.style.display = 'none';
            return;
        }

        var html = '';
        cartItems.forEach(function (item, index) {
            html += '<div class="cart-item" data-index="' + index + '">' +
                '<img class="cart-item__image" src="' + item.image + '" alt="' + item.name + '" />' +
                '<div class="cart-item__info">' +
                '<div class="cart-item__name">' + item.name + '</div>' +
                '<div class="cart-item__price">$' + item.price + '</div>' +
                '</div>' +
                '<button class="cart-item__remove" data-index="' + index + '">Remove</button>' +
                '</div>';
        });
        body.innerHTML = html;

        // Attach remove handlers
        body.querySelectorAll('.cart-item__remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                cartItems.splice(idx, 1);
                updateCartCount();
                renderCartItems();
            });
        });

        if (footer) footer.style.display = '';
        if (totalEl) totalEl.textContent = '$' + getCartTotal();
    }

    // ──────────────────────────────────────────────────────────
    //  SEARCH OVERLAY
    // ──────────────────────────────────────────────────────────

    function initSearchOverlay() {
        var searchBtn = document.getElementById('search-btn');
        var overlay = document.getElementById('search-overlay');
        var closeBtn = document.getElementById('search-close');
        var input = document.getElementById('search-input');

        if (searchBtn) {
            searchBtn.addEventListener('click', function (e) {
                e.preventDefault();
                openSearch();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeSearch);
        }

        // Close on backdrop click
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    closeSearch();
                }
            });
        }

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeSearch();
                closeCartDrawer();
            }
        });

        // Live search
        if (input) {
            input.addEventListener('input', function () {
                performSearch(this.value);
            });
        }
    }

    function openSearch() {
        var overlay = document.getElementById('search-overlay');
        var input = document.getElementById('search-input');
        if (overlay) overlay.classList.add('search-overlay--open');
        if (input) {
            input.value = '';
            setTimeout(function () { input.focus(); }, 100);
        }
        performSearch(''); // Show all products initially
    }

    function closeSearch() {
        var overlay = document.getElementById('search-overlay');
        if (overlay) overlay.classList.remove('search-overlay--open');
    }

    function performSearch(query) {
        var results = document.getElementById('search-results');
        if (!results) return;

        var q = query.toLowerCase().trim();

        var filtered = PRODUCTS.filter(function (p) {
            if (!q) return true; // Show all if empty
            return p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.specs.toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            results.innerHTML = '<div class="search-no-results">No monitors found for "' + query + '"</div>';
            return;
        }

        var html = '';
        filtered.forEach(function (p) {
            html += '<div class="search-result-item" data-product-id="' + p.id + '">' +
                '<img class="search-result-item__image" src="' + p.image + '" alt="' + p.name + '" />' +
                '<div class="search-result-item__info">' +
                '<div class="search-result-item__name">' + p.name + ' — ' + p.category + '</div>' +
                '<div class="search-result-item__price">$' + p.price + ' <span style="color:var(--color-text-muted);text-decoration:line-through;font-weight:400;">$' + p.oldPrice + '</span></div>' +
                '</div>' +
                '</div>';
        });
        results.innerHTML = html;

        // Click to scroll to product
        results.querySelectorAll('.search-result-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var productId = this.getAttribute('data-product-id');
                var productEl = document.getElementById(productId);
                if (productEl) {
                    closeSearch();
                    productEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight briefly
                    productEl.style.boxShadow = '0 0 0 2px var(--color-accent)';
                    setTimeout(function () {
                        productEl.style.boxShadow = '';
                    }, 2000);
                }
            });
        });
    }

    // ──────────────────────────────────────────────────────────
    //  NAV LINK INTELLIGENCE
    // ──────────────────────────────────────────────────────────

    function initNavLinks() {
        var navLinks = document.querySelectorAll('.nav-link[data-persona-trigger]');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var persona = this.getAttribute('data-persona-trigger');

                // Scroll to hero section
                var hero = document.getElementById('hero');
                if (hero) {
                    hero.scrollIntoView({ behavior: 'smooth' });
                }

                // Trigger the persona change after a short delay (let scroll start first)
                setTimeout(function () {
                    triggerPersona(persona);
                }, 300);
            });
        });

        // Smooth scroll for all anchor links
        document.querySelectorAll('.nav-link:not([data-persona-trigger])').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    var target = document.getElementById(href.substring(1));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    /**
     * Detect initial intent from URL and set the active persona button
     */
    function syncPersonaFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var intent = params.get('intent') || params.get('persona');

        if (intent) {
            var intentKey = intent.toUpperCase().replace(/-/g, '_');
            var buttons = document.querySelectorAll('.persona-btn');
            buttons.forEach(function (btn) {
                if (btn.getAttribute('data-persona') === intentKey) {
                    buttons.forEach(function (b) { b.classList.remove('persona-btn--active'); });
                    btn.classList.add('persona-btn--active');
                    currentPersona = intentKey;
                }
            });
        }
    }

    /**
     * Initialize everything
     */
    function init() {
        syncPersonaFromUrl();
        initPersonaToggle();
        initDebugToggle();
        initEventLog();
        initCartSystem();
        initSearchOverlay();
        initNavLinks();

        console.log(
            '%c🛍️ UltraView Demo%c IntentFlow integration active',
            'background: #1e1b4b; color: #a5b4fc; padding: 4px 12px; border-radius: 4px 0 0 4px; font-weight: bold;',
            'background: #0f172a; color: #64748b; padding: 4px 12px; border-radius: 0 4px 4px 0;'
        );
    }

    // ── Auto-initialize on DOM ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
