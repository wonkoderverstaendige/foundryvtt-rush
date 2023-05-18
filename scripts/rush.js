import Grid from "./grid.js";
import * as lib from "./lib/lib.js";
import AStar from "./lib/astar.js";
import {posToGrid} from "./lib/lib.js";

export const Rush = {
    ID: 'rush',
    grid: undefined,

    initialize() {
        this.__buildGrid();

        window.addEventListener("mousedown", async (event) => {
            if (!canvas.ready) return;
            const hover = document.elementFromPoint(event.clientX, event.clientY);
            if (!hover || hover.id !== "board") return;

            const button = event.button;
            if (!(button === 0 || button === 2)) return;
            if (button === 0) {

            }
            if (button === 2) {
                if (!( event.ctrlKey && event.shiftKey) ) return;
                await this.moveSeeker(event);

            }
        });

        console.log('Rush | Initialized.');
        this.searchers = [];
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
        console.log(`Rush | Creating Grid`);
        // we are ignoring the outer grid spaces that aren't complete. For now, at least.
        const rows = Math.floor(canvas.scene.dimensions.sceneHeight / canvas.scene.grid.size);
        const cols = Math.floor(canvas.scene.dimensions.sceneWidth / canvas.scene.grid.size);

        console.log(`Rush | Mapsize ${rows} x ${cols}`)
        this.grid = new Grid(rows, cols);

        // DEBUG ONLY: Instantiate all cells. Disable! Very heavy on big maps.
        // this.grid.forAll(() => { });
    },

    async moveSeeker(event) {
        const tokens = canvas.tokens.controlled; //get("8spYRbXZV2afT389");
        const pos_canvas = lib.getPosOnCanvas();

        const animations = [];

        this.grid.wipe();

        // token target position
        const target_token_pos = lib.snapPosToGrid(pos_canvas.x - canvas.scene.grid.size / 2,
            pos_canvas.y - canvas.scene.grid.size / 2, 1);
        const target_center_pos = {
            x: target_token_pos.x + canvas.scene.grid.size / 2,
            y: target_token_pos.y + canvas.scene.grid.size / 2
        }

        console.log(`Rush | Target Pos: ${target_token_pos.x}, ${target_token_pos.y}`);
        console.log(`Rush | Target Center Pos: ${target_center_pos.x}, ${target_center_pos.y}`);

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

            console.debug(`Rush | Start: ${gridStart.row}, ${gridStart.col} to ${gridEnd.row}, ${gridEnd.col}. Valid path: ${collision ? '❌' : '✔'}`);
            const path = Searcher.search(gridStart, gridEnd);

            // mark stop position as occupied so next in group don't run there
            const stop = path[path.length-1];
            stop.occupied = true;
            animations.push(this.animate(token, path));
        }

        let debug = game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (debug) {
            this.grid.visualize();
        }

        await Promise.all(animations);

    },

    async animate(token, path) {
        // do some hand-waving for the speed.
        // check if walking speed, flying speed, burrow speed, take the maximum?
        // else use a 30 ft speed as default
        // todo: make speed part of popup dialog, i.e. move in pack or separate by speed
        const actor = token.actor;
        const speeds = Object.values(actor.system.attributes.movement).filter((v) => typeof(v) == 'number')
        const moveSpeed = Math.max(...speeds);

        let [simplePath, totalDistance] = AStar.reducePath(path, 2 * moveSpeed);
        const dash = totalDistance > moveSpeed;
        console.log(`DASH: ${dash}, ${totalDistance}`);
        console.log(simplePath);

        for (let position of simplePath) {
            // animate the token
            const targetCell = this.grid.get(position.row, position.col);
            const targetPos = lib.snapPosToGrid(targetCell.center.x, targetCell.center.y);
            const distance = Math.sqrt((token.x - targetPos.x)**2 + (token.y-targetPos.y)**2);

            // todo: base animation on distance in feet, or generic squares? Must look nice, not be "realistic"
            const distanceSquares = distance/canvas.scene.grid.size //*canvas.scene.grid.distance; <--feet

            const duration = 150 + distanceSquares * moveSpeed * (dash ? 4: 8); // ms/square
            if (token.document.hidden) {
                await token.document.update({hidden: false});
            }
            await token.document.update({x: targetPos.x - token.w / 2, y: targetPos.y - token.h / 2},
                {animation: {duration: duration}});
            await CanvasAnimation.getAnimation(token.animationName)?.promise;
        }
    }
}
