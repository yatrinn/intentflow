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
                cta_link: '#collection',
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
