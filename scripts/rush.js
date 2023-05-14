import Grid from "./grid.js";
import * as lib from "./lib/lib.js";
import AStar from "./lib/astar.js";

export const Rush = {
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

        for (let token of tokens) {
            const Searcher = new AStar(this.grid);
            this.searchers.push(Searcher);

            // token target position
            const target_token_pos = lib.snapPosToGrid(pos_canvas.x - canvas.scene.grid.size / 2,
                pos_canvas.y - canvas.scene.grid.size / 2, 1);
            const target_center_pos = {
                x: target_token_pos.x + canvas.scene.grid.size / 2,
                y: target_token_pos.y + canvas.scene.grid.size / 2
            }

            console.log(`Rush | Target Pos: ${target_token_pos.x}, ${target_token_pos.y}`);
            console.log(`Rush | Target Center Pos: ${target_center_pos.x}, ${target_center_pos.y}`);

            // TODO: Doesn't use center but upper left corner!
            const gridStart = lib.posToGrid(token.document.x + canvas.scene.grid.size / 2,
                token.document.y + canvas.scene.grid.size / 2);
            const gridEnd = lib.posToGrid(pos_canvas.x, pos_canvas.y);

            if (!this.grid.valid(gridStart.row, gridStart.col) || !this.grid.valid(gridEnd.row, gridEnd.col)) return;

            // check if this would be a valid straight move without wall collisions
            const collision = token.checkCollision(target_center_pos);
            console.debug(`Rush | Start: ${gridStart.row}, ${gridStart.col} to ${gridEnd.row}, ${gridEnd.col}. Valid path: ${collision ? '❌' : '✔'}`);


            //const path = [gridStart, gridEnd];  // {row: 0, col: 1}, {row: 2, col: 1}, {row: 4, col: 3}
            const path = Searcher.search(gridStart, gridEnd);
            animations.push(this.animate(token, path));
        }

        await Promise.all(animations);
        this.grid.visualize();

    },

    async animate(token, path) {
        for (let position of path) {
            // animate the token
            const targetCell = this.grid.get(position.row, position.col);
            const targetPos = lib.snapPosToGrid(targetCell.center.x, targetCell.center.y);
            await token.document.update({x: targetPos.x - token.w / 2, y: targetPos.y - token.h / 2},
                {animation: {duration: 600}});
            await CanvasAnimation.getAnimation(token.animationName)?.promise;
        }
    }
}

