/* globals defaultOptions, getOptions, onError */
"use strict";

function restoreOptions(opt) {
    switch (opt.scope) {
    case "window":
        document.getElementById("scope_window").checked = true;
        break;
    case "global":
        document.getElementById("scope_global").checked = true;
        break;
    default:
        onError("invalid scope");
    }

    switch (opt.displayMode) {
    case "icon":
        document.getElementById("dm_icon").checked = true;
        break;
    case "badge":
        document.getElementById("dm_badge").checked = true;
        break;
    default:
        onError("invalid displayMode");
    }

    document.getElementById("badgeBg").value = opt.badgeBg;

    document.getElementById("iconDimension").value = opt.iconDimension;

    document.getElementById("iconFont").value = opt.iconFont;

    document.getElementById("iconColor").value = opt.iconColor;

    document.getElementById("iconFontMultiplier").value = opt.iconFontMultiplier;

    ["dm_icon", "dm_badge"].forEach(i => {
        document.getElementById(i).addEventListener("change", updateDisabled);
    });
    updateDisabled();
}

function restoreSavedOptions() {
    getOptions().then(restoreOptions);
}

function updateDisabled() {
    const dm_icon = document.getElementById("dm_icon").checked;
    const dm_badge = document.getElementById("dm_badge").checked;

    document.getElementById("badgeBg").disabled = !dm_badge;

    document.getElementById("iconDimension").disabled = !dm_icon;
    document.getElementById("iconFont").disabled = !dm_icon;
    document.getElementById("iconColor").disabled = !dm_icon;
    document.getElementById("iconFontMultiplier").disabled = !dm_icon;
    document.getElementById("openFontDialog").disabled = !dm_icon;
}

function saveOptions() {
    let scope = document.querySelector("input[name='scope']:checked").value;

    let displayMode = document.querySelector(
        "input[name='displayMode']:checked"
    ).value;

    const entered = {
        "scope": scope,
        "displayMode": displayMode,
        "badgeBg": document.getElementById("badgeBg").value,
        "iconDimension": parseInt(document.getElementById("iconDimension").value, 10),
        "iconFont": document.getElementById("iconFont").value,
        "iconColor": document.getElementById("iconColor").value,
        "iconFontMultiplier": parseFloat(document.getElementById("iconFontMultiplier").value),
    };

    let promises = [];
    let changed = Object();
    for (let i in entered) {
        if (entered[i] === defaultOptions[i]) {
            promises.push(browser.storage.local.remove(i));
        } else {
            changed[i] = entered[i];
        }
    }
    promises.push(browser.storage.local.set(changed));
    return Promise.all(promises);
}

function reloadExt() {
    return saveOptions().then(
        () => browser.runtime.reload(),
        onError
    );
}

function openFontDialog() {
    document.getElementById("fontDialog").style.display = "block";
}

function closeFontDialog() {
    document.getElementById("fontDialog").style.display = "";
}

function fontDialogApply() {
    const font_name = document.getElementById("fontName").value;
    let font_family = document.querySelector(
        "input[name='font-family']:checked"
    );

    let font_families = [];
    if (font_name) {
        if (font_name.includes('"')) {
            window.alert("font name can't include quotes (\")");
            return;
        }
        font_families.push(`"${font_name}"`);
    }
    if (font_family !== null) {
        font_families.push(font_family.value);
    }
    let font = font_families.join(", ");

    document.getElementById("iconFont").value = font;

    closeFontDialog();
}

document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("reload").addEventListener("click", reloadExt);
document.getElementById("openFontDialog").addEventListener("click", openFontDialog);
document.getElementById("fontDialogCancel").addEventListener("click", closeFontDialog);
document.getElementById("fontDialogApply").addEventListener("click", fontDialogApply);
document.addEventListener("DOMContentLoaded", restoreSavedOptions);
