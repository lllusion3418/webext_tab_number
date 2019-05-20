/* globals getOptions, onError, supportsWindowId, supportsTabReset, migrate */
"use strict";
async function main() {
    /* eslint no-restricted-properties: ["error", {
        "property": "addListener",
    }] */
    await migrate();
    const options = await getOptions();
    const useWindowId = await supportsWindowId();
    const doTabReset = await supportsTabReset();

    let setText;
    let fontcfg;

    /* On Release 56.0 and Beta 57.0b6-1 browser.tabs.query still returns
     * a closed tab if called in caused onRemoved and (possibly) onActivated
     * events, resulting in a wrong tab count being displayed
     * Nightly 58.0a1 (2017-10-06) doesn't exhibit this behavior
     * Nightly 61.0a1 (2018-04-20) working
     * Release 59.0.2 (64-bit)     not working
     */
    let filterTab = null;
    const tabsQueryFilter = queryInfo => new Promise((resolve, reject) =>
        browser.tabs.query(queryInfo).then(
            tabs => resolve(tabs.filter(i => i.id !== filterTab)),
            reject
        )
    );


    let listeners = [];
    function addListener(event, listener) {
        listeners.push({
            event: event,
            listener: listener,
        });
        // eslint-disable-next-line no-restricted-properties
        event.addListener(listener);
    }

    function removeListeners() {
        return Promise.all(
            listeners.map(i => i.event.removeListener(i.listener))
        );
    }

    addListener(browser.storage.onChanged, () => {
        if (doTabReset) {
            resetBadgeIconAll();
        }
        removeListeners().then(main);
    });

    function resetBadgeIconAll() {
        resetBadgeIcon(null);
        if (options.scope === "global") return;
        if (useWindowId) {
            return browser.tabs.query({
                active: true,
            }).then(tabs => tabs.forEach(i => {
                resetBadgeIcon({windowId: i.windowId});
            }));
        } else {
            return browser.tabs.query({}).then(tabs => tabs.forEach(i => {
                resetBadgeIcon({tabId: i.id});
            }));
        }
    }

    function resetBadgeIcon(spec) {
        if (options.displayMode === "badge") {
            browser.browserAction.setBadgeText(
                Object.assign({text: null}, spec)
            );
        } else if (options.displayMode === "icon") {
            browser.browserAction.setIcon(
                Object.assign({imageData: null}, spec)
            );
        } else {
            onError("invalid displayMode");
            return;
        }
    }

    function updateGlobal() {
        tabsQueryFilter({
            "windowType": "normal",
        }).then(
            tabs => setText(null, [tabs.length.toString()]),
            onError
        );
    }

    function updateWindows() {
        tabsQueryFilter({
            active: true,
        }).then(
            tabs => tabs.forEach(i => updateWindow(i.windowId)),
            onError
        );
    }

    function updateWindow(windowId) {
        tabsQueryFilter({
            windowId: windowId,
        }).then(
            tabs => {
                setText({windowId: windowId}, [tabs.length.toString()]);
            },
            onError
        );
    }

    function updateActive(windowId) {
        tabsQueryFilter({
            windowId: windowId,
        }).then(
            tabs => {
                const active = tabs.filter(i => i.active)[0];
                setText({tabId: active.id}, [tabs.length.toString()]);
            },
            onError
        );
    }

    function updateActives() {
        tabsQueryFilter({
            active: true,
        }).then(
            tabs => tabs.forEach(i => updateTab(i.id, i.windowId)),
            onError
        );
    }

    function updateTab(tabId, windowId) {
        tabsQueryFilter({
            windowId: windowId,
        }).then(
            tabs => setText({tabId: tabId}, [tabs.length.toString()]),
            onError
        );
    }

    function updateBoth() {
        tabsQueryFilter({}).then(
            tabs => {
                const total = tabs.length;
                let counts = new Map();
                for (let i of tabs) {
                    if (counts.has(i.windowId)) {
                        counts.set(i.windowId, counts.get(i.windowId) + 1);
                    } else {
                        counts.set(i.windowId, 1);
                    }
                }
                if (counts.size === 1) {
                    setText({windowId: tabs[0].windowId}, [total.toString()]);
                    return;
                }
                for (let [i, n] of counts) {
                    setText({windowId: i}, [n.toString(), total.toString()]);
                }
            },
            onError
        )
    }

    function updateBothTab() {
        tabsQueryFilter({}).then(
            tabs => {
                const total = tabs.length;
                let counts = new Map();
                let actives = new Map();
                for (let i of tabs) {
                    if (counts.has(i.windowId)) {
                        counts.set(i.windowId, counts.get(i.windowId) + 1);
                    } else {
                        counts.set(i.windowId, 1);
                    }
                    if (i.active) {
                        actives.set(i.windowId, i.id);
                    }
                }
                if (counts.size === 1) {
                    const active = actives.values().next().value;
                    setText({tabId: active}, [total.toString()]);
                    return;
                }
                for (let [i, active] of actives) {
                    const n = counts.get(i);
                    setText({tabId: active}, [n.toString(), total.toString()]);
                }
            },
            onError
        );
    }

    function setTextBadge(spec, text) {
        browser.browserAction.setBadgeText(Object.assign({text: text[0]}, spec));
    }


    function setTextIcon(spec, text) {
        const data = drawTextCanvas(
            text,
            options.iconDimension,
            options.iconDimension,
            options.iconMargin / 100,
            options.iconColor,
            fontcfg
        );
        browser.browserAction.setIcon(Object.assign({imageData: data}, spec));
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
            imageData: new ImageData(options.iconDimension, options.iconDimension),
        });

        fontcfg = getFontcfg(options.iconFont, options.iconDimension, "0123456789", 1);
    } else {
        onError("invalid displayMode");
        return;
    }

    if (options.scope === "window") {
        if (useWindowId) {
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTab = tabId;
                updateWindow(removeInfo.windowId);
            });
            addListener(browser.tabs.onDetached, (_, detachInfo) =>
                updateWindow(detachInfo.oldWindowId)
            );
            addListener(browser.tabs.onCreated, tab => {
                filterTab = null;
                updateWindow(tab.windowId);
            });
            addListener(browser.tabs.onAttached, (_, attachInfo) =>
                updateWindow(attachInfo.newWindowId)
            );

            updateWindows();
        } else {
            addListener(browser.tabs.onActivated, activeInfo =>
                updateTab(activeInfo.tabId, activeInfo.windowId)
            );
            addListener(browser.tabs.onDetached, (_, detachInfo) =>
                updateActive(detachInfo.oldWindowId)
            );
            addListener(browser.tabs.onAttached, (_, attachInfo) =>
                updateActive(attachInfo.newWindowId)
            );
            addListener(browser.tabs.onCreated, tab => {
                filterTab = null;
                updateTab(tab.id, tab.windowId);
            });
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTab = tabId;
                updateActive(removeInfo.windowId);
            });
            addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                if ("url" in changeInfo && tab.active) {
                    updateTab(tabId, tab.windowId);
                }
            });

            updateActives();
        }
    } else if (options.scope === "both") {
        if (useWindowId) {
            addListener(browser.tabs.onDetached, updateBoth);
            addListener(browser.tabs.onAttached, updateBoth);
            addListener(browser.tabs.onCreated, tab => {
                filterTab = null;
                updateBoth();
            });
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTab = tabId;
                updateBoth();
            });

            updateBoth();
        } else {
            addListener(browser.tabs.onActivated, updateBothTab);
            addListener(browser.tabs.onDetached, updateBothTab);
            addListener(browser.tabs.onAttached, updateBothTab);
            addListener(browser.tabs.onCreated, tab => {
                filterTab = null;
                updateBothTab();
            });
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTab = tabId;
                updateBothTab();
            });
            addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                if ("url" in changeInfo && tab.active) {
                    updateBothTab();
                }
            });

            updateBothTab();
        }
    } else if (options.scope === "global") {
        addListener(browser.tabs.onRemoved, tabId => {
            filterTab = tabId;
            updateGlobal();
        });
        addListener(browser.tabs.onCreated, () => {
            filterTab = null;
            updateGlobal();
        });

        updateGlobal();
    } else {
        onError("invalid scope");
        return;
    }
}

main();

/* draw centered text to canvas and return image data
 */
function drawTextCanvas(
    text, width, height, margin, color, fontcfg
) {
    const totalMargins = (2 + text.length - 1) * margin;
    const fontSizeMultiplier = (1 - totalMargins) / text.length;
    const fontSize = fontcfg.adjustedFontSize * fontSizeMultiplier;
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");

    ctx.font = `${fontSize}px ${fontcfg.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = color;
    text.forEach((str, i) => {
        ctx.fillText(
            str,
            width / 2,
            fontcfg.adjustedBottom * (1 - (text.length - i) * margin - (text.length - i - 1) * fontSizeMultiplier),
            width
        );
    });
    const data = ctx.getImageData(
        0, 0, width, height
    );
    return data;
}


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

    let bottom = height;
    for (let i = bottom; i > 0; i -= step) {
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
    for (let fontSize = 1; fontSize < max; fontSize += step) {
        ctx.font = `${fontSize}px ${font}`;
        ctx.fillText(str, width / 2, bottom, width);

        // at least one pixel in top row is not blank
        if (ctx.getImageData(0, 0, width, 1).data.some(p => p)) {
            return fontSize;
        }
        ctx.clearRect(0, 0, width, height);
    }
}

function getFontcfg(font, height, str, step) {
    const adjustedBottom = getAdjustedBottom(font, str, height, step);
    const adjustedFontSize = getAdjustedFontSize(font, str, height, step, adjustedBottom);
    return {
        font: font,
        adjustedBottom: adjustedBottom,
        adjustedFontSize: adjustedFontSize,
    };
}