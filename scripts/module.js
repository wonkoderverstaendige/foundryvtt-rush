import { Rush } from "./rush.js";
import CONSTANTS from "./constants.js";

Hooks.once('init', function () {
    window.Rush = Rush;
})

Hooks.on('ready', async function () {
    console.log('Rush | Begin Initialization...');
    window.Rush.initialize();

    Hooks.on('createWall', () => { window.Rush.grid.reset() });
    Hooks.on('updateWall', () => { window.Rush.grid.reset() });
    Hooks.on('deleteWall', () => { window.Rush.grid.reset() });
});


