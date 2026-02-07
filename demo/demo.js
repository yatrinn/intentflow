/**
 * IntentFlow Demo — Demo-specific functionality
 * 
 * Handles the persona toggle bar, event log sidebar,
 * and other demo-specific interactive features.
 * 
 * @module Demo
 */

(function () {
    'use strict';

    // ── State ──
    var currentPersona = 'DEFAULT';
    var eventLogExpanded = true;

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

                // Trigger IntentFlow personalization with this persona
                if (window.IntentFlow && window.IntentFlow.personalize) {
                    window.IntentFlow.personalize({ intent: persona });
                }
            });
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

    /**
     * Initialize add-to-cart buttons (demo functionality)
     */
    function initCartButtons() {
        var cartCount = document.querySelector('.cart-count');
        var count = 0;

        var cartButtons = document.querySelectorAll('.product-card__cta');
        cartButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                count++;
                if (cartCount) {
                    cartCount.textContent = count;
                    cartCount.style.transform = 'scale(1.3)';
                    setTimeout(function () {
                        cartCount.style.transform = 'scale(1)';
                    }, 200);
                }

                // Visual feedback
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
                        product: btn.id,
                        cart_count: count
                    });
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
        initCartButtons();

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
