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
