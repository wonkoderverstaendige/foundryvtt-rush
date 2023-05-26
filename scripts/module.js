import { Rush } from "./rush.js";
import { RushSettings } from './ui/settings.js';
import CONSTANTS from "./constants.js";
import * as lib from "./lib/lib.js";

Hooks.once('init', function () {
    window.Rush = Rush;
    window.RushConstants = CONSTANTS;
    Rush.patch();
    CanvasAnimation.easeInOutCubic = lib.easeInOutCubic;
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Rush.ID);
});

Hooks.on('ready', async function () {
    if (!game.user.isGM) return;

    RushSettings.init();

    // NOTE: Because we grid.wipe() on rush.moveSeeker() we can ignore all wall related updates for now

/*    // wall changes on the WallsLayer deferred to not bog things down
    // else we'll run into conflict with other modules that allow rapid wall changes
    // outside the WallsLayer, like placing templated map elements etc.
    Hooks.on('createWall', wallChange);
    Hooks.on('updateWall', wallChange);
    Hooks.on('deleteWall', wallChange);

    Hooks.on('deactivateWallsLayer', (wl) => {
        if (window.Rush.grid.dirty) {
            Rush.debug(0, `Grid is dirty! Full grid wipe!`);
            window.Rush.grid.wipe();
        } else {
            Rush.debug(0, `Grid is clean.`);
        }
    })*/

});

Hooks.on('canvasReady', async function () {
    if (!game.user.isGM) return;
    console.log('Rush | Initialization...');
    window.Rush.initialize();
});


Hooks.on('combatRound', async (combat) => {
    Rush.debug(0, 'Clearing Dash effects after combat round.');
    await clearDashStatuses(combat);
});

Hooks.on('deleteCombat', async (combat) => {
    Rush.debug(0, 'Clearing Dash after combat.');
    await clearDashStatuses(combat);
});

async function clearDashStatuses(combat) {
    if (!game.user.isGM) return;


    // todo: beware combats on other scenes
    if (canvas.scene.id !== combat._source.scene) return;

    const effect = CONSTANTS.RUSH_EFFECT;
    for (let token of canvas.tokens.placeables) {
        if (token.actor.effects.find(e => e.label === effect.label)) {
            await token.toggleEffect(effect);
        }
    }
}

// function wallChange() {
//     if (canvas.walls.active) {
//         // defer grid updates until we leave
//         Rush.debug(0, `Defer wall change triggered grid wipe.`);
//         window.Rush.grid.dirty = true;
//     } else {
//         // walls changed e.g. via door open, macro etc.
//         window.Rush.grid.reset();
//     }
// }
// function resetRush() {
//     window.Rush.reset();
// }