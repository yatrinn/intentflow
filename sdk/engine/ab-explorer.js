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
