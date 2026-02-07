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
