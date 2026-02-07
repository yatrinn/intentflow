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
