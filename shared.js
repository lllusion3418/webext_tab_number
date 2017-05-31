/* global defaultOptions, getOptions, onError */
/* exported defaultOptions, getOptions, onError */
"use strict";

var defaultOptions = {
    "scope": "window", // "global" | "window"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "#212121",

    // if displayMode == "icon"
    "iconDimension": 64, // refer https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
    "iconFont": "sans-serif",
    "iconColor": "#000000",
    "iconFontMultiplier": 0.8,
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
