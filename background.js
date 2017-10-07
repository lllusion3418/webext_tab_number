/* globals getOptions, onError */
"use strict";
function main(options) {
    var setText;

    /* On Release 56.0 and Beta 57.0b6-1 browser.tabs.query still returns
     * a closed tab if called in caused onRemoved and (possibly) onActivated
     * events, resulting in a wrong tab count being displayed
     * Nightly 58.0a1 (2017-10-06) doesn't exhibit this behavior
     */
    var filterTab = null;
    const tabsQueryFilter = queryInfo => new Promise((resolve, reject) =>
        browser.tabs.query(queryInfo).then(
            tabs => resolve(tabs.filter(i => i.id !== filterTab)),
            reject
        )
    );

    function updateGlobal() {
        tabsQueryFilter({
            "windowType": "normal"
        }).then(
            tabs => setText(null, tabs.length.toString()),
            onError
        );
    }

    function updateActives() {
        tabsQueryFilter({
            active: true
        }).then(
            tabs => tabs.forEach(i => updateActive(i.windowId)),
            onError
        );
    }

    function updateActive(windowId) {
        tabsQueryFilter({
            //active: true,
            windowId: windowId
        }).then(
            tabs => {
                const active = tabs.filter(i => i.active)[0];
                setText(active.id, tabs.length.toString());
            },
            onError
        );
    }

    function updateBadge(tabId, windowId) {
        tabsQueryFilter({
            windowId: windowId
        }).then(
            tabs => setText(tabId, tabs.length.toString()),
            onError
        );
    }


    function setTextBadge(tabId, text) {
        browser.browserAction.setBadgeText({
            text: text,
            tabId: tabId
        });
    }


    function setTextIcon(tabId, text) {
        const c = document.createElement("canvas");
        c.width = options.iconDimension;
        c.height = options.iconDimension;
        const ctx = c.getContext("2d");

        const fontSize = adjustedFontSize * options.iconFontMultiplier;
        ctx.font = `${fontSize}px ${options.iconFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = options.iconColor;
        ctx.fillText(
            text,
            options.iconDimension / 2,
            adjustedBottom * (1 + options.iconFontMultiplier) / 2,
            options.iconDimension
        );
        const data = ctx.getImageData(0, 0, options.iconDimension, options.iconDimension);
        browser.browserAction.setIcon({
            imageData: data,
            tabId: tabId
        });
    }

    if (options.displayMode === "badge") {
        setText = setTextBadge;
        browser.browserAction.setBadgeBackgroundColor({color:options.badgeBg});
    } else if (options.displayMode === "icon") {
        setText = setTextIcon;
        /* completely transparent image looks better than the default icon flashing
         * for < 1s when switching to previously unset tab
         */
        browser.browserAction.setIcon({
            imageData: new ImageData(options.iconDimension, options.iconDimension)
        });

        const str = "0123456789";
        const step = 1;
        var adjustedBottom = getAdjustedBottom(options.iconFont, str, options.iconDimension, step);
        var adjustedFontSize = getAdjustedFontSize(options.iconFont, str, options.iconDimension, step, adjustedBottom);
    } else {
        onError("invalid displayMode");
        return;
    }

    if (options.scope === "window") {
        browser.tabs.onActivated.addListener(activeInfo => updateBadge(activeInfo.tabId, activeInfo.windowId));
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            filterTab = tabId;
            updateActive(removeInfo.windowId);
        });
        browser.tabs.onDetached.addListener((_, detachInfo) => updateActive(detachInfo.oldWindowId));
        browser.tabs.onCreated.addListener(tab => {
            filterTab = null;
            updateActive(tab.windowId);
        });
        browser.tabs.onAttached.addListener((_, attachInfo) => updateActive(attachInfo.newWindowId));

        updateActives();
    } else if (options.scope === "global") {
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            filterTab = tabId;
            updateGlobal();
        });
        browser.tabs.onCreated.addListener(tab => {
            filterTab = null;
            updateGlobal();
        });

        updateGlobal();
    } else {
        onError("invalid scope");
        return;
    }

}

getOptions().then(
    main,
    onError
);

/* find distance from top, such that text touches bottom of canvas
 * textBaseline = "ideographic" doesn't do the right thing
 * assuming real bottom is underneath alphabetic baseline
 */
function getAdjustedBottom(font, str, height, step) {
    const canvas = document.createElement("canvas");
    canvas.height = height;
    const width = height * str.length * 2;
    canvas.width = width;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.font = `${height}pt ${font}`;

    var bottom = height;
    for (var i = bottom; i > 0; i -= step) {
        ctx.fillText(str, width / 2, i, width);

        // every pixel in bottom row is blank
        if (ctx.getImageData(0, height - 1, width, 1).data.every(p => !p)) {
            return bottom;
        }
        bottom = i;
        ctx.clearRect(0, 0, width, height);
    }
}

/* find font size in px, such that text touches top of canvas
 */
function getAdjustedFontSize(font, str, height, step, bottom) {
    const canvas = document.createElement("canvas");
    canvas.height = height;
    const width = height * str.length * 2;
    canvas.width = width;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const max = height * 2;
    for (var fontSize = 1; fontSize < max; fontSize += step) {
        ctx.font = `${fontSize}px ${font}`;
        ctx.fillText(str, width / 2, bottom, width);

        // at least one pixel in top row is not blank
        if (ctx.getImageData(0, 0, width, 1).data.some(p => p)) {
            return fontSize;
        }
        ctx.clearRect(0, 0, width, height);
    }
}