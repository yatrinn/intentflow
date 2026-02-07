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
