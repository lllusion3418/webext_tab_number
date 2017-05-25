'use strict';

const defaultOptions = {
    "scope": "window", // "global" | "window"
    "displayMode": "icon", // "icon" | "badge"

    // if displayMode == "badge"
    "badgeBg": "#212121",

    // if displayMode == "icon"
    "iconDimension": 128,
    "iconFont": "sans-serif",
    "iconColor": "#000000"
};

function getOptions() {
    return browser.storage.local.get(defaultOptions);
}
