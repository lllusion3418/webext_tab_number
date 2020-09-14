/* globals getOptions, onError, supportsTabReset */
"use strict";

function restoreOptions(opt) {
    switch (opt.scope) {
        case "window":
            document.getElementById("scope_window").checked = true;
            break;
        case "global":
            document.getElementById("scope_global").checked = true;
            break;
        case "both":
            document.getElementById("scope_both").checked = true;
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

    document.getElementById("iconMargin").value = opt.iconMargin;

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
    document.getElementById("iconMargin").disabled = !dm_icon;
    document.getElementById("openFontDialog").disabled = !dm_icon;

    const both = document.getElementById("scope_both");
    both.disabled = !dm_icon;
    if (both.checked && dm_badge) {
        document.getElementById("scope_window").checked = true;
        browser.storage.local.set({"scope": "window"});
    }
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
        "input[name='font-family']:checked",
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
    browser.storage.local.set({"iconFont": font});

    closeFontDialog();
}

async function initSaveEvents() {
    const noReload = await supportsTabReset();
    const reloadMsg =
        "Extension reload necessary due to browser version.\n" +
        "Reload Page (F5) if formatting is messed up";
    document.querySelectorAll("input[name='scope']").forEach(element => {
        element.addEventListener("input", e => {
            if (!e.target.checked) return;
            let reload = false;
            if ((!noReload) && e.target.value === "global") {
                const ok = window.confirm(reloadMsg);
                if (!ok) {
                    restoreSavedOptions();
                    return;
                }
                reload = true;
            }
            let p = browser.storage.local.set({"scope": e.target.value});
            if (reload) {
                p.then(() => browser.runtime.reload());
            }
        });
    });
    document.querySelectorAll("input[name='displayMode']").forEach(element => {
        element.addEventListener("input", e => {
            if (!e.target.checked) return;
            let reload = false;
            if (!noReload) {
                const ok = window.confirm(
                    reloadMsg,
                );
                if (!ok) {
                    restoreSavedOptions();
                    return;
                }
                reload = true;
            }
            let p = browser.storage.local.set({"displayMode": e.target.value});
            if (reload) {
                p.then(() => browser.runtime.reload());
            }
        });
    });
    document.getElementById("badgeBg").addEventListener("input", e => {
        browser.storage.local.set({"badgeBg": e.target.value});
    });
    document.getElementById("iconDimension").addEventListener("input", e => {
        browser.storage.local.set({"iconDimension": parseInt(e.target.value, 10)});
    });
    document.getElementById("iconFont").addEventListener("input", e => {
        browser.storage.local.set({"iconFont": e.target.value});
    });
    document.getElementById("iconColor").addEventListener("input", e => {
        browser.storage.local.set({"iconColor": e.target.value});
    });
    document.getElementById("iconMargin").addEventListener("input", e => {
        browser.storage.local.set({"iconMargin": parseFloat(e.target.value)});
    });
}

document.getElementById("openFontDialog").addEventListener("click", openFontDialog);
document.getElementById("fontDialogCancel").addEventListener("click", closeFontDialog);
document.getElementById("fontDialogApply").addEventListener("click", fontDialogApply);
document.addEventListener("DOMContentLoaded", restoreSavedOptions);

initSaveEvents();
