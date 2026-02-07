/**
 * IntentFlow — Main SDK Entry Point
 * 
 * Single-file entry that orchestrates the entire personalization pipeline:
 * 1. Loads the template and asset registries
 * 2. Detects visitor intent from context signals
 * 3. Runs the decision engine
 * 4. Injects personalized content into the DOM
 * 5. Initializes event tracking, debug overlay, and preview mode
 * 
 * Install: <script src="intentflow.js"></script>
 * 
 * @version 1.0.0
 * @license MIT
 * @author Yannik Trinn
 */

(function (global) {
    'use strict';

    // ── Configuration ──
    var config = {
        basePath: '',       // Base path for assets (auto-detected from script src)
        autoInit: true,     // Auto-initialize on DOM ready
        debug: false,       // Enable debug overlay
        preview: false      // Enable preview mode
    };

    /**
     * Auto-detect the base path from the script tag's src attribute
     */
    function detectBasePath() {
        var scripts = document.querySelectorAll('script[src]');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            if (src && src.indexOf('intentflow.js') !== -1) {
                // Extract directory from script path
                var parts = src.split('/');
                parts.pop(); // Remove filename
                if (parts.length > 0 && parts[parts.length - 1] === 'sdk') {
                    parts.pop(); // Go up from sdk/ to project root
                }
                config.basePath = parts.length > 0 ? parts.join('/') + '/' : '';
                return;
            }
        }

        // If the script is loaded from the demo directory, set base path to demo/
        // This handles the case where intentflow.js is loaded from a CDN or different path
        config.basePath = '';
    }

    /**
     * Load a JSON file via XMLHttpRequest (sync-safe for same-origin)
     */
    function loadJSON(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) { // status 0 for file:// protocol
                    try {
                        var data = JSON.parse(xhr.responseText);
                        callback(null, data);
                    } catch (e) {
                        callback(e, null);
                    }
                } else {
                    callback(new Error('Failed to load ' + url + ': ' + xhr.status), null);
                }
            }
        };
        xhr.send();
    }

    /**
     * Load both registries in parallel, then run initialization
     */
    function loadRegistries(callback) {
        var sdkBasePath = config.basePath;

        // Try to find the SDK path from the script tag
        var scripts = document.querySelectorAll('script[src]');
        var sdkPath = '';
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            if (src && src.indexOf('intentflow.js') !== -1) {
                var parts = src.split('/');
                parts.pop(); // Remove intentflow.js
                sdkPath = parts.length > 0 ? parts.join('/') + '/' : '';
                break;
            }
        }

        var templatesUrl = sdkPath + 'registry/templates.json';
        var assetsUrl = sdkPath + 'registry/assets.json';

        var loaded = { templates: null, assets: null };
        var errors = [];
        var count = 0;

        function checkDone() {
            count++;
            if (count === 2) {
                if (errors.length > 0) {
                    console.warn('[IntentFlow] Registry loading warnings:', errors);
                }
                callback(loaded.templates, loaded.assets);
            }
        }

        loadJSON(templatesUrl, function (err, data) {
            if (err) {
                errors.push(err);
                // Use embedded fallback
                loaded.templates = getFallbackTemplates();
            } else {
                loaded.templates = data;
            }
            checkDone();
        });

        loadJSON(assetsUrl, function (err, data) {
            if (err) {
                errors.push(err);
                // Use embedded fallback
                loaded.assets = getFallbackAssets();
            } else {
                loaded.assets = data;
            }
            checkDone();
        });
    }

    /**
     * Fallback templates (embedded for reliability)
     */
    function getFallbackTemplates() {
        return {
            templates: {
                'hero-impact': { id: 'hero-impact', name: 'Impact Hero', intents: ['BUY_NOW', 'USE_CASE'], cssClass: 'intentflow-hero--impact' },
                'hero-comparison': { id: 'hero-comparison', name: 'Comparison Hero', intents: ['COMPARE'], cssClass: 'intentflow-hero--comparison' },
                'hero-value': { id: 'hero-value', name: 'Value Hero', intents: ['BUDGET'], cssClass: 'intentflow-hero--value' }
            },
            defaultTemplate: 'hero-impact'
        };
    }

    /**
     * Fallback assets (embedded for reliability — full registry for file:// protocol)
     */
    function getFallbackAssets() {
        return {
            images: {
                'hero-gaming': { src: 'assets/hero-gaming.png', alt: 'Gaming monitor setup with RGB lighting', intents: ['BUY_NOW', 'USE_CASE'] },
                'hero-office': { src: 'assets/hero-office.png', alt: 'Professional office monitor workspace', intents: ['USE_CASE'] },
                'hero-design': { src: 'assets/hero-design.png', alt: 'Creative design studio with color-accurate monitor', intents: ['USE_CASE'] },
                'hero-budget': { src: 'assets/hero-budget.png', alt: 'Affordable monitors at great prices', intents: ['BUDGET'] },
                'hero-comparison': { src: 'assets/hero-comparison.png', alt: 'Two monitors side by side for comparison', intents: ['COMPARE'] },
                'hero-default': { src: 'assets/hero-default.png', alt: 'Premium monitor on elegant desk', intents: ['DEFAULT'] }
            },
            badges: {
                'free-shipping': { icon: '🚚', label: 'Free Shipping' },
                'warranty': { icon: '🛡️', label: '3-Year Warranty' },
                'best-seller': { icon: '⭐', label: 'Best Seller' },
                'top-rated': { icon: '🏆', label: 'Top Rated' },
                'price-match': { icon: '💰', label: 'Price Match Guarantee' },
                'certified-4k': { icon: '✅', label: '4K Certified' }
            },
            content: {
                BUY_NOW: {
                    headline: 'Your Perfect Monitor Awaits',
                    subheadline: 'Premium 4K displays with lightning-fast response times. Free shipping on all orders.',
                    cta_text: 'Shop Now →',
                    cta_link: '#shop',
                    image: 'hero-gaming',
                    badges: ['free-shipping', 'warranty', 'best-seller']
                },
                COMPARE: {
                    headline: 'Find Your Perfect Match',
                    subheadline: 'Side-by-side specs, real benchmarks, and honest reviews to help you choose.',
                    cta_text: 'Compare Models →',
                    cta_link: '#shop',
                    image: 'hero-comparison',
                    badges: ['top-rated', 'warranty', 'certified-4k']
                },
                USE_CASE: {
                    headline: 'Built for What You Do',
                    subheadline: 'Whether you game, design, or code — we have the perfect monitor for your workflow.',
                    cta_text: 'Explore by Use Case →',
                    cta_link: '#shop',
                    image: 'hero-design',
                    badges: ['top-rated', 'certified-4k', 'warranty']
                },
                BUDGET: {
                    headline: 'Premium Quality, Smart Prices',
                    subheadline: 'High-performance monitors starting at $149. Same quality, better value.',
                    cta_text: 'View Deals →',
                    cta_link: '#shop',
                    image: 'hero-budget',
                    badges: ['price-match', 'free-shipping', 'warranty']
                },
                DEFAULT: {
                    headline: 'Monitors Reimagined',
                    subheadline: 'Discover the next generation of displays. Stunning clarity meets unmatched performance.',
                    cta_text: 'Explore Collection →',
                    cta_link: '#shop',
                    image: 'hero-default',
                    badges: ['best-seller', 'free-shipping', 'warranty']
                }
            }
        };
    }

    /**
     * Core personalization pipeline
     * Can be called with an override intent for preview mode
     */
    function personalize(override) {
        var IF = global.IntentFlow;

        // Step 1: Detect intent (or use override)
        var intentResult;
        if (override && override.intent) {
            intentResult = {
                intent: override.intent,
                confidence: 1.0,
                signals: [{
                    type: 'preview_override',
                    key: 'manual',
                    value: override.intent,
                    detectedIntent: override.intent,
                    weight: 1.0
                }],
                scores: {},
                signalCount: 1
            };
            intentResult.scores[override.intent] = 1.0;
        } else {
            intentResult = IF.IntentDetector.detect();
        }

        // Step 2: Run decision engine
        var decision = IF.DecisionEngine.decide(intentResult);

        // Step 2b: Apply A/B variant (if A/B exploration is active)
        if (IF.ABExplorer && IF.ABExplorer.isEnabled()) {
            IF.ABExplorer.applyVariant(decision);
        }

        // Step 2c: Apply multi-page overrides (if on a non-homepage)
        var heroContainer = document.querySelector('[data-intentflow-hero]');
        if (IF.MultiPage && heroContainer) {
            var pageType = IF.MultiPage.detectPageType(heroContainer);
            IF.MultiPage.applyPageOverrides(decision, pageType);
        }

        // Step 3: Determine base path for assets
        var assetBasePath = '';
        if (heroContainer && heroContainer.getAttribute('data-intentflow-assets')) {
            assetBasePath = heroContainer.getAttribute('data-intentflow-assets');
        }

        // Step 4: Inject into DOM
        IF.Injector.inject(decision, { basePath: assetBasePath });

        // Step 5: Update debug overlay
        if (IF.DebugOverlay) {
            IF.DebugOverlay.update(decision);
        }

        // Step 6: Log the full decision
        if (IF.EventTracker) {
            IF.EventTracker.log('decision_made', {
                intent: decision.intent,
                template: decision.template,
                confidence: decision.confidence,
                signals_count: decision.signals_used.length
            });
        }

        // Store the last decision globally for debugging
        IF._lastDecision = decision;

        return decision;
    }

    /**
     * Initialize the entire IntentFlow SDK
     */
    function init() {
        // Detect script base path
        detectBasePath();

        console.log(
            '%c⚡ IntentFlow v1.0.0 %c Plug-and-play AI personalization',
            'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 4px 12px; border-radius: 4px 0 0 4px; font-weight: bold;',
            'background: #1e1b4b; color: #a5b4fc; padding: 4px 12px; border-radius: 0 4px 4px 0;'
        );

        var IF = global.IntentFlow;

        // Initialize event tracker
        if (IF.EventTracker) {
            IF.EventTracker.init();
        }

        // Initialize debug overlay
        if (IF.DebugOverlay) {
            IF.DebugOverlay.init();
        }

        // Initialize preview mode
        if (IF.PreviewMode) {
            IF.PreviewMode.init();
        }

        // Initialize A/B explorer
        if (IF.ABExplorer) {
            IF.ABExplorer.init();
        }

        // Initialize multi-page support
        if (IF.MultiPage) {
            IF.MultiPage.init();
        }

        // Initialize context observer (real-time behavioral re-personalization)
        if (IF.ContextObserver) {
            IF.ContextObserver.init();
        }

        // Load registries and run personalization
        loadRegistries(function (templates, assets) {
            // Initialize decision engine with registries
            IF.DecisionEngine.init(templates, assets);

            // Run personalization pipeline
            personalize();

            IF.EventTracker.log('sdk_initialized', {
                version: '1.0.0',
                debug: IF.DebugOverlay && IF.DebugOverlay.isDebugEnabled(),
                preview: IF.PreviewMode && IF.PreviewMode.isPreviewEnabled(),
                ab_testing: IF.ABExplorer && IF.ABExplorer.isEnabled(),
                multi_page: IF.MultiPage ? true : false,
                context_observer: IF.ContextObserver ? true : false,
                signal_count: 7
            });
        });
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.init = init;
    global.IntentFlow.personalize = personalize;
    global.IntentFlow.config = config;
    global.IntentFlow.version = '1.0.0';

    // ── Auto-initialize on DOM ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM is already ready
        setTimeout(init, 0);
    }

})(window);
