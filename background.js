/* globals getOptions */
"use strict";
function main(options) {
    var setText;

    function updateGlobal() {
        browser.tabs.query({
            "windowType": "normal"
        }).then(
            tabs => setText(null, tabs.length.toString()),
            onError
        );
    }

    function updateActives() {
        browser.tabs.query({
            active: true
        }).then(
            tabs => tabs.forEach(i => updateActive(i.windowId)),
            onError
        );
    }

    function updateActive(windowId) {
        browser.tabs.query({
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
        browser.tabs.query({
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
        /* https://developer.mozilla.org/en-US/docs/Web/CSS/font-size?v=control#Ems
         * such that text, which only consists of digits, fills the whole
         * height of options.iconDimension px
         */
        const fontSize = options.iconDimension / (12 / 16);
        ctx.font = `${fontSize}px ${options.iconFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = options.iconColor;
        ctx.fillText(text, options.iconDimension / 2, options.iconDimension, options.iconDimension);
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
    } else {
        onError("invalid displayMode");
        return;
    }

    if (options.scope === "window") {
        browser.tabs.onActivated.addListener(activeInfo => updateBadge(activeInfo.tabId, activeInfo.windowId));
        browser.tabs.onRemoved.addListener((_, removeInfo) => updateActive(removeInfo.windowId));
        browser.tabs.onDetached.addListener((_, detachInfo) => updateActive(detachInfo.oldWindowId));
        browser.tabs.onCreated.addListener(tab => updateActive(tab.windowId));
        browser.tabs.onAttached.addListener((_, attachInfo) => updateActive(attachInfo.newWindowId));

        updateActives();
    } else if (options.scope === "global") {
        [browser.tabs.onRemoved, browser.tabs.onCreated].forEach(
            i => i.addListener(updateGlobal)
        );

        updateGlobal();
    } else {
        onError("invalid scope");
        return;
    }

}

function onError(error) {
    console.log(`Error: ${error}`);
}

getOptions().then(
    main,
    onError
);
