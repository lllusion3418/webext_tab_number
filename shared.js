/* global defaultOptions, getOptions */
/* exported defaultOptions, getOptions */
"use strict";

var defaultOptions = {
    "scope": "window", // "global" | "window"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "#212121",

    // if displayMode == "icon"
    "iconDimension": 64, // refer https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/browser_action#Choosing_icon_sizes
    "iconFont": "sans-serif",
    "iconColor": "#000000"
};

function getOptions() {
    return browser.storage.local.get(defaultOptions);
}