/* globals getOptions, onError, supportsWindowId, supportsTabReset, IconDrawer, migrate */
"use strict";
async function main() {
    /* eslint no-restricted-properties: ["error", {
        "property": "addListener",
    }] */
    await migrate();
    const options = await getOptions();
    const useWindowId = await supportsWindowId();
    const doTabReset = await supportsTabReset();
    const excludeHiddenTabs = await supportsHiddenTabs();
    const useOnUpdatedExtra = await supportsOnUpdatedExtra();

    let setText;
    let drawer;

    /* On some versions of Firefox the tab list returned by browser.tabs.query
     * still contains some closed tabs in the resulting browser.tabs.onRemoved
     * and browser.tabs.onActivated events
     * when closing multiple tabs at once (e.g. by ctrl-selecting them) this
     * may even result in the count being off by more than one
     */
    let filterTabs = [];
    async function tabsQueryFilter(queryInfo, try_exclude_hidden = true) {
        if (try_exclude_hidden && excludeHiddenTabs) {
            queryInfo = Object.assign({hidden: false}, queryInfo);
        }
        const tabs = await browser.tabs.query(queryInfo);
        return tabs.filter(i => !filterTabs.includes(i.id));
    }

    let listeners = [];
    function addListener(event, listener, ...extraParams) {
        listeners.push({
            event: event,
            listener: listener,
        });
        // eslint-disable-next-line no-restricted-properties
        event.addListener(listener, ...extraParams);
    }

    function removeListeners() {
        for (let i of listeners) {
            i.event.removeListener(i.listener);
        }
    }

    addListener(browser.storage.onChanged, async (changes) => {
        let needsReset = false;
        let reinitializeCounters = false;
        for (let i in changes) {
            switch (i) {
                case "iconDimension":
                case "iconFont":
                    options[i] = changes[i].newValue;
                    drawer = new IconDrawer(
                        "0123456789",
                        options.iconFont,
                        options.iconDimension,
                        options.iconDimension,
                    );
                    reinitializeCounters = true;
                    break;
                case "badgeBg":
                    options[i] = changes[i].newValue;
                    browser.browserAction.setBadgeBackgroundColor({color: options.badgeBg});
                    break;
                case "iconColor":
                case "iconMargin":
                    options[i] = changes[i].newValue;
                    reinitializeCounters = true;
                    break;
                default:
                    needsReset = true;
                    break;
            }
        }
        if (!needsReset) {
            if (reinitializeCounters) {
                initializeCounters();
            }
            return;
        }
        if (doTabReset) {
            await resetBadgeIconAll();
        }
        removeListeners();
        main();
    });

    async function resetBadgeIconAll() {
        resetBadgeIcon(null);
        if (options.scope === "global") return;
        if (useWindowId) {
            const tabs = await browser.tabs.query({active: true});
            await Promise.all(tabs.map(i => resetBadgeIcon({windowId: i.windowId})));
        } else {
            const tabs = await browser.tabs.query({});
            await Promise.all(tabs.map(i => resetBadgeIcon({tabId: i.id})));
        }
    }

    async function resetBadgeIcon(spec) {
        if (options.displayMode === "badge") {
            await browser.browserAction.setBadgeText(
                Object.assign({text: null}, spec),
            );
        } else if (options.displayMode === "icon") {
            await browser.browserAction.setIcon(
                Object.assign({imageData: null}, spec),
            );
        } else {
            onError("invalid displayMode");
            return;
        }
    }

    async function updateGlobal() {
        const tabs = await tabsQueryFilter({windowType: "normal"});
        await setText(null, [tabs.length.toString()]);
    }

    async function updateWindows() {
        const tabs = await tabsQueryFilter({active: true});
        await Promise.all(tabs.map(i => updateWindow(i.windowId)));
    }

    async function updateWindow(windowId) {
        const tabs = await tabsQueryFilter({windowId: windowId});
        await setText({windowId: windowId}, [tabs.length.toString()]);
    }

    async function updateActive(windowId) {
        const tabs = await tabsQueryFilter({windowId: windowId});
        const active = tabs.filter(i => i.active)[0];
        await setText({tabId: active.id}, [tabs.length.toString()]);
    }

    async function updateActives() {
        const tabs = await tabsQueryFilter({active: true});
        await Promise.all(tabs.map(i => updateTab(i.id, i.windowId)));
    }

    async function updateTab(tabId, windowId) {
        const tabs = await tabsQueryFilter({windowId: windowId});
        await setText({tabId: tabId}, [tabs.length.toString()]);
    }

    async function updateBoth() {
        const tabs = await tabsQueryFilter({});
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
            await setText({windowId: tabs[0].windowId}, [total.toString()]);
            return;
        }
        for (let [i, n] of counts) {
            await setText({windowId: i}, [n.toString(), total.toString()]);
        }
    }

    async function updateBothTab() {
        const tabs = await tabsQueryFilter({});
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
            await setText({tabId: active}, [total.toString()]);
            return;
        }
        for (let [i, active] of actives) {
            const n = counts.get(i);
            await setText({tabId: active}, [n.toString(), total.toString()]);
        }
    }

    async function initializeCounters() {
        if (options.scope === "window") {
            if (useWindowId) {
                updateWindows();
            } else {
                updateActives();
            }
        } else if (options.scope === "both") {
            if (useWindowId) {
                updateBoth();
            } else {
                updateBothTab();
            }
        } else if (options.scope === "global") {
            updateGlobal();
        } else {
            onError("invalid scope");
        }
    }

    async function setTextBadge(spec, text) {
        await browser.browserAction.setBadgeText(Object.assign({text: text[0]}, spec));
    }


    async function setTextIcon(spec, text) {
        const data = drawer.draw(text, options.iconMargin / 100, options.iconColor);
        await browser.browserAction.setIcon(Object.assign({imageData: data}, spec));
    }

    if (options.displayMode === "badge") {
        setText = setTextBadge;
        await browser.browserAction.setBadgeBackgroundColor({color:options.badgeBg});
    } else if (options.displayMode === "icon") {
        setText = setTextIcon;
        /* completely transparent image looks better than the default icon flashing
         * for < 1s when switching to previously unset tab
         */
        await browser.browserAction.setIcon({
            imageData: new ImageData(options.iconDimension, options.iconDimension),
        });

        drawer = new IconDrawer(
            "0123456789",
            options.iconFont,
            options.iconDimension,
            options.iconDimension,
        );
    } else {
        onError("invalid displayMode");
        return;
    }

    if (options.scope === "window") {
        if (useWindowId) {
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTabs.push(tabId);
                updateWindow(removeInfo.windowId);
            });
            addListener(browser.tabs.onDetached, (_, detachInfo) => {
                updateWindow(detachInfo.oldWindowId);
            });
            addListener(browser.tabs.onCreated, tab => {
                filterTabs = [];
                updateWindow(tab.windowId);
            });
            addListener(browser.tabs.onAttached, (_, attachInfo) => {
                updateWindow(attachInfo.newWindowId);
            });

            if (excludeHiddenTabs) {
                if (useOnUpdatedExtra) {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        updateWindow(tab.windowId);
                    }, {properties: ["hidden"]});
                } else {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        if ("hidden" in changeInfo) {
                            updateWindow(tab.windowId);
                        }
                    });
                }
            }

            updateWindows();
        } else {
            addListener(browser.tabs.onActivated, activeInfo => {
                updateTab(activeInfo.tabId, activeInfo.windowId);
            });
            addListener(browser.tabs.onDetached, (_, detachInfo) =>{
                updateActive(detachInfo.oldWindowId);
            });
            addListener(browser.tabs.onAttached, (_, attachInfo) =>{
                updateActive(attachInfo.newWindowId);
            });
            addListener(browser.tabs.onCreated, tab => {
                filterTabs = [];
                updateTab(tab.id, tab.windowId);
            });
            addListener(browser.tabs.onRemoved, (tabId, removeInfo) => {
                filterTabs.push(tabId);
                updateActive(removeInfo.windowId);
            });
            addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                if ("url" in changeInfo && tab.active) {
                    updateTab(tabId, tab.windowId);
                }
            });

            if (excludeHiddenTabs) {
                if (useOnUpdatedExtra) {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        updateActive(tab.windowId);
                    }, {properties: ["hidden"]});
                } else {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        if ("hidden" in changeInfo) {
                            updateActive(tab.windowId);
                        }
                    });
                }
            }

            updateActives();
        }
    } else if (options.scope === "both") {
        if (useWindowId) {
            addListener(browser.tabs.onDetached, updateBoth);
            addListener(browser.tabs.onAttached, updateBoth);
            addListener(browser.tabs.onCreated, () => {
                filterTabs = [];
                updateBoth();
            });
            addListener(browser.tabs.onRemoved, tabId => {
                filterTabs.push(tabId);
                updateBoth();
            });

            if (excludeHiddenTabs) {
                if (useOnUpdatedExtra) {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        updateBoth();
                    }, {properties: ["hidden"]});
                } else {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        if ("hidden" in changeInfo) {
                            updateBoth();
                        }
                    });
                }
            }

            updateBoth();
        } else {
            addListener(browser.tabs.onActivated, updateBothTab);
            addListener(browser.tabs.onDetached, updateBothTab);
            addListener(browser.tabs.onAttached, updateBothTab);
            addListener(browser.tabs.onCreated, () => {
                filterTabs = [];
                updateBothTab();
            });
            addListener(browser.tabs.onRemoved, tabId => {
                filterTabs.push(tabId);
                updateBothTab();
            });
            addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                if ("url" in changeInfo && tab.active) {
                    updateBothTab();
                }
            });

            if (excludeHiddenTabs) {
                if (useOnUpdatedExtra) {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        updateBothTab();
                    }, {properties: ["hidden"]});
                } else {
                    addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                        if ("hidden" in changeInfo) {
                            updateBothTab();
                        }
                    });
                }
            }

            updateBothTab();
        }
    } else if (options.scope === "global") {
        addListener(browser.tabs.onRemoved, tabId => {
            filterTabs.push(tabId);
            updateGlobal();
        });
        addListener(browser.tabs.onCreated, () => {
            filterTabs = [];
            updateGlobal();
        });

        if (excludeHiddenTabs) {
            if (useOnUpdatedExtra) {
                addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                    updateGlobal();
                }, {properties: ["hidden"]});
            } else {
                addListener(browser.tabs.onUpdated, (tabId, changeInfo, tab) => {
                    if ("hidden" in changeInfo) {
                        updateGlobal();
                    }
                });
            }
        }

        updateGlobal();
    } else {
        onError("invalid scope");
        return;
    }
}

main();
