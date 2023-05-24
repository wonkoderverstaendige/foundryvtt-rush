import Grid from "./grid.js";
import * as lib from "./lib/lib.js";
import AStar from "./lib/astar.js";
import {easeInOutCubic, posToGrid} from "./lib/lib.js";
import CONSTANTS from "./constants.js";

export const Rush = {
    ID: 'rush',
    grid: undefined,
    events: {},
    gridTypeWarned: false,

    initialize() {
        let cls;
        if (game.release.generation >= 11) {
            cls = CONFIG.Canvas.polygonBackends["move"];
        } else {
            cls = CONFIG.Canvas.losBackend;
        }
        this.testCollision = cls.testCollision.bind(cls);

        const validGrid = CONSTANTS.SUPPORTED_GRIDS.includes(canvas.grid.type)
        if (!validGrid) {
            if (!this.gridTypeWarned) {
                ui.notifications.warn('Rush only supports square grids. Things might break!');
                this.gridTypeWarned = true;
            }
        }

        this.__buildGrid();

        window.addEventListener('mousedown', this.pointerEvent.bind(this))
        Rush.debug(0, 'Initialized.');
        this.searchers = [];
    },


    async pointerEvent(event) {
        if (!(canvas.ready || canvas.tokens.active)) return;

        const hover = document.elementFromPoint(event.clientX, event.clientY);
        if (!hover || hover.id !== "board") return;
        if (!( event.ctrlKey && event.shiftKey) ) return;
        if (!canvas.tokens.controlled.length) return;

        // only double clicks?
        // if (event.detail < 2) return;
        event.preventDefault();

        const button = event.button;

        // left or right clicks only
        if (button === 0 || button === 2) {
            const tokens = canvas.tokens.controlled;
            const limitDistance = event.button === 0;  // on left click we move only as far as we can

            const target = lib.getPosOnCanvas();

            await this.moveTokens(tokens, target, limitDistance);
        }
    },
    /**
     * Use libWrapper to patch the token click handler, allowing us with held modifiers (CTRL+SHIFT) to click at
     * a grid cell target that is already occupied without including the clicked token into our selection.
     */
    patch() {
        Rush.log(0, 'Patching!');
        const tokenClick = (wrapped, ...args) => {
            const [ event ] = args;
            const originalEvent = event.data.originalEvent;
            if (originalEvent.shiftKey && originalEvent.ctrlKey) {
                Rush.debug(0, 'Overriding click on token!');
            } else {
                wrapped(...args);
            }
        };

        if (game.modules.get('lib-wrapper')?.active) {
            libWrapper.register('rush', 'Token.prototype._onClickLeft', tokenClick, 'MIXED');
            libWrapper.register('rush', 'Token.prototype._onClickLeft2', tokenClick, 'MIXED');
            libWrapper.register('rush', 'Token.prototype._onClickRight', tokenClick, 'MIXED');
            libWrapper.register('rush', 'Token.prototype._onClickRight2', tokenClick, 'MIXED');
        } else {
            Rush.log(0, 'NO LIB-WRAPPER!');
        }


    },

    log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (shouldLog) {
            console.log('Rush |', ...args);
        }
    },

    debug(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (shouldLog) {
            console.log('\u001b[31mRushDBG |\u001b[0m ', ...args);
        }
    },

    __buildGrid() {
        Rush.debug(0, `Creating Grid`);
        // we are ignoring the outer grid spaces that aren't complete. For now, at least.
        const rows = Math.floor(canvas.scene.dimensions.sceneHeight / canvas.scene.grid.size);
        const cols = Math.floor(canvas.scene.dimensions.sceneWidth / canvas.scene.grid.size);

        Rush.debug(0, `Mapsize ${rows} x ${cols}`)
        this.grid = new Grid(rows, cols);

        // DEBUG ONLY: Instantiate all cells. Disable! Very heavy on big maps.
        // this.grid.forAll(() => { });
    },

    async moveTokens(tokens, target, limitDistance=false) {
        if (!(tokens || tokens.length)) return;

        // todo: pop up a configuration dialog for the move instead
        // that offers a few defaults, and customization
        // const pos_canvas = lib.getPosOnCanvas();
        const pos_canvas = target;
        const animations = [];

        // start a new search
        // because we wipe here, we don't need the listeners for the wall events!
        this.grid.wipe();

        // token target position
        const target_token_pos = lib.snapPosToGrid(pos_canvas.x - canvas.scene.grid.size / 2,
            pos_canvas.y - canvas.scene.grid.size / 2, 1);
        const target_center_pos = {
            x: target_token_pos.x + canvas.scene.grid.size / 2,
            y: target_token_pos.y + canvas.scene.grid.size / 2
        }

        Rush.debug(0, `Target Pos: ${target_token_pos.x}, ${target_token_pos.y}`);
        Rush.debug(0, `Target Center Pos: ${target_center_pos.x}, ${target_center_pos.y}`);

        const gridEnd = lib.posToGrid(pos_canvas.x, pos_canvas.y);

        // reject invalid target positions
        if (!this.grid.valid(gridEnd.row, gridEnd.col)) {
            this.log(false, "Invalid target position!");
            return;
        }

        // mark target as occupied? // todo: should be a check!
        // this.grid.get(gridEnd.row, gridEnd.col).occupied = true;

        for (let token of tokens) {
            const Searcher = new AStar(this.grid);
            this.searchers.push(Searcher);

            // TODO: Doesn't use center but upper left corner!
            const gridStart = lib.posToGrid(token.document.x + canvas.scene.grid.size / 2,
                token.document.y + canvas.scene.grid.size / 2);

            // check if this would be a valid straight move without wall collisions
            const collision = token.checkCollision(target_center_pos);

            // Mark cells occupied by a token // TODO smarts!
            for (let tn of canvas.tokens.placeables) {
                const pos = posToGrid(tn.x, tn.y);
                if (pos.row === gridStart.row && pos.col === gridStart.col) continue;
                // Rush.debug(false, `Occupied: ${pos.row}, ${pos.col}.`);
                this.grid.get(pos.row, pos.col).occupied = true;
            }

            this.debug(false, `Search start: ${gridStart.row}, ${gridStart.col} to ${gridEnd.row}, ${gridEnd.col}. Straight path valid: ${collision ? '❌' : '✔'}`);
            const path = Searcher.search(gridStart, gridEnd);
            this.debug(false, `Found path: ${path.length ? `✔ with ${path.length} steps` : '❌'}`);

            // Skip the token if no valid path could be obtained
            if (!path.length) continue;

            // mark stop position as occupied so next in group don't run there
            const stop = path[path.length-1];
            stop.occupied = true;
            animations.push(this.animate(token, path, limitDistance));
        }

        let debug = game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (debug) {
            this.grid.visualize();
        }

        await Promise.all(animations);

    },

    async animate(token, path, limit=false) {
        // do some hand-waving for the speed.
        // check if walking speed, flying speed, burrow speed, take the maximum?
        // else use a 30 ft speed as default
        // todo: make speed part of popup dialog, i.e. move in pack or separate by speed
        const actor = token.actor;

        const moveAnimFactor = game.settings.get('rush', 'move-animation-factor');
        const dashAnimFactor = game.settings.get('rush', 'move-animation-factor');

        let maxDistance = Infinity;
        let moveSpeed = 30;

        // are we using dnd5e?
        if (game.system.id === 'dnd5e') {
            const speeds = Object.values(actor.system.attributes.movement).filter((v) => typeof(v) == 'number')
            moveSpeed = Math.max(...speeds);
            maxDistance = limit ? 2 * moveSpeed : Infinity;
        }

        let [simplePath, totalDistance] = AStar.reducePath(path, maxDistance);

        const doDash = game.settings.get('rush', 'do-dash');
        const dash = doDash ? totalDistance > moveSpeed : false;

        // todo: how to handle actors with 0 speed? Cancel or do slowly?
        if (moveSpeed <= 0) return;
        // moveSpeed = Math.max(5, moveSpeed);

        moveSpeed = Math.min(500, moveSpeed);

        Rush.debug(0, `DASH: ${dash}, ${totalDistance}`);

        let step = 0;
        for (let position of simplePath) {
            // animate the token
            const targetCell = this.grid.get(position.row, position.col);
            const targetPos = lib.snapPosToGrid(targetCell.center.x, targetCell.center.y);
            const distance = Math.sqrt((token.center.x - targetPos.x)**2 + (token.center.y-targetPos.y)**2);
            if (distance <= 0) continue;

            const distanceSquares = distance/canvas.scene.grid.size; //*canvas.scene.grid.distance; <--feet

            const duration = 150 + distanceSquares * (1000/moveSpeed) * (dash ? dashAnimFactor: moveAnimFactor);
            // console.log(`Step ${step}: ${duration.toFixed(0)} ms, ${distanceSquares.toFixed(2)}`);
            if (token.document.hidden) {
                await token.document.update({hidden: false});
            }
            await token.document.update({x: targetPos.x - token.w / 2, y: targetPos.y - token.h / 2},
                {animation: {duration: duration, easing: dash ? 'easeInOutCubic' : 'easeInOutCosine'}});
            await CanvasAnimation.getAnimation(token.animationName)?.promise;
            step++;
        }
    }
}
