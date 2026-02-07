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
