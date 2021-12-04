import InteractionHandler from "./interaction-handler.js";
import flagManager from "./flag-manager.js";

Hooks.once('ready', () => {
    InteractionHandler.ready();
})

Hooks.on('canvasReady', () => {
    InteractionHandler.canvasReady();
})

Hooks.on("createTile", (document) => {
    if(!flagManager.getFlags(document)) return;
    InteractionHandler.addManagedTile(document);
});

Hooks.on("preDeleteTile", (document) => {
    if(!flagManager.getFlags(document)) return;
    InteractionHandler.removeManagedTile(document);
});