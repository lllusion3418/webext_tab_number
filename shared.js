export { defaultOptions, getOptions, onError };

var defaultOptions = {
    "includeHiddenTabs": false,

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
