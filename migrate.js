export { migrate };

async function migrateMargin() {
    const cfg = await browser.storage.local.get("iconFontMultiplier");
    if ("iconFontMultiplier" in cfg) {
        const margin = (1 - cfg.iconFontMultiplier) * 50;
        await browser.storage.local.set({iconMargin: margin});
        await browser.storage.local.remove("iconFontMultiplier");
    }
}

async function migrate() {
    await migrateMargin();
}
