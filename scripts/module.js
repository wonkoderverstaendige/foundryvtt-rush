import { Rush } from "./rush.js";

Hooks.once('init', function () {
    window.Rush = Rush;
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Rush.ID);
});

Hooks.on('ready', async function () {
    console.log('Rush | Begin Initialization...');
    window.Rush.initialize();

    // todo: don't trigger while on walls layer! Set to dirty, and reset on layer change
    // set uncertain flag, then hook layer change and look at flag
    Hooks.on('createWall', () => { window.Rush.grid.reset() });
    Hooks.on('updateWall', () => { window.Rush.grid.reset() });
    Hooks.on('deleteWall', () => { window.Rush.grid.reset() });

    // todo: reset all on scene change
    // todo: check for active scene

});
