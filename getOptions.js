'use strict';

const defaultOptions = {
    "scope": "window", // "global" | "window"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "gray",

    // if displayMode == "icon"
    "iconDimension": 128,
    "iconFont": "sans-serif",
    "iconColor": "black"
};

function getOptions() {
    return browser.storage.local.get(defaultOptions);
}
