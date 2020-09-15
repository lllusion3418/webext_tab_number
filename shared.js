/* exported
 *   defaultOptions, getOptions, onError, supportsWindowId, supportsTabReset, IconDrawer,
 *   supportsActualBoundingBoxes,
 */
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

/*
 * Tests whether the TextMetrics.actualBoundingBoxAscent and
 * TextMetrics.actualBoundingBoxDescent attributes are supported
 * The attributes may be present but with value NaN if unsupported
 */
function supportsActualBoundingBoxes() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const metrics = ctx.measureText("foo");
    return (
        "actualBoundingBoxAscent" in metrics
        && typeof metrics.actualBoundingBoxAscent === "number"
        && !isNaN(metrics.actualBoundingBoxAscent)
        && "actualBoundingBoxDescent" in metrics
        && typeof metrics.actualBoundingBoxDescent === "number"
        && !isNaN(metrics.actualBoundingBoxDescent)
    );
}

/*
 * draw text in a canvas such that they fit exactly in a given line height
 * i.e. they touch but don't cross over top and bottom
 * to this end for any given line height some adjustment values are
 * calculated:
 * - fontSize: the font size in px such that the largest character of
 *   charset is actually lineHeight px tall
 * - bottomAdjustment: if you want the bottom of your text to be at y
 *   the value you need to give CanvasRenderingContext2D.fillText() is
 *   y - bottomAdjustment
 *
 * those values are calculated for a given charset (result probably
 * equivalent to testing each character separately and taking the biggest
 * of each fontSize and bottomAdjustment)
 * when using draw() only characters in charset should be used
 *
 * some assumtions are made:
 * - the fontSize is always between lineHeight and 2 * lineHeight
 *   For all fonts I've tested it's between 1.27 * lineHeight
 *   and 1.58 * lineHeight
 *   testing a bigger space would make a linear search significantly
 *   slower
 * - bottomAdjustment is less than lineHeight
 *   in practice the most extreme I've found was at 7% lineHeight
 *   most are at 2-3% lineHeight
 *   if performance is a concern, this could be lowered a bit
 *   (maybe 0.2 * lineHeight)
 *
 * two ways of determining those values are implemented:
 * - one where the values are tested with CanvasRenderingContext2D.fillText()
 *   and the lines counted using CanvasRenderingContext2D.getImageData()
 * - and one where CanvasRenderingContext2D.measureText() is used
 *   and the values are determined from TextMetrics.actualBoundingBoxAscent
 *   and TextMetrics.actualBoundingBoxDescent
 *   the implementation of those attributes is set to arrive in Firefox 74 and
 *   is currently in Nightly
 *   (https://bugzilla.mozilla.org/show_bug.cgi?id=1102584)
 */
class IconDrawer {
    constructor(charset, font, width, height) {
        this.charset = charset;
        this.font = font;
        this.width = width;
        this.height = height;

        this.configsCache = new Map();
        this.useTextMetrics = supportsActualBoundingBoxes();
    }

    makeConfigTested(size) {
        const canvas = document.createElement("canvas");
        const height = 3 * size;
        // even if this somehow wasn't wide enought, the `maxWidth` parameter
        // to CanvasRenderingContext2D.fillText() is used anyways
        const width = 2 * this.charset.length * size;
        canvas.height = height;
        canvas.width = width;
        const ctx = canvas.getContext("2d");
        // of the total 3*size the text should mostly be placed in the middle third
        const bottom = 2 * size;
        ctx.textAlign = "center";
        let lastFilledRow;
        let fontSize;
        for (let fs = size; fs < (2 * size); fs++) {
            let newLastFilledRow;
            ctx.font = `${fs}px ${this.font}`;
            ctx.fillText(this.charset, width / 2, bottom, width);

            let filledRows = 0;
            for (let i = 0; i < height; i++) {
                const filled = ctx.getImageData(0, i, width, 1).data.some(p => p);
                if (filled) {
                    filledRows++;
                    newLastFilledRow = i;
                }
            }

            if (filledRows === size) {
                fontSize = fs;
                lastFilledRow = newLastFilledRow;
                break;
            }
            if (filledRows > size) {
                fontSize = fs - 1;
                break;
            }
            lastFilledRow = newLastFilledRow;
            ctx.clearRect(0, 0, width, height);
        }
        const bottomAdjustment = lastFilledRow - bottom + 1;
        return {bottomAdjustment, fontSize};
    }

    makeConfigMetrics(size) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let bottomAdjustment;
        let fontSize;

        for (let fs = size; fs < (2 * size); fs++) {
            ctx.font = `${fs}px ${this.font}`;
            const metrics = ctx.measureText(this.charset);
            const ascent = metrics.actualBoundingBoxAscent;
            const descent = metrics.actualBoundingBoxDescent;
            const currentSize = ascent + descent;
            if (currentSize === size) {
                fontSize = fs;
                break;
            }
            if (currentSize > size) {
                fontSize = fs - 1;
                break;
            }
            bottomAdjustment = descent;
        }
        return {bottomAdjustment, fontSize};
    }

    makeConfig(size) {
        return this.useTextMetrics ? this.makeConfigMetrics(size) : this.makeConfigTested(size);
    }

    getConfig(size) {
        let config = this.configsCache.get(size);
        if (config) {
            return config;
        }
        config = this.makeConfig(size);
        this.configsCache.set(size, config);
        return config;
    }

    draw(text, margin, color) {
        const marginCount = 1 + text.length; // one at the beginning and one after every line
        const marginSize = margin * this.height;
        const totalMargins = marginCount * marginSize;
        const lineHeight = (this.height - totalMargins) / text.length;
        const {bottomAdjustment, fontSize} = this.getConfig(lineHeight);

        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;

        const ctx = canvas.getContext("2d");
        ctx.font = `${fontSize}px ${this.font}`;
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        text.forEach((str, i) => {
            const bottom = (i + 1) * (marginSize + lineHeight) - bottomAdjustment;
            ctx.fillText(str, this.width / 2, bottom, this.width);
        });
        const data = ctx.getImageData(0, 0, this.width, this.height);
        return data;
    }
}
