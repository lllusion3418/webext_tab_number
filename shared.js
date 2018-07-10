/* global defaultOptions, getOptions, onError, supportsWindowId */
/* exported defaultOptions, getOptions, onError, supportsWindowId */
"use strict";

var defaultOptions = {
    "scope": "window", // "global" | "window"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "#212121",

    // if displayMode == "icon"
    "iconDimension": 16, // in CSS px, refer https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
    "iconFont": "sans-serif",
    "iconColor": "#000000",
    "iconFontMultiplier": 0.9,
};

function getOptions() {
    return browser.storage.local.get(defaultOptions);
}

var debugging = true;

function onError(error) {
    if (debugging) {
        /* eslint no-console: ["off"] */
        console.log(`Error: ${error}`);
    }
}

/* Whether `windowId` is supported as an parameter to browserAction.setIcon and
 * browserAction.setBadgeText
 * Firefox version >= 62
 */
function supportsWindowId() {
    if (!browser.runtime.getBrowserInfo) return Promise.resolve(false);
    return new Promise(resolve => {
        browser.runtime.getBrowserInfo().then(
            info => resolve(
                info.name === "Firefox" && parseInt(info.version, 10) >= 62
            ),
            () => resolve(false)
        );
    });
}
