/**
 * IntentFlow — Intent Detector Module
 * 
 * Detects visitor intent from multiple context signals:
 * 1. URL query parameters / UTM tags
 * 2. Referrer analysis
 * 3. On-page behavior (scroll/click in first 5 seconds)
 * 4. Persona toggle (manual override for demos)
 * 
 * @module IntentDetector
 */

(function (global) {
    'use strict';

    // ── Intent Taxonomy ──
    const INTENTS = {
        BUY_NOW: 'BUY_NOW',
        COMPARE: 'COMPARE',
        USE_CASE: 'USE_CASE',
        BUDGET: 'BUDGET',
        DEFAULT: 'DEFAULT'
    };

    // ── Keyword-to-intent scoring maps ──
    const QUERY_KEYWORDS = {
        BUY_NOW: ['buy', 'purchase', 'order', 'shop', 'add to cart', 'checkout', 'get', 'deal', 'sale', 'discount'],
        COMPARE: ['compare', 'comparison', 'vs', 'versus', 'best', 'top', 'review', 'rating', 'benchmark'],
        USE_CASE: ['gaming', 'design', 'coding', 'office', 'work', 'creative', 'video editing', 'streaming', 'programming'],
        BUDGET: ['cheap', 'affordable', 'budget', 'under', 'price', 'value', 'low cost', 'inexpensive', 'save']
    };

    const UTM_CAMPAIGN_MAP = {
        'purchase': INTENTS.BUY_NOW,
        'buy': INTENTS.BUY_NOW,
        'sale': INTENTS.BUY_NOW,
        'promo': INTENTS.BUY_NOW,
        'comparison': INTENTS.COMPARE,
        'compare': INTENTS.COMPARE,
        'review': INTENTS.COMPARE,
        'best_of': INTENTS.COMPARE,
        'gaming': INTENTS.USE_CASE,
        'design': INTENTS.USE_CASE,
        'office': INTENTS.USE_CASE,
        'work': INTENTS.USE_CASE,
        'budget': INTENTS.BUDGET,
        'deals': INTENTS.BUDGET,
        'savings': INTENTS.BUDGET,
        'value': INTENTS.BUDGET
    };

    const REFERRER_PATTERNS = {
        'google.com/search': { intent: INTENTS.COMPARE, weight: 0.3, label: 'Google Search' },
        'bing.com/search': { intent: INTENTS.COMPARE, weight: 0.3, label: 'Bing Search' },
        'youtube.com': { intent: INTENTS.USE_CASE, weight: 0.25, label: 'YouTube' },
        'reddit.com': { intent: INTENTS.COMPARE, weight: 0.25, label: 'Reddit' },
        'facebook.com': { intent: INTENTS.DEFAULT, weight: 0.15, label: 'Facebook' },
        'instagram.com': { intent: INTENTS.DEFAULT, weight: 0.15, label: 'Instagram' },
        'twitter.com': { intent: INTENTS.DEFAULT, weight: 0.15, label: 'Twitter/X' },
        'x.com': { intent: INTENTS.DEFAULT, weight: 0.15, label: 'Twitter/X' },
        'tiktok.com': { intent: INTENTS.DEFAULT, weight: 0.15, label: 'TikTok' },
        'email': { intent: INTENTS.BUY_NOW, weight: 0.2, label: 'Email Campaign' },
        'slickdeals.net': { intent: INTENTS.BUDGET, weight: 0.35, label: 'SlickDeals' },
        'rtings.com': { intent: INTENTS.COMPARE, weight: 0.35, label: 'Rtings' },
        'pcpartpicker.com': { intent: INTENTS.COMPARE, weight: 0.3, label: 'PCPartPicker' }
    };

    /**
     * Parse URL query parameters into a flat object
     */
    function parseQueryParams() {
        const params = {};
        const search = window.location.search.substring(1);
        if (!search) return params;

        search.split('&').forEach(function (pair) {
            const parts = pair.split('=');
            params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
        });
        return params;
    }

    /**
     * Signal 1: Detect intent from URL query parameters and UTM tags
     */
    function detectFromQueryParams(params) {
        const signals = [];
        const scores = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };

        // Direct intent override
        if (params.intent) {
            const directIntent = params.intent.toUpperCase().replace(/-/g, '_');
            if (INTENTS[directIntent]) {
                signals.push({
                    type: 'query_param',
                    key: 'intent',
                    value: params.intent,
                    detectedIntent: directIntent,
                    weight: 1.0
                });
                scores[directIntent] += 1.0;
                return { scores, signals };
            }
        }

        // Persona override (data attribute or param)
        if (params.persona) {
            const personaIntent = params.persona.toUpperCase().replace(/-/g, '_');
            if (INTENTS[personaIntent]) {
                signals.push({
                    type: 'persona_override',
                    key: 'persona',
                    value: params.persona,
                    detectedIntent: personaIntent,
                    weight: 1.0
                });
                scores[personaIntent] += 1.0;
                return { scores, signals };
            }
        }

        // UTM campaign analysis
        if (params.utm_campaign) {
            const campaign = params.utm_campaign.toLowerCase();
            for (const [keyword, intent] of Object.entries(UTM_CAMPAIGN_MAP)) {
                if (campaign.includes(keyword)) {
                    signals.push({
                        type: 'utm_campaign',
                        key: 'utm_campaign',
                        value: params.utm_campaign,
                        matchedKeyword: keyword,
                        detectedIntent: intent,
                        weight: 0.6
                    });
                    scores[intent] += 0.6;
                }
            }
        }

        // UTM source analysis
        if (params.utm_source) {
            const source = params.utm_source.toLowerCase();
            if (source === 'email' || source === 'newsletter') {
                signals.push({
                    type: 'utm_source',
                    key: 'utm_source',
                    value: params.utm_source,
                    detectedIntent: INTENTS.BUY_NOW,
                    weight: 0.3
                });
                scores.BUY_NOW += 0.3;
            }
        }

        // Search query analysis (q, query, search, keyword params)
        const queryKeys = ['q', 'query', 'search', 'keyword', 'keywords'];
        for (const key of queryKeys) {
            if (params[key]) {
                const queryText = params[key].toLowerCase();
                for (const [intent, keywords] of Object.entries(QUERY_KEYWORDS)) {
                    for (const kw of keywords) {
                        if (queryText.includes(kw)) {
                            signals.push({
                                type: 'search_query',
                                key: key,
                                value: params[key],
                                matchedKeyword: kw,
                                detectedIntent: intent,
                                weight: 0.5
                            });
                            scores[intent] += 0.5;
                        }
                    }
                }
            }
        }

        return { scores, signals };
    }

    /**
     * Signal 2: Detect intent from document referrer
     */
    function detectFromReferrer() {
        const signals = [];
        const scores = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };

        const referrer = document.referrer || '';
        if (!referrer) return { scores, signals };

        for (const [pattern, config] of Object.entries(REFERRER_PATTERNS)) {
            if (referrer.toLowerCase().includes(pattern)) {
                signals.push({
                    type: 'referrer',
                    key: 'document.referrer',
                    value: referrer,
                    matchedPattern: pattern,
                    detectedIntent: config.intent,
                    label: config.label,
                    weight: config.weight
                });
                scores[config.intent] += config.weight;
                break; // Use first match only
            }
        }

        return { scores, signals };
    }

    /**
     * Signal 3: Detect intent from on-page behavior (simulated for hackathon)
     * In production, this would use real scroll/click tracking in first 5 seconds
     */
    function detectFromBehavior(params) {
        const signals = [];
        const scores = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };

        // Simulated behavior signals via params for demo purposes
        if (params.behavior) {
            const behavior = params.behavior.toLowerCase();
            const behaviorMap = {
                'fast_scroll': { intent: INTENTS.COMPARE, weight: 0.2, description: 'Fast scrolling suggests comparison behavior' },
                'click_price': { intent: INTENTS.BUDGET, weight: 0.3, description: 'Clicked on price element' },
                'click_cta': { intent: INTENTS.BUY_NOW, weight: 0.3, description: 'Clicked primary CTA within 5 seconds' },
                'hover_specs': { intent: INTENTS.COMPARE, weight: 0.2, description: 'Hovered over specification details' },
                'click_category': { intent: INTENTS.USE_CASE, weight: 0.25, description: 'Clicked a use-case category' }
            };

            if (behaviorMap[behavior]) {
                const config = behaviorMap[behavior];
                signals.push({
                    type: 'behavior',
                    key: 'on_page_action',
                    value: behavior,
                    detectedIntent: config.intent,
                    description: config.description,
                    weight: config.weight
                });
                scores[config.intent] += config.weight;
            }
        }

        return { scores, signals };
    }

    /**
     * Signal 4: Detect intent from persona toggle (data attribute on script tag or hero element)
     */
    function detectFromPersonaToggle() {
        const signals = [];
        const scores = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };

        // Check for persona attribute on the hero container
        const heroContainer = document.querySelector('[data-intentflow-hero]');
        if (heroContainer) {
            const persona = heroContainer.getAttribute('data-intentflow-persona');
            if (persona) {
                const intentKey = persona.toUpperCase().replace(/-/g, '_');
                if (INTENTS[intentKey]) {
                    signals.push({
                        type: 'persona_toggle',
                        key: 'data-intentflow-persona',
                        value: persona,
                        detectedIntent: intentKey,
                        weight: 1.0
                    });
                    scores[intentKey] += 1.0;
                }
            }
        }

        // Also check the script tag itself
        const scriptTag = document.querySelector('script[data-intentflow-persona]');
        if (scriptTag) {
            const persona = scriptTag.getAttribute('data-intentflow-persona');
            if (persona) {
                const intentKey = persona.toUpperCase().replace(/-/g, '_');
                if (INTENTS[intentKey]) {
                    signals.push({
                        type: 'script_persona',
                        key: 'script[data-intentflow-persona]',
                        value: persona,
                        detectedIntent: intentKey,
                        weight: 1.0
                    });
                    scores[intentKey] += 1.0;
                }
            }
        }

        return { scores, signals };
    }

    /**
     * Aggregate all intent scores and determine the winning intent
     */
    function aggregateScores(allScores) {
        const totals = { BUY_NOW: 0, COMPARE: 0, USE_CASE: 0, BUDGET: 0, DEFAULT: 0 };

        for (const scoreSet of allScores) {
            for (const [intent, score] of Object.entries(scoreSet)) {
                totals[intent] += score;
            }
        }

        // Find the highest scoring intent
        let maxScore = 0;
        let winner = INTENTS.DEFAULT;

        for (const [intent, score] of Object.entries(totals)) {
            if (intent === 'DEFAULT') continue; // Default is fallback, not a winner
            if (score > maxScore) {
                maxScore = score;
                winner = intent;
            }
        }

        // If no strong signal, fall back to DEFAULT
        if (maxScore < 0.1) {
            winner = INTENTS.DEFAULT;
            maxScore = 1.0;
        }

        // Calculate confidence (0–1 normalized)
        const totalScore = Object.values(totals).reduce(function (a, b) { return a + b; }, 0);
        const confidence = totalScore > 0 ? Math.min(maxScore / totalScore * 1.5, 1.0) : 0.5;

        return {
            intent: winner,
            confidence: Math.round(confidence * 100) / 100,
            scores: totals
        };
    }

    /**
     * Main detection function — runs all signal detectors and returns the result
     */
    function detect() {
        const params = parseQueryParams();

        // Run all four signal detectors
        const queryResult = detectFromQueryParams(params);
        const referrerResult = detectFromReferrer();
        const behaviorResult = detectFromBehavior(params);
        const personaResult = detectFromPersonaToggle();

        // Aggregate scores
        const allScores = [queryResult.scores, referrerResult.scores, behaviorResult.scores, personaResult.scores];
        const allSignals = [].concat(queryResult.signals, referrerResult.signals, behaviorResult.signals, personaResult.signals);

        const result = aggregateScores(allScores);

        return {
            intent: result.intent,
            confidence: result.confidence,
            scores: result.scores,
            signals: allSignals,
            signalCount: allSignals.length,
            timestamp: new Date().toISOString()
        };
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.IntentDetector = {
        detect: detect,
        INTENTS: INTENTS,
        parseQueryParams: parseQueryParams
    };

})(window);
/**
 * IntentFlow — Decision Engine Module
 * 
 * Takes detected intent and selects the optimal template, image, headline,
 * subheadline, and CTA from the registry. Returns a fully explainable
 * structured decision object.
 * 
 * @module DecisionEngine
 */

