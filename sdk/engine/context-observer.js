/**
 * IntentFlow — Context Observer Module
 * 
 * Real-time mid-session behavioral intent refinement.
 * Watches actual user behavior (scroll patterns, click targets, hover dwell time,
 * section visibility) and re-personalizes the hero if the detected intent shifts
 * significantly during a single session.
 * 
 * This is the key innovation: most personalization tools only detect intent on
 * page load. IntentFlow adapts IN REAL-TIME as the visitor interacts with the page.
 * 
 * Uses: IntersectionObserver, scroll velocity, click-pattern scoring
 * 
 * @module ContextObserver
 */

(function (global) {
    'use strict';

    // ── Configuration ──
    var CONFIG = {
        MIN_CONFIDENCE_SHIFT: 0.3,      // Minimum score shift to trigger re-personalization
        COOLDOWN_MS: 5000,               // Minimum time between re-personalizations
        OBSERVATION_DELAY_MS: 2000,      // Wait before starting observation (let initial load settle)
        SCROLL_VELOCITY_THRESHOLD: 800,  // px/s — fast scrolling indicates comparison behavior
        HOVER_DWELL_MS: 1500,            // Minimum hover time to count as intentional interest
        SECTION_VISIBILITY_RATIO: 0.5    // IntersectionObserver threshold for section visibility
    };

    var isInitialized = false;
    var isEnabled = false;
    var lastRePersonalizationTime = 0;
    var behaviorScores = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };
    var currentSessionIntent = null;
    var observedActions = [];
    var scrollTracker = { lastY: 0, lastTime: 0, velocities: [] };

    /**
     * Initialize the context observer
     */
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Enable by default — this is a core innovation feature
        isEnabled = true;

        // Start observing after a short delay to let the page settle
        setTimeout(function () {
            if (!isEnabled) return;

            setupScrollObserver();
            setupClickObserver();
            setupSectionObserver();
            setupHoverObserver();

            logAction('observer_started', 'Context observer active — watching for behavioral signals');
        }, CONFIG.OBSERVATION_DELAY_MS);
    }

    /**
     * Track scroll velocity — fast scrolling = comparison behavior, slow = interest
     */
    function setupScrollObserver() {
        var ticking = false;

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(function () {
                    var now = Date.now();
                    var currentY = window.scrollY;
                    var dt = now - scrollTracker.lastTime;

                    if (scrollTracker.lastTime > 0 && dt > 0 && dt < 500) {
                        var velocity = Math.abs(currentY - scrollTracker.lastY) / (dt / 1000);
                        scrollTracker.velocities.push(velocity);

                        // Keep last 10 velocity readings
                        if (scrollTracker.velocities.length > 10) {
                            scrollTracker.velocities.shift();
                        }

                        // Fast scrolling suggests scanning/comparing
                        if (velocity > CONFIG.SCROLL_VELOCITY_THRESHOLD) {
                            addBehaviorScore('COMPARE', 0.05, 'fast_scroll',
                                'Rapid scrolling at ' + Math.round(velocity) + 'px/s suggests comparison behavior');
                        }
                    }

                    scrollTracker.lastY = currentY;
                    scrollTracker.lastTime = now;
                    ticking = false;
                });
            }
        }, { passive: true });
    }

    /**
     * Track click patterns — what users click reveals intent
     */
    function setupClickObserver() {
        document.addEventListener('click', function (e) {
            var target = e.target;
            var clickedElement = target.closest('[class]') || target;
            var className = clickedElement.className || '';
            var text = (clickedElement.textContent || '').trim().toLowerCase().substring(0, 50);
            var href = (clickedElement.getAttribute('href') || '').toLowerCase();

            // Click on price elements → budget intent
            if (className.includes('price') || text.match(/\$\d/) || text.includes('deal')) {
                addBehaviorScore('BUDGET', 0.15, 'click_price',
                    'Clicked on price element: "' + text.substring(0, 30) + '"');
            }

            // Click on "Add to Cart" → strong buy intent
            if (className.includes('cta') || text.includes('add to cart') || text.includes('buy') || text.includes('shop')) {
                addBehaviorScore('BUY_NOW', 0.2, 'click_cta',
                    'Clicked purchase CTA: "' + text.substring(0, 30) + '"');
            }

            // Click on specs/comparison elements → compare intent
            if (className.includes('spec') || text.includes('compare') || text.includes('vs') || href.includes('compare')) {
                addBehaviorScore('COMPARE', 0.15, 'click_specs',
                    'Clicked comparison/spec element');
            }

            // Click on category/use-case elements
            if (className.includes('category') || text.includes('gaming') || text.includes('design') || text.includes('creative') || text.includes('office')) {
                addBehaviorScore('USE_CASE', 0.15, 'click_category',
                    'Clicked use-case category: "' + text.substring(0, 30) + '"');
            }
        });
    }

    /**
     * Track section visibility — which page sections the user scrolls to
     * Uses IntersectionObserver for efficient, non-blocking observation
     */
    function setupSectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        var sectionMap = {
            'products-section': { intent: 'BUY_NOW', weight: 0.1, label: 'Product grid section' },
            'trust-section': { intent: 'BUY_NOW', weight: 0.08, label: 'Trust badges section' }
        };

        // Also observe product cards individually
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var id = entry.target.id;
                var className = entry.target.className || '';

                // Check section map
                for (var sectionClass in sectionMap) {
                    if (className.includes(sectionClass) || id === sectionClass) {
                        var config = sectionMap[sectionClass];
                        addBehaviorScore(config.intent, config.weight, 'section_view',
                            'Scrolled to ' + config.label);
                        observer.unobserve(entry.target); // Only count once
                    }
                }

                // Product card visibility
                if (className.includes('product-card') && entry.intersectionRatio >= CONFIG.SECTION_VISIBILITY_RATIO) {
                    addBehaviorScore('BUY_NOW', 0.05, 'product_view',
                        'Viewed product: ' + (entry.target.querySelector('.product-card__title') || {}).textContent);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: [CONFIG.SECTION_VISIBILITY_RATIO] });

        // Observe key sections
        var sections = document.querySelectorAll('section[class], .product-card');
        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    /**
     * Track hover dwell time — sustained hover = genuine interest
     */
    function setupHoverObserver() {
        var hoverTimer = null;
        var hoverTarget = null;

        document.addEventListener('mouseover', function (e) {
            var card = e.target.closest('.product-card');
            if (card && card !== hoverTarget) {
                hoverTarget = card;
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(function () {
                    var category = card.querySelector('.product-card__category');
                    var categoryText = category ? category.textContent.toLowerCase() : '';

                    if (categoryText.includes('gaming') || categoryText.includes('creative')) {
                        addBehaviorScore('USE_CASE', 0.1, 'hover_dwell',
                            'Extended hover on ' + categoryText + ' product');
                    } else {
                        addBehaviorScore('BUY_NOW', 0.08, 'hover_dwell',
                            'Extended hover on product card (' + CONFIG.HOVER_DWELL_MS + 'ms)');
                    }
                }, CONFIG.HOVER_DWELL_MS);
            }
        });

        document.addEventListener('mouseout', function (e) {
            if (e.target.closest('.product-card') === hoverTarget) {
                clearTimeout(hoverTimer);
                hoverTarget = null;
            }
        });
    }

    /**
     * Add a behavior score and check if re-personalization is needed
     */
    function addBehaviorScore(intent, weight, actionType, description) {
        behaviorScores[intent] += weight;
        observedActions.push({
            type: actionType,
            intent: intent,
            weight: weight,
            description: description,
            timestamp: new Date().toISOString()
        });

        logAction(actionType, description + ' (+' + weight + ' → ' + intent + ')');

        // Check if we should re-personalize
        checkForRePersonalization();
    }

    /**
     * Check if accumulated behavior signals warrant re-personalization
     */
    function checkForRePersonalization() {
        var now = Date.now();

        // Respect cooldown
        if (now - lastRePersonalizationTime < CONFIG.COOLDOWN_MS) return;

        // Find the dominant behavioral intent
        var maxScore = 0;
        var dominantIntent = null;

        for (var intent in behaviorScores) {
            if (intent === 'DEFAULT') continue;
            if (behaviorScores[intent] > maxScore) {
                maxScore = behaviorScores[intent];
                dominantIntent = intent;
            }
        }

        // Only re-personalize if we have a strong enough signal AND it differs from current
        if (!dominantIntent || maxScore < CONFIG.MIN_CONFIDENCE_SHIFT) return;

        var IF = global.IntentFlow;
        var currentIntent = IF._lastDecision ? IF._lastDecision.intent : 'DEFAULT';

        if (dominantIntent !== currentIntent) {
            lastRePersonalizationTime = now;

            // Log the re-personalization event
            if (IF.EventTracker) {
                IF.EventTracker.log('behavioral_re_personalization', {
                    from_intent: currentIntent,
                    to_intent: dominantIntent,
                    behavior_score: Math.round(maxScore * 100) / 100,
                    actions_count: observedActions.length,
                    trigger: observedActions[observedActions.length - 1].type
                });
            }

            // Trigger re-personalization with the new intent
            if (IF.personalize) {
                IF.personalize({ intent: dominantIntent });
            }

            // Partially decay scores after re-personalization (don't reset, allow momentum)
            for (var key in behaviorScores) {
                behaviorScores[key] *= 0.4;
            }
            currentSessionIntent = dominantIntent;
        }
    }

    /**
     * Log an action for debugging
     */
    function logAction(type, message) {
        console.log(
            '%c[ContextObserver]%c ' + type + '%c ' + message,
            'background: #059669; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
            'color: #34d399; font-weight: bold;',
            'color: #6ee7b7;'
        );
    }

    /**
     * Get observation report for analytics dashboard
     */
    function getReport() {
        return {
            isEnabled: isEnabled,
            behaviorScores: Object.assign({}, behaviorScores),
            observedActions: observedActions.slice(),
            rePersonalizationCount: observedActions.filter(function (a) {
                return a.type === 'behavioral_re_personalization';
            }).length,
            currentSessionIntent: currentSessionIntent,
            scrollVelocityAvg: scrollTracker.velocities.length > 0
                ? Math.round(scrollTracker.velocities.reduce(function (a, b) { return a + b; }, 0) / scrollTracker.velocities.length)
                : 0
        };
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.ContextObserver = {
        init: init,
        isEnabled: function () { return isEnabled; },
        getReport: getReport,
        getBehaviorScores: function () { return Object.assign({}, behaviorScores); },
        getActions: function () { return observedActions.slice(); }
    };

})(window);
