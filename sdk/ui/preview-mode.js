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