(function (global) {
    'use strict';

    // ── Embedded Registry Data (loaded at build time or inline) ──
    // These will be injected by the main intentflow.js entry point
    var templateRegistry = null;
    var assetRegistry = null;

    /**
     * Initialize the decision engine with registry data
     */
    function init(templates, assets) {
        templateRegistry = templates;
        assetRegistry = assets;
    }

    /**
     * Select the best template for a given intent
     */
    function selectTemplate(intent) {
        if (!templateRegistry || !templateRegistry.templates) {
            return { id: 'hero-impact', reason: 'Fallback: registry not loaded' };
        }

        // Find templates that match this intent
        var bestMatch = null;
        var reason = '';

        for (var key in templateRegistry.templates) {
            var template = templateRegistry.templates[key];
            if (template.intents && template.intents.indexOf(intent) !== -1) {
                bestMatch = template;
                reason = 'Template "' + template.name + '" is optimized for ' + intent + ' intent.';
                break;
            }
        }

        // Fallback to default template
        if (!bestMatch) {
            var defaultKey = templateRegistry.defaultTemplate || 'hero-impact';
            bestMatch = templateRegistry.templates[defaultKey];
            reason = 'No intent-specific template found. Using default: "' + bestMatch.name + '".';
        }

        return { template: bestMatch, reason: reason };
    }

    /**
     * Select content (image, headline, CTA, badges) for a given intent
     */
    function selectContent(intent) {
        if (!assetRegistry || !assetRegistry.content) {
            return {
                headline: 'Monitors Reimagined',
                subheadline: 'Discover the next generation of displays.',
                cta_text: 'Explore Collection →',
                cta_link: '#shop',
                image: null,
                badges: [],
                reason: 'Fallback: asset registry not loaded'
            };
        }

        // Get content for this intent, or fall back to DEFAULT
        var content = assetRegistry.content[intent] || assetRegistry.content['DEFAULT'];
        var usedFallback = !assetRegistry.content[intent];

        // Resolve the image reference
        var imageData = null;
        if (content.image && assetRegistry.images[content.image]) {
            imageData = assetRegistry.images[content.image];
        }

        // Resolve badges
        var badgeData = [];
        if (content.badges && assetRegistry.badges) {
            for (var i = 0; i < content.badges.length; i++) {
                var badge = assetRegistry.badges[content.badges[i]];
                if (badge) {
                    badgeData.push(badge);
                }
            }
        }

        return {
            headline: content.headline,
            subheadline: content.subheadline,
            cta_text: content.cta_text,
            cta_link: content.cta_link,
            image: imageData,
            imageKey: content.image,
            badges: badgeData,
            reason: usedFallback
                ? 'No content defined for "' + intent + '" intent. Using DEFAULT content.'
                : 'Content matched to "' + intent + '" intent from asset registry.'
        };
    }

    /**
     * Build the human-readable explanation string
     */
    function buildExplanation(intentResult, templateResult, contentResult) {
        var parts = [];

        // Explain intent detection
        if (intentResult.signals && intentResult.signals.length > 0) {
            var signalDescriptions = intentResult.signals.map(function (s) {
                return s.type + '(' + s.key + '="' + s.value + '")';
            });
            parts.push('Detected intent: ' + intentResult.intent +
                ' (confidence: ' + Math.round(intentResult.confidence * 100) + '%) from ' +
                intentResult.signals.length + ' signal(s): ' + signalDescriptions.join(', ') + '.');
        } else {
            parts.push('No signals detected. Using DEFAULT intent.');
        }

        // Explain template selection
        parts.push(templateResult.reason);

        // Explain content selection
        parts.push(contentResult.reason);

        return parts.join(' ');
    }

    /**
     * Main decision function — takes an intent detection result and returns
     * the full personalization decision with explainability.
     */
    function decide(intentResult) {
        if (!intentResult) {
            intentResult = { intent: 'DEFAULT', confidence: 0.5, signals: [], scores: {} };
        }

        var intent = intentResult.intent || 'DEFAULT';

        // Select template and content
        var templateResult = selectTemplate(intent);
        var contentResult = selectContent(intent);

        // Build the structured decision object
        var decision = {
            // Core decision
            intent: intent,
            confidence: intentResult.confidence || 0.5,
            template: templateResult.template ? templateResult.template.id : 'hero-impact',
            templateName: templateResult.template ? templateResult.template.name : 'Impact Hero',
            templateCssClass: templateResult.template ? templateResult.template.cssClass : 'intentflow-hero--impact',

            // Content
            hero_image: contentResult.image ? contentResult.image.src : 'assets/hero-default.png',
            hero_image_alt: contentResult.image ? contentResult.image.alt : 'Premium monitor display',
            headline: contentResult.headline,
            subheadline: contentResult.subheadline,
            cta_text: contentResult.cta_text,
            cta_link: contentResult.cta_link,
            badges: contentResult.badges,

            // Explainability
            reason: buildExplanation(intentResult, templateResult, contentResult),
            signals_used: intentResult.signals ? intentResult.signals.map(function (s) { return s.type; }) : [],
            signal_details: intentResult.signals || [],
            intent_scores: intentResult.scores || {},

            // Metadata
            timestamp: new Date().toISOString(),
            engine_version: '1.0.0',
            fallback_used: intent === 'DEFAULT' && (!intentResult.signals || intentResult.signals.length === 0)
        };

        return decision;
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.DecisionEngine = {
        init: init,
        decide: decide,
        selectTemplate: selectTemplate,
        selectContent: selectContent
    };

})(window);
/**
 * IntentFlow — Event Tracker Module
 * 
 * Lightweight client-side event tracking for personalization analytics.
 * Tracks CTA clicks, hero impressions, and variant selections.
 * 
 * @module EventTracker
 */

(function (global) {
    'use strict';

    var events = [];
    var isInitialized = false;

    /**
     * Initialize the event tracker
     */
    function init() {
        if (isInitialized) return;
        isInitialized = true;

        // Expose events array globally for debugging
        global.__intentflow_events = events;

        log('tracker_initialized', { timestamp: new Date().toISOString() });
    }

    /**
     * Log an event
     */
    function log(eventName, data) {
        var event = {
            event: eventName,
            data: data || {},
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        events.push(event);

        // Console output for demo visibility
        console.log(
            '%c[IntentFlow]%c ' + eventName,
            'background: #6366f1; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
            'color: #e2e8f0;',
            data || ''
        );

        // Dispatch custom event for external listeners
        try {
            var customEvent = new CustomEvent('intentflow:event', {
                detail: event,
                bubbles: true
            });
            document.dispatchEvent(customEvent);
        } catch (e) {
            // CustomEvent not supported in older browsers
        }

        return event;
    }

    /**
     * Track hero impression (when personalized content is shown)
     */
    function trackImpression(decision) {
        return log('hero_impression', {
            intent: decision.intent,
            template: decision.template,
            headline: decision.headline,
            cta_text: decision.cta_text,
            confidence: decision.confidence,
            fallback_used: decision.fallback_used
        });
    }

    /**
     * Track CTA click
     */
    function trackCtaClick(decision, element) {
        return log('cta_click', {
            intent: decision.intent,
            template: decision.template,
            cta_text: decision.cta_text,
            cta_link: decision.cta_link,
            element_id: element ? element.id : null
        });
    }

    /**
     * Track persona change (from demo toggle)
     */
    function trackPersonaChange(newPersona, previousPersona) {
        return log('persona_change', {
            new_persona: newPersona,
            previous_persona: previousPersona
        });
    }

    /**
     * Track variant swap (when hero content changes)
     */
    function trackVariantSwap(fromVariant, toVariant) {
        return log('variant_swap', {
            from: fromVariant,
            to: toVariant
        });
    }

    /**
     * Get all tracked events
     */
    function getEvents() {
        return events.slice();
    }

    /**
     * Get event count
     */
    function getEventCount() {
        return events.length;
    }

    /**
     * Clear all events
     */
    function clear() {
        events.length = 0;
        global.__intentflow_events = events;
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.EventTracker = {
        init: init,
        log: log,
        trackImpression: trackImpression,
        trackCtaClick: trackCtaClick,
        trackPersonaChange: trackPersonaChange,
        trackVariantSwap: trackVariantSwap,
        getEvents: getEvents,
        getEventCount: getEventCount,
        clear: clear
    };

})(window);
/**
 * IntentFlow — A/B Exploration Module
 * 
 * Lightweight A/B testing that randomly assigns visitors to one of two
 * content variants for the same intent, tracks engagement (CTA clicks),
 * and surfaces the winner after a configurable sample size.
 * 
 * How it works:
 *   1. For each intent, two candidate content variants are defined
 *   2. New visitors are randomly assigned to variant A or B (50/50)
 *   3. Assignment is stored in localStorage for session persistence
 *   4. CTA clicks are tracked per variant
 *   5. After N impressions, the winning variant is locked
 * 
 * Activate via URL: ?intentflow_ab=true
 * Or programmatically: IntentFlow.ABExplorer.enable()
 * 
 * @module ABExplorer
 * @version 1.0.0
 */

(function (global) {
    'use strict';

    // ── Configuration ──
    var STORAGE_KEY = 'intentflow_ab';
    var MIN_SAMPLE_SIZE = 10; // Minimum impressions before declaring a winner
    var AB_ENABLED_KEY = 'intentflow_ab_enabled';

    /**
     * A/B variant definitions — alternate content for each intent.
     * Variant A = the default from assets.json
     * Variant B = the alternate defined here
     */
    var variantB = {
        BUY_NOW: {
            headline: 'Ready to Upgrade Your Setup?',
            subheadline: 'Top-rated 4K monitors with free next-day delivery. Limited stock available.',
            cta_text: 'Buy Now — Free Shipping →',
            cta_link: '#checkout'
        },
        COMPARE: {
            headline: 'See How They Stack Up',
            subheadline: 'Interactive comparison charts, benchmark scores, and expert verdicts side by side.',
            cta_text: 'Start Comparing →',
            cta_link: '#compare-tool'
        },
        USE_CASE: {
            headline: 'The Right Monitor for Every Task',
            subheadline: 'Gaming, design, coding, or streaming — find the display built for your craft.',
            cta_text: 'Find Your Match →',
            cta_link: '#quiz'
        },
        BUDGET: {
            headline: 'Great Monitors Don\'t Have to Break the Bank',
            subheadline: 'Curated picks under $200 with 4.5+ star ratings. Quality you can trust.',
            cta_text: 'See Top Budget Picks →',
            cta_link: '#budget-picks'
        },
        DEFAULT: {
            headline: 'The Display Revolution Starts Here',
            subheadline: 'Ultra-sharp, ultra-fast, ultra-reliable. Experience monitors redesigned for 2026.',
            cta_text: 'Discover the Range →',
            cta_link: '#range'
        }
    };

    /**
     * Load A/B state from localStorage
     */
    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {
            // localStorage not available
        }
        return {
            assignments: {},   // { intent: 'A' | 'B' }
            impressions: {},   // { 'BUY_NOW_A': 5, 'BUY_NOW_B': 3 }
            clicks: {},        // { 'BUY_NOW_A': 2, 'BUY_NOW_B': 1 }
            winners: {}        // { 'BUY_NOW': 'A' } (locked after sample)
        };
    }

    /**
     * Save A/B state to localStorage
     */
    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            // Silently fail if localStorage is unavailable
        }
    }

    /**
     * Assign a variant for a given intent (or return existing assignment)
     */
    function assignVariant(intent) {
        var state = loadState();

        // If there's already a winner, return it
        if (state.winners[intent]) {
            return state.winners[intent];
        }

        // If already assigned, return existing
        if (state.assignments[intent]) {
            return state.assignments[intent];
        }

        // Randomly assign A or B (50/50)
        var variant = Math.random() < 0.5 ? 'A' : 'B';
        state.assignments[intent] = variant;
        saveState(state);

        return variant;
    }

    /**
     * Record an impression for a variant
     */
    function recordImpression(intent, variant) {
        var state = loadState();
        var key = intent + '_' + variant;
        state.impressions[key] = (state.impressions[key] || 0) + 1;
        saveState(state);

        // Check if we should declare a winner
        checkForWinner(intent, state);
    }

    /**
     * Record a click for a variant
     */
    function recordClick(intent, variant) {
        var state = loadState();
        var key = intent + '_' + variant;
        state.clicks[key] = (state.clicks[key] || 0) + 1;
        saveState(state);
    }

    /**
     * Check if there's enough data to declare a winner
     */
    function checkForWinner(intent, state) {
        if (state.winners[intent]) return; // Already decided

        var keyA = intent + '_A';
        var keyB = intent + '_B';
        var impressionsA = state.impressions[keyA] || 0;
        var impressionsB = state.impressions[keyB] || 0;
        var totalImpressions = impressionsA + impressionsB;

        if (totalImpressions < MIN_SAMPLE_SIZE) return;

        // Calculate click-through rates
        var clicksA = state.clicks[keyA] || 0;
        var clicksB = state.clicks[keyB] || 0;
        var ctrA = impressionsA > 0 ? clicksA / impressionsA : 0;
        var ctrB = impressionsB > 0 ? clicksB / impressionsB : 0;

        // Declare winner based on higher CTR
        var winner = ctrA >= ctrB ? 'A' : 'B';
        state.winners[intent] = winner;
        saveState(state);

        console.log(
            '%c⚡ IntentFlow A/B %c Winner for ' + intent + ': Variant ' + winner +
            ' (CTR: ' + Math.round((winner === 'A' ? ctrA : ctrB) * 100) + '%)',
            'background: #7c3aed; color: white; padding: 2px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
            'background: #1e1b4b; color: #a5b4fc; padding: 2px 8px; border-radius: 0 4px 4px 0;'
        );

        // Dispatch event
        document.dispatchEvent(new CustomEvent('intentflow:ab_winner', {
            detail: { intent: intent, winner: winner, ctrA: ctrA, ctrB: ctrB, totalImpressions: totalImpressions }
        }));
    }

    /**
     * Apply A/B variant to a decision object (mutates in place)
     * Returns the variant letter ('A' or 'B')
     */
    function applyVariant(decision) {
        if (!isEnabled()) return 'A';

        var intent = decision.intent;
        var variant = assignVariant(intent);

        if (variant === 'B' && variantB[intent]) {
            var alt = variantB[intent];
            decision.headline = alt.headline;
            decision.subheadline = alt.subheadline;
            decision.cta_text = alt.cta_text;
            decision.cta_link = alt.cta_link;
            decision._abVariant = 'B';
            decision.reason += ' [A/B Test: Variant B assigned]';
        } else {
            decision._abVariant = 'A';
            decision.reason += ' [A/B Test: Variant A assigned]';
        }

        // Record impression
        recordImpression(intent, variant);

        return variant;
    }

    /**
     * Check if A/B mode is enabled
     */
    function isEnabled() {
        // Check URL parameter
        var params = new URLSearchParams(window.location.search);
        if (params.get('intentflow_ab') === 'true') return true;

        // Check localStorage flag
        try {
            return localStorage.getItem(AB_ENABLED_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Enable A/B mode
     */
    function enable() {
        try {
            localStorage.setItem(AB_ENABLED_KEY, 'true');
        } catch (e) { }
    }

    /**
     * Disable A/B mode
     */
    function disable() {
        try {
            localStorage.removeItem(AB_ENABLED_KEY);
        } catch (e) { }
    }

    /**
     * Get the current A/B test report
     */
    function getReport() {
        var state = loadState();
        var report = {};

        var intents = ['BUY_NOW', 'COMPARE', 'USE_CASE', 'BUDGET', 'DEFAULT'];
        for (var i = 0; i < intents.length; i++) {
            var intent = intents[i];
            var keyA = intent + '_A';
            var keyB = intent + '_B';
            var impA = state.impressions[keyA] || 0;
            var impB = state.impressions[keyB] || 0;
            var clkA = state.clicks[keyA] || 0;
            var clkB = state.clicks[keyB] || 0;

            report[intent] = {
                variantA: {
                    impressions: impA,
                    clicks: clkA,
                    ctr: impA > 0 ? Math.round((clkA / impA) * 100) + '%' : '0%'
                },
                variantB: {
                    impressions: impB,
                    clicks: clkB,
                    ctr: impB > 0 ? Math.round((clkB / impB) * 100) + '%' : '0%'
                },
                winner: state.winners[intent] || 'pending',
                totalImpressions: impA + impB,
                sampleNeeded: MIN_SAMPLE_SIZE
            };
        }

        return report;
    }

    /**
     * Reset all A/B data (for testing)
     */
    function reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
    }

    /**
     * Initialize — log status
     */
    function init() {
        if (isEnabled()) {
            console.log(
                '%c⚡ IntentFlow A/B %c Exploration mode active — testing 2 variants per intent',
                'background: #7c3aed; color: white; padding: 2px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
                'background: #1e1b4b; color: #a5b4fc; padding: 2px 8px; border-radius: 0 4px 4px 0;'
            );
        }
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.ABExplorer = {
        init: init,
        isEnabled: isEnabled,
        enable: enable,
        disable: disable,
        applyVariant: applyVariant,
        recordClick: recordClick,
        getReport: getReport,
        reset: reset
    };

})(window);
/**
 * IntentFlow — DOM Injector Module
 * 
 * Safely injects personalized content into the DOM by finding the
 * [data-intentflow-hero] container and rendering the selected template
 * with the chosen assets. Includes smooth transitions and safe fallback.
 * 
 * @module Injector
 */

(function (global) {
    'use strict';

    var currentDecision = null;
    var defaultContent = null;
    var heroContainer = null;

    /**
     * Find the hero container element
     */
    function findContainer() {
        return document.querySelector('[data-intentflow-hero]');
    }

    /**
     * Store the original/default content for fallback
     */
    function captureDefault(container) {
        if (!container) return null;
        return {
            innerHTML: container.innerHTML,
            className: container.className
        };
    }

    /**
     * Generate badge HTML
     */
    function renderBadges(badges) {
        if (!badges || badges.length === 0) return '';

        var html = '<div class="intentflow-badges">';
        for (var i = 0; i < badges.length; i++) {
            html += '<span class="intentflow-badge">' +
                '<span class="intentflow-badge__icon">' + badges[i].icon + '</span>' +
                '<span class="intentflow-badge__label">' + badges[i].label + '</span>' +
                '</span>';
        }
        html += '</div>';
        return html;
    }

    /**
     * Render the Impact template (image left, text right)
     */
    function renderImpactTemplate(decision, basePath) {
        return '<div class="intentflow-hero intentflow-hero--impact">' +
            '<div class="intentflow-hero__image-container">' +
            '<img class="intentflow-hero__image" src="' + basePath + decision.hero_image + '" alt="' + decision.hero_image_alt + '" loading="eager" />' +
            '</div>' +
            '<div class="intentflow-hero__content">' +
            '<h1 class="intentflow-hero__headline">' + decision.headline + '</h1>' +
            '<p class="intentflow-hero__subheadline">' + decision.subheadline + '</p>' +
            renderBadges(decision.badges) +
            '<a class="intentflow-hero__cta" href="' + decision.cta_link + '" id="intentflow-cta">' + decision.cta_text + '</a>' +
            '</div>' +
            '</div>';
    }

    /**
     * Render the Comparison template (split-screen with badges)
     */
    function renderComparisonTemplate(decision, basePath) {
        return '<div class="intentflow-hero intentflow-hero--comparison">' +
            '<div class="intentflow-hero__image-container">' +
            '<img class="intentflow-hero__image" src="' + basePath + decision.hero_image + '" alt="' + decision.hero_image_alt + '" loading="eager" />' +
            '<div class="intentflow-hero__comparison-overlay">' +
            '<span class="intentflow-hero__comparison-label">VS</span>' +
            '</div>' +
            '</div>' +
            '<div class="intentflow-hero__content">' +
            '<h1 class="intentflow-hero__headline">' + decision.headline + '</h1>' +
            '<p class="intentflow-hero__subheadline">' + decision.subheadline + '</p>' +
            renderBadges(decision.badges) +
            '<a class="intentflow-hero__cta intentflow-hero__cta--compare" href="' + decision.cta_link + '" id="intentflow-cta">' + decision.cta_text + '</a>' +
            '</div>' +
            '</div>';
    }

    /**
     * Render the Value template (centered, price-focused)
     */
    function renderValueTemplate(decision, basePath) {
        return '<div class="intentflow-hero intentflow-hero--value">' +
            '<div class="intentflow-hero__image-container">' +
            '<img class="intentflow-hero__image" src="' + basePath + decision.hero_image + '" alt="' + decision.hero_image_alt + '" loading="eager" />' +
            '</div>' +
            '<div class="intentflow-hero__content">' +
            '<div class="intentflow-hero__value-tag">Best Value</div>' +
            '<h1 class="intentflow-hero__headline">' + decision.headline + '</h1>' +
            '<p class="intentflow-hero__subheadline">' + decision.subheadline + '</p>' +
            renderBadges(decision.badges) +
            '<a class="intentflow-hero__cta intentflow-hero__cta--value" href="' + decision.cta_link + '" id="intentflow-cta">' + decision.cta_text + '</a>' +
            '</div>' +
            '</div>';
    }

    /**
     * Select and render the appropriate template
     */
    function renderTemplate(decision, basePath) {
        switch (decision.template) {
            case 'hero-comparison':
                return renderComparisonTemplate(decision, basePath);
            case 'hero-value':
                return renderValueTemplate(decision, basePath);
            case 'hero-impact':
            default:
                return renderImpactTemplate(decision, basePath);
        }
    }

    /**
     * Inject personalized content into the hero container with a smooth transition
     */
    function inject(decision, options) {
        options = options || {};
        var basePath = options.basePath || '';

        try {
            heroContainer = findContainer();
            if (!heroContainer) {
                console.warn('[IntentFlow] No [data-intentflow-hero] container found. Skipping injection.');
                return false;
            }

            // Capture default content on first injection
            if (!defaultContent) {
                defaultContent = captureDefault(heroContainer);
            }

            // Store previous decision for event tracking
            var previousDecision = currentDecision;
            currentDecision = decision;

            // Fade out
            heroContainer.style.opacity = '0';
            heroContainer.style.transition = 'opacity 0.3s ease-out';

            // After fade out, swap content
            setTimeout(function () {
                // Render new content
                var html = renderTemplate(decision, basePath);
                heroContainer.innerHTML = html;

                // Add template class
                heroContainer.className = heroContainer.className.replace(/intentflow-container--\w+/g, '');
                heroContainer.classList.add('intentflow-container--' + decision.template);

                // Bind CTA click tracking
                var ctaButton = heroContainer.querySelector('#intentflow-cta');
                if (ctaButton && global.IntentFlow && global.IntentFlow.EventTracker) {
                    ctaButton.addEventListener('click', function (e) {
                        global.IntentFlow.EventTracker.trackCtaClick(decision, ctaButton);
                    });
                }

                // Fade in
                setTimeout(function () {
                    heroContainer.style.opacity = '1';
                    heroContainer.style.transition = 'opacity 0.4s ease-in';
                }, 50);

                // Track impression
                if (global.IntentFlow && global.IntentFlow.EventTracker) {
                    global.IntentFlow.EventTracker.trackImpression(decision);

                    // Track swap if there was a previous decision
                    if (previousDecision) {
                        global.IntentFlow.EventTracker.trackVariantSwap(
                            previousDecision.intent,
                            decision.intent
                        );
                    }
                }
            }, 300);

            return true;
        } catch (error) {
            console.error('[IntentFlow] Injection error:', error);
            restoreDefault();
            return false;
        }
    }

    /**
     * Restore the original/default content (safe fallback)
     */
    function restoreDefault() {
        if (!heroContainer || !defaultContent) return;

        heroContainer.innerHTML = defaultContent.innerHTML;
        heroContainer.className = defaultContent.className;
        console.log('[IntentFlow] Restored default content (fallback).');
    }

    /**
     * Get the current decision
     */
    function getCurrentDecision() {
        return currentDecision;
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.Injector = {
        inject: inject,
        restoreDefault: restoreDefault,
        getCurrentDecision: getCurrentDecision,
        findContainer: findContainer
    };

})(window);
/**
 * IntentFlow — Debug Overlay Module
 * 
 * Floating debug panel that shows the full decision context:
 * detected intent, confidence, selected template, signal breakdown,
 * and the complete decision JSON.
 * 
 * Activated via ?intentflow_debug=true or Ctrl+Shift+D
 * 
 * @module DebugOverlay
 */

(function (global) {
    'use strict';

    var overlayElement = null;
    var isVisible = false;

    /**
     * Check if debug mode is enabled
     */
    function isDebugEnabled() {
        return window.location.search.indexOf('intentflow_debug=true') !== -1;
    }

    /**
     * Create the debug overlay DOM element
     */
    function createOverlay() {
        var overlay = document.createElement('div');
        overlay.id = 'intentflow-debug-overlay';
        overlay.innerHTML = '<div class="ifd-header">' +
            '<span class="ifd-logo">🔍 IntentFlow Debug</span>' +
            '<button class="ifd-close" id="ifd-close-btn">✕</button>' +
            '</div>' +
            '<div class="ifd-body" id="ifd-body">' +
            '<div class="ifd-loading">Waiting for decision...</div>' +
            '</div>';

        // Inject styles
        var style = document.createElement('style');
        style.textContent = '#intentflow-debug-overlay{position:fixed;bottom:16px;right:16px;width:400px;max-height:80vh;' +
            'background:rgba(15,23,42,0.97);border:1px solid rgba(99,102,241,0.4);border-radius:12px;' +
            'color:#e2e8f0;font-family:"Inter",system-ui,sans-serif;font-size:13px;z-index:99999;' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.5);backdrop-filter:blur(20px);overflow:hidden;' +
            'transition:transform 0.3s ease,opacity 0.3s ease}' +
            '#intentflow-debug-overlay.ifd-hidden{transform:translateY(20px);opacity:0;pointer-events:none}' +
            '.ifd-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;' +
            'background:rgba(99,102,241,0.15);border-bottom:1px solid rgba(99,102,241,0.2)}' +
            '.ifd-logo{font-weight:700;font-size:14px;color:#a5b4fc}' +
            '.ifd-close{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:4px 8px;' +
            'border-radius:4px;transition:background 0.2s}.ifd-close:hover{background:rgba(255,255,255,0.1);color:#fff}' +
            '.ifd-body{padding:16px;overflow-y:auto;max-height:calc(80vh - 50px)}' +
            '.ifd-section{margin-bottom:16px}.ifd-section-title{font-size:11px;font-weight:600;' +
            'text-transform:uppercase;letter-spacing:0.5px;color:#6366f1;margin-bottom:8px}' +
            '.ifd-intent-badge{display:inline-flex;align-items:center;padding:6px 14px;border-radius:20px;' +
            'font-weight:700;font-size:14px;margin-bottom:4px}' +
            '.ifd-intent-badge--BUY_NOW{background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}' +
            '.ifd-intent-badge--COMPARE{background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)}' +
            '.ifd-intent-badge--USE_CASE{background:rgba(168,85,247,0.2);color:#c084fc;border:1px solid rgba(168,85,247,0.3)}' +
            '.ifd-intent-badge--BUDGET{background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}' +
            '.ifd-intent-badge--DEFAULT{background:rgba(148,163,184,0.2);color:#cbd5e1;border:1px solid rgba(148,163,184,0.3)}' +
            '.ifd-confidence{display:flex;align-items:center;gap:8px;margin-top:8px}' +
            '.ifd-confidence-bar{flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden}' +
            '.ifd-confidence-fill{height:100%;border-radius:3px;transition:width 0.5s ease}' +
            '.ifd-signal{display:flex;align-items:flex-start;gap:8px;padding:8px;background:rgba(255,255,255,0.03);' +
            'border-radius:6px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.05)}' +
            '.ifd-signal-type{font-size:10px;font-weight:700;text-transform:uppercase;color:#6366f1;' +
            'background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;white-space:nowrap}' +
            '.ifd-signal-detail{flex:1;color:#94a3b8;font-size:12px}' +
            '.ifd-signal-intent{color:#a5b4fc;font-weight:600}' +
            '.ifd-json{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:8px;' +
            'padding:12px;font-family:"JetBrains Mono","Fira Code",monospace;font-size:11px;' +
            'overflow-x:auto;max-height:200px;overflow-y:auto;color:#94a3b8;white-space:pre;line-height:1.5}' +
            '.ifd-kv{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)}' +
            '.ifd-kv-key{color:#94a3b8;font-size:12px}.ifd-kv-value{color:#e2e8f0;font-weight:500;font-size:12px}' +
            '.ifd-loading{text-align:center;color:#64748b;padding:20px}';

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // Close button
        overlay.querySelector('#ifd-close-btn').addEventListener('click', function () {
            hide();
        });

        return overlay;
    }

    /**
     * Update the overlay with a new decision
     */
    function update(decision) {
        if (!overlayElement) return;

        var body = overlayElement.querySelector('#ifd-body');
        if (!body) return;

        var confidenceColor = decision.confidence > 0.7 ? '#4ade80' :
            decision.confidence > 0.4 ? '#fbbf24' : '#f87171';

        var html = '';

        // Intent section
        html += '<div class="ifd-section">' +
            '<div class="ifd-section-title">Detected Intent</div>' +
            '<span class="ifd-intent-badge ifd-intent-badge--' + decision.intent + '">' + decision.intent + '</span>' +
            '<div class="ifd-confidence">' +
            '<span style="color:' + confidenceColor + ';font-weight:600">' + Math.round(decision.confidence * 100) + '%</span>' +
            '<div class="ifd-confidence-bar">' +
            '<div class="ifd-confidence-fill" style="width:' + (decision.confidence * 100) + '%;background:' + confidenceColor + '"></div>' +
            '</div>' +
            '</div>' +
            '</div>';

        // Template section
        html += '<div class="ifd-section">' +
            '<div class="ifd-section-title">Selected Template</div>' +
            '<div class="ifd-kv"><span class="ifd-kv-key">Template</span><span class="ifd-kv-value">' + (decision.templateName || decision.template) + '</span></div>' +
            '<div class="ifd-kv"><span class="ifd-kv-key">Image</span><span class="ifd-kv-value">' + decision.hero_image + '</span></div>' +
            '<div class="ifd-kv"><span class="ifd-kv-key">CTA</span><span class="ifd-kv-value">' + decision.cta_text + '</span></div>' +
            '</div>';

        // Signals section
        if (decision.signal_details && decision.signal_details.length > 0) {
            html += '<div class="ifd-section">' +
                '<div class="ifd-section-title">Signals (' + decision.signal_details.length + ')</div>';
            for (var i = 0; i < decision.signal_details.length; i++) {
                var signal = decision.signal_details[i];
                html += '<div class="ifd-signal">' +
                    '<span class="ifd-signal-type">' + signal.type + '</span>' +
                    '<span class="ifd-signal-detail">' + signal.key + '="' + signal.value + '" → ' +
                    '<span class="ifd-signal-intent">' + signal.detectedIntent + '</span></span>' +
                    '</div>';
            }
            html += '</div>';
        }

        // Explanation section
        html += '<div class="ifd-section">' +
            '<div class="ifd-section-title">Explanation</div>' +
            '<div style="color:#94a3b8;font-size:12px;line-height:1.5">' + decision.reason + '</div>' +
            '</div>';

        // Full JSON section
        html += '<div class="ifd-section">' +
            '<div class="ifd-section-title">Full Decision Object</div>' +
            '<div class="ifd-json">' + JSON.stringify(decision, null, 2) + '</div>' +
            '</div>';

        body.innerHTML = html;
    }

    /**
     * Show the debug overlay
     */
    function show() {
        if (!overlayElement) {
            overlayElement = createOverlay();
        }
        overlayElement.classList.remove('ifd-hidden');
        isVisible = true;
    }

    /**
     * Hide the debug overlay
     */
    function hide() {
        if (overlayElement) {
            overlayElement.classList.add('ifd-hidden');
        }
        isVisible = false;
    }

    /**
     * Toggle the debug overlay
     */
    function toggle() {
        if (isVisible) {
            hide();
        } else {
            show();
        }
    }

    /**
     * Initialize debug overlay — auto-show if URL param is set
     */
    function init() {
        // Keyboard shortcut: Ctrl+Shift+D
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggle();
            }
        });

        // Auto-show if debug param is present
        if (isDebugEnabled()) {
            show();
        }
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.DebugOverlay = {
        init: init,
        show: show,
        hide: hide,
        toggle: toggle,
        update: update,
        isDebugEnabled: isDebugEnabled
    };

})(window);
/**
 * IntentFlow — Preview Mode Module
 * 
 * Site-owner preview panel that allows simulating different visitor
 * intents to see how the hero section adapts. Useful for debugging
 * and demonstrating the personalization system.
 * 
 * Activated via ?intentflow_preview=true
 * 
 * @module PreviewMode
 */

(function (global) {
    'use strict';

    var panelElement = null;
    var isVisible = false;
    var currentPreviewIntent = null;

    /**
     * Check if preview mode is enabled
     */
    function isPreviewEnabled() {
        return window.location.search.indexOf('intentflow_preview=true') !== -1;
    }

    /**
     * Create the preview panel DOM element
     */
    function createPanel() {
        var panel = document.createElement('div');
        panel.id = 'intentflow-preview-panel';

        var intents = [
            { id: 'BUY_NOW', label: 'Buy Now', icon: '🛒', color: '#4ade80', description: 'High purchase intent visitor' },
            { id: 'COMPARE', label: 'Compare', icon: '⚖️', color: '#60a5fa', description: 'Researching & comparing options' },
            { id: 'USE_CASE', label: 'Use Case', icon: '🎯', color: '#c084fc', description: 'Exploring by workflow/purpose' },
            { id: 'BUDGET', label: 'Budget', icon: '💰', color: '#fbbf24', description: 'Looking for best value' },
            { id: 'DEFAULT', label: 'Default', icon: '🏠', color: '#94a3b8', description: 'No specific intent detected' }
        ];

        var buttonsHtml = '';
        for (var i = 0; i < intents.length; i++) {
            var intent = intents[i];
            buttonsHtml += '<button class="ifp-btn" data-intent="' + intent.id + '" style="--btn-color:' + intent.color + '">' +
                '<span class="ifp-btn__icon">' + intent.icon + '</span>' +
                '<span class="ifp-btn__content">' +
                '<span class="ifp-btn__label">' + intent.label + '</span>' +
                '<span class="ifp-btn__desc">' + intent.description + '</span>' +
                '</span>' +
                '</button>';
        }

        panel.innerHTML = '<div class="ifp-header">' +
            '<span class="ifp-title">👁️ Preview Mode</span>' +
            '<span class="ifp-subtitle">Simulate visitor intents</span>' +
            '</div>' +
            '<div class="ifp-buttons">' + buttonsHtml + '</div>' +
            '<div class="ifp-status" id="ifp-status">Select an intent to preview</div>';

        // Inject styles
        var style = document.createElement('style');
        style.textContent = '#intentflow-preview-panel{position:fixed;top:50%;left:16px;transform:translateY(-50%);' +
            'width:220px;background:rgba(15,23,42,0.97);border:1px solid rgba(99,102,241,0.3);border-radius:16px;' +
            'color:#e2e8f0;font-family:"Inter",system-ui,sans-serif;z-index:99998;' +
            'box-shadow:0 20px 60px rgba(0,0,0,0.4);backdrop-filter:blur(20px);overflow:hidden;' +
            'transition:transform 0.3s ease,opacity 0.3s ease}' +
            '#intentflow-preview-panel.ifp-hidden{transform:translateY(-50%) translateX(-20px);opacity:0;pointer-events:none}' +
            '.ifp-header{padding:16px;text-align:center;border-bottom:1px solid rgba(99,102,241,0.15)}' +
            '.ifp-title{display:block;font-weight:700;font-size:14px;color:#a5b4fc}' +
            '.ifp-subtitle{display:block;font-size:11px;color:#64748b;margin-top:4px}' +
            '.ifp-buttons{padding:12px}' +
            '.ifp-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;margin-bottom:6px;' +
            'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;' +
            'color:#e2e8f0;cursor:pointer;transition:all 0.2s ease;text-align:left;font-family:inherit}' +
            '.ifp-btn:hover{background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.3);transform:translateX(4px)}' +
            '.ifp-btn.ifp-btn--active{background:rgba(99,102,241,0.2);border-color:var(--btn-color);' +
            'box-shadow:0 0 20px rgba(99,102,241,0.15)}' +
            '.ifp-btn__icon{font-size:18px;width:28px;text-align:center}' +
            '.ifp-btn__content{flex:1}' +
            '.ifp-btn__label{display:block;font-weight:600;font-size:13px;color:var(--btn-color)}' +
            '.ifp-btn__desc{display:block;font-size:10px;color:#64748b;margin-top:2px}' +
            '.ifp-status{padding:12px 16px;font-size:11px;color:#64748b;text-align:center;' +
            'border-top:1px solid rgba(255,255,255,0.05)}';

        document.head.appendChild(style);
        document.body.appendChild(panel);

        // Bind click events
        var buttons = panel.querySelectorAll('.ifp-btn');
        for (var j = 0; j < buttons.length; j++) {
            buttons[j].addEventListener('click', function () {
                var intent = this.getAttribute('data-intent');
                simulateIntent(intent);

                // Update active state
                for (var k = 0; k < buttons.length; k++) {
                    buttons[k].classList.remove('ifp-btn--active');
                }
                this.classList.add('ifp-btn--active');
            });
        }

        return panel;
    }

    /**
     * Simulate a specific intent by re-running the personalization pipeline
     */
    function simulateIntent(intent) {
        currentPreviewIntent = intent;

        // Update status
        var statusEl = document.querySelector('#ifp-status');
        if (statusEl) {
            statusEl.textContent = 'Previewing: ' + intent;
            statusEl.style.color = '#a5b4fc';
        }

        // Re-run the pipeline with the simulated intent
        if (global.IntentFlow && global.IntentFlow.personalize) {
            global.IntentFlow.personalize({ intent: intent });
        }
    }

    /**
     * Show the preview panel
     */
    function show() {
        if (!panelElement) {
            panelElement = createPanel();
        }
        panelElement.classList.remove('ifp-hidden');
        isVisible = true;
    }

    /**
     * Hide the preview panel
     */
    function hide() {
        if (panelElement) {
            panelElement.classList.add('ifp-hidden');
        }
        isVisible = false;
    }

    /**
     * Initialize preview mode
     */
    function init() {
        if (isPreviewEnabled()) {
            show();
        }
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.PreviewMode = {
        init: init,
        show: show,
        hide: hide,
        simulateIntent: simulateIntent,
        isPreviewEnabled: isPreviewEnabled
    };

})(window);
/**
 * IntentFlow — Multi-Page Support Module
 * 
 * Extends IntentFlow beyond the homepage hero to support personalization
 * across multiple page types. Each page type can have its own hero
 * container and page-specific content overrides.
 * 
 * Supported page types:
 *   - homepage   (default hero)
 *   - product    (product page hero — spec comparison, CTA: "Add to Cart")
 *   - category   (category page hero — filtered by use case)
 *   - landing    (campaign landing page — matches UTM source)
 * 
 * Usage:
 *   <section data-intentflow-hero data-intentflow-page="product">
 * 
 * If no data-intentflow-page is set, defaults to "homepage".
 * 
 * @module MultiPage
 * @version 1.0.0
 */

(function (global) {
    'use strict';

    /**
     * Page-specific content overrides.
     * These modify the decision output based on which page the hero is on.
     */
    var pageOverrides = {
        product: {
            BUY_NOW: {
                headline: 'You Found the One',
                subheadline: 'This is the #1 rated monitor in its class. 4K, 144Hz, and ready to ship today.',
                cta_text: 'Add to Cart — Ships Free →',
                cta_link: '#add-to-cart'
            },
            COMPARE: {
                headline: 'How Does It Compare?',
                subheadline: 'See this monitor stacked against its top 3 competitors in specs, price, and reviews.',
                cta_text: 'View Full Comparison →',
                cta_link: '#specs-comparison'
            },
            USE_CASE: {
                headline: 'Perfect for Your Workflow',
                subheadline: 'Optimized for your use case with factory-calibrated colors and ergonomic flexibility.',
                cta_text: 'See It in Action →',
                cta_link: '#use-case-gallery'
            },
            BUDGET: {
                headline: 'Best Value in Its Class',
                subheadline: 'All the features you need at a price that makes sense. Currently 25% off.',
                cta_text: 'Grab This Deal →',
                cta_link: '#deal'
            },
            DEFAULT: {
                headline: 'Explore This Monitor',
                subheadline: 'Dive into the specs, read reviews, and see why thousands of customers love it.',
                cta_text: 'View Full Details →',
                cta_link: '#details'
            }
        },
        category: {
            BUY_NOW: {
                headline: 'Top Picks, Ready to Ship',
                subheadline: 'Our most popular monitors in this category — all in stock with free delivery.',
                cta_text: 'Shop Best Sellers →',
                cta_link: '#best-sellers'
            },
            COMPARE: {
                headline: 'Compare All Models',
                subheadline: 'Filter by specs, sort by price, and find the perfect monitor in seconds.',
                cta_text: 'Open Comparison Tool →',
                cta_link: '#compare-all'
            },
            USE_CASE: {
                headline: 'Monitors for Every Need',
                subheadline: 'Gaming, office, creative — browse monitors tailored to what you do.',
                cta_text: 'Browse by Use Case →',
                cta_link: '#filter-use-case'
            },
            BUDGET: {
                headline: 'Quality Monitors Under $300',
                subheadline: 'Our editors picked the best monitors at every price point. No compromises.',
                cta_text: 'See Budget Picks →',
                cta_link: '#under-300'
            },
            DEFAULT: {
                headline: 'Browse the Collection',
                subheadline: 'From ultrawide to portable — discover your next display.',
                cta_text: 'View All Monitors →',
                cta_link: '#all'
            }
        },
        landing: {
            BUY_NOW: {
                headline: 'Exclusive Offer — Today Only',
                subheadline: 'Get up to 40% off our best-selling 4K monitors. Limited quantities available.',
                cta_text: 'Claim Your Deal →',
                cta_link: '#offer'
            },
            COMPARE: {
                headline: 'The Ultimate Monitor Guide',
                subheadline: 'We tested 50+ monitors so you don\'t have to. See the definitive rankings.',
                cta_text: 'Read the Guide →',
                cta_link: '#guide'
            },
            USE_CASE: {
                headline: 'Find Your Perfect Monitor in 60 Seconds',
                subheadline: 'Take our quick quiz and get a personalized recommendation.',
                cta_text: 'Start the Quiz →',
                cta_link: '#quiz'
            },
            BUDGET: {
                headline: 'Flash Sale: Premium Monitors from $99',
                subheadline: 'Warehouse clearance event. Same quality, fraction of the price. Ends midnight.',
                cta_text: 'Shop the Sale →',
                cta_link: '#flash-sale'
            },
            DEFAULT: {
                headline: 'Welcome to UltraView',
                subheadline: 'The next generation of displays is here. See what makes us different.',
                cta_text: 'Learn More →',
                cta_link: '#about'
            }
        }
    };

    /**
     * Detect the page type from the hero container
     */
    function detectPageType(container) {
        if (!container) return 'homepage';
        return container.getAttribute('data-intentflow-page') || 'homepage';
    }

    /**
     * Apply page-specific overrides to a decision object
     * Only modifies text content — template and image stay the same
     */
    function applyPageOverrides(decision, pageType) {
        if (pageType === 'homepage' || !pageOverrides[pageType]) {
            decision._pageType = 'homepage';
            return decision;
        }

        var intent = decision.intent;
        var overrides = pageOverrides[pageType][intent] || pageOverrides[pageType]['DEFAULT'];

        if (overrides) {
            decision.headline = overrides.headline;
            decision.subheadline = overrides.subheadline;
            decision.cta_text = overrides.cta_text;
            decision.cta_link = overrides.cta_link;
            decision._pageType = pageType;
            decision.reason += ' [Multi-page: ' + pageType + ' page overrides applied]';
        }

        return decision;
    }

    /**
     * Find all IntentFlow hero containers on the page
     * (supports multiple heroes for multi-section pages)
     */
    function findAllContainers() {
        return document.querySelectorAll('[data-intentflow-hero]');
    }

    /**
     * Get available page types
     */
    function getPageTypes() {
        return ['homepage', 'product', 'category', 'landing'];
    }

    /**
     * Get page overrides for a specific page type (for debugging)
     */
    function getOverrides(pageType) {
        return pageOverrides[pageType] || null;
    }

    /**
     * Initialize — detect and log page type
     */
    function init() {
        var containers = findAllContainers();
        if (containers.length > 1) {
            console.log(
                '%c⚡ IntentFlow Multi-Page %c Found ' + containers.length + ' hero sections',
                'background: #0891b2; color: white; padding: 2px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
                'background: #1e1b4b; color: #a5b4fc; padding: 2px 8px; border-radius: 0 4px 4px 0;'
            );
        }

        containers.forEach(function (container) {
            var pageType = detectPageType(container);
            if (pageType !== 'homepage') {
                console.log(
                    '%c⚡ IntentFlow Multi-Page %c Page type: ' + pageType,
                    'background: #0891b2; color: white; padding: 2px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
                    'background: #1e1b4b; color: #a5b4fc; padding: 2px 8px; border-radius: 0 4px 4px 0;'
                );
            }
        });
    }

    // ── Export ──
    global.IntentFlow = global.IntentFlow || {};
    global.IntentFlow.MultiPage = {
        init: init,
        detectPageType: detectPageType,
        applyPageOverrides: applyPageOverrides,
        findAllContainers: findAllContainers,
        getPageTypes: getPageTypes,
        getOverrides: getOverrides
    };

})(window);
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
                multi_page: IF.MultiPage ? true : false
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
