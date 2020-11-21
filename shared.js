/* exported defaultOptions, getOptions, onError, supportsWindowId, supportsTabReset, supportsHiddenTabs, supportsOnUpdatedExtra */
"use strict";

var defaultOptions = {
    "scope": "window", // "global" | "window" | "both"
    "displayMode": "icon", // "icon" | "badge"

    // # if displayMode == "badge"
    "badgeBg": "#212121",

    // # if displayMode == "icon"
    // in CSS px, refer
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
    "iconDimension": 32,
    "iconFont": "sans-serif",
    "iconColor": "#000000",
    // percent of icon height - placed at top and bottom of icon and in between rows
    "iconMargin": 5,
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
async function supportsWindowId() {
    if (!browser.runtime.getBrowserInfo) return false;
    try {
        const info = await browser.runtime.getBrowserInfo();
        return info.name === "Firefox" && parseInt(info.version, 10) >= 62;
    } catch (e) {
        return false;
    }
}

/* Whether browserAction.setIcon and browserAction.setBadgeText support
 * resetting individual tabs icons/badges by passing `null`
 */
async function supportsTabReset() {
    if (!browser.runtime.getBrowserInfo) return false;
    try {
        const info = await browser.runtime.getBrowserInfo();
        return info.name === "Firefox" && parseInt(info.version, 10) >= 59;
    } catch (e) {
        return false;
    }
}

/* Whether the browser supports hidden tabs (e.g. used by Simple Tab Groups)
 * on https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab
 * it's not mentioned when the Tab.hidden property was added but on
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/hide
 * it says that tabs.hide() was added in Firefox 61 which is presumably the same version the
 * corresponding property was added
 */
async function supportsHiddenTabs() {
    if (!browser.runtime.getBrowserInfo) return false;
    try {
        const info = await browser.runtime.getBrowserInfo();
        return info.name === "Firefox" && parseInt(info.version, 10) >= 61;
    } catch (e) {
        return false;
    }
}

/* Whether the browser supports the extraParametersOptional parameter to
 * tabs.onUpdated.addListener
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/onUpdated
 */
async function supportsOnUpdatedExtra() {
    if (!browser.runtime.getBrowserInfo) return false;
    try {
        const info = await browser.runtime.getBrowserInfo();
        return info.name === "Firefox" && parseInt(info.version, 10) >= 61;
    } catch (e) {
        return false;
    }
}