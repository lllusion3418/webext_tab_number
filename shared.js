/* global defaultOptions, getOptions, onError, supportsWindowId, supportsTabReset */
/* exported defaultOptions, getOptions, onError, supportsWindowId, supportsTabReset */
"use strict";

var defaultOptions = {
    "scope": "window", // "global" | "window" | "both"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "#212121",

    // if displayMode == "icon"
    "iconDimension": 32, // in CSS px, refer https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
    "iconFont": "sans-serif",
    "iconColor": "#000000",
    "iconMargin": 5, // percent of icon height - placed at top and bottom of icon and in between rows
};

function getOptions() {
    return browser.storage.local.get(defaultOptions);
}

var debugging = true;

function onError(error) {
    if (debugging) {
        // eslint-disable-next-line no-console
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

/* Whether browserAction.setIcon and browserAction.setBadgeText support
 * resetting individual tabs icons/badges by passing `null`
 */
function supportsTabReset() {
    if (!browser.runtime.getBrowserInfo) return Promise.resolve(false);
    return new Promise(resolve => {
        browser.runtime.getBrowserInfo().then(
            info => resolve(
                info.name === "Firefox" && parseInt(info.version, 10) >= 59
            ),
            () => resolve(false)
        );
    });
}
