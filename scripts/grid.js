import CONSTANTS from "./constants.js";
import { gridToPos } from "./lib/lib.js";

class Cell {
    constructor(grid, row, col, weight = 0, blocked = false) {
        this.grid = grid;
        this.row = row;
        this.col = col;
        const gs = canvas.scene.grid.size;
        this.center = {
            x: this.col * gs + canvas.scene.dimensions.sceneX + gs / 2,
            y: this.row * gs + canvas.scene.dimensions.sceneY + gs / 2
        }
        this.blocked = blocked;

        this.color = 0xff0000;
        this.alpha = 0.1;
        this.gfx = undefined;

        this.__neighbors = undefined;

        // set up the per-search variables
        this.clean();
        this.probeNeighborhood();
    }

    /**
     * Reset the per-search grid data
     */
    clean() {
        this.parent = null;     // preceding node on path to target
        this.dirty = false;     // out-set member flag
        this.closed = false;
        this.visited = false;   // been visited before, must check scoring
        this.f = 0;             // Total score
        this.g = 0;             // Graph score
        this.h = 0;             // Heuristic score
        this.weight = 1;        // cost of traversal here
        this.occupied = false;  // if grid is occupied. Might allow travel, but prevent ending movement here.

        // list of time-step keyed occupancy events
        // used for weighing travel without overlap
        this.occupancy = [];
    }
    //
    // get f () {
    //     return this.g + this.h;
    // }

    /**
     * Calculate the reachable neighbors for this cell based on the surrounding grid cells.
     * Note this uses a light touch - that is, it does not instantiate neighboring cells. Probing
     * is based on the cell coordinates, not any other cell data.
     */
    probeNeighborhood() {
        this.__neighbors = [];

        for (let a of CONSTANTS.GRID_DIRECTIONS) {
            for (let b of CONSTANTS.GRID_DIRECTIONS) {

                // ignore self
                if (!(a || b)) continue;
                //const neighbor = this.grid.get(this.row+a, this.col+b;
                const neighbor = {row: this.row + a, col: this.col + b}
                if (neighbor.row < 0 || neighbor.row >= this.grid.nrows
                    || neighbor.col < 0 || neighbor.col >= this.grid.ncols) continue;

                mergeObject(neighbor, gridToPos(neighbor));

                // check if cell can be reached
                // if (this.row === 0 && this.col === 0) {
                //     const sx = canvas.scene.dimensions.sceneX;
                //     const sy = canvas.scene.dimensions.sceneY;
                //     console.log(`Rush | ${this.center.x-sx}, ${this.center.y-sy} -> ${neighbor.x-sx}, ${neighbor.y-sy}`);
                // }
                const ray = new Ray(this.center, neighbor);
                const collision = canvas.walls.checkCollision(ray, {type: 'move', mode: 'any'});
                if (!collision) {
                    this.__neighbors.push(neighbor);
                }
            }
        }
        this.dirty = true;
    }

    get neighbors() {
        return this.__neighbors;
    }

    /**
     * Add a graphical representation to the canvas.
     */
    paint() {
        // TODO: We should clone a template square, instead of making a new one each time.
        // Especially when we have large maps, we end with >100k graphics objects...
        // Better yet, this should just be a few RenderTextures we draw into a single time each.
        if (this.gfx) this.erase();
        this.gfx = new PIXI.Graphics();
        this.gfx.x = canvas.scene.dimensions.sceneX + this.col * canvas.scene.grid.size;
        this.gfx.y = canvas.scene.dimensions.sceneY + this.row * canvas.scene.grid.size;
        canvas.stage.addChild(this.gfx);
    }

    /**
     * Remove any drawing objects for this grid cell from the canvas.
     * Must be done if the cell is destroyed or the graphics are orphaned behind.
     */
    erase() {
        canvas.stage.removeChild(this.gfx);
        this.gfx.destroy();
    }

    /**
     * Draw a presentation of the cell state
     */
    draw() {
        const gs = canvas.scene.grid.size;

        if (!this.gfx) this.paint();
        if (this.gfx?.fill?.color !== this.color) {
            this.gfx.clear();
            this.gfx.beginFill(this.color, this.alpha);
            this.gfx.drawRect(0, 0, gs, gs);
            this.gfx.endFill();
        }

        if (!this.__neighbors.length) return;
        const mid = gs/2;
        for (let neighbor of this.__neighbors) {
            this.gfx.beginFill(0x00aa00, 0.2);
            this.gfx.lineStyle({width: 2, color: 0x0000ff, alpha: 0.2});
            const drow = this.row - neighbor.row;
            const dcol = this.col - neighbor.col;
            // console.log(`Rush | Connectivity Marker with drow=${drow}, dcol=${dcol}`);
            this.gfx.moveTo(mid - dcol * gs * 0.0, mid - drow * gs * 0.0);
            this.gfx.lineTo(mid - dcol * gs * 0.5, mid - drow * gs * 0.5);

            // this.gfx.lineTo(gs/2 - drow * gs * 0.1, gs/2 - drow * gs * 0.4);
            // this.gfx.lineTo(gs/2 + drow * gs * 0.1, gs/2 - drow * gs * 0.4);
            // this.gfx.lineTo(gs/2 - drow * gs * 0.1, gs/2 - drow * gs * 0.4);
            this.gfx.endFill();
        }

    }

}

export default class Grid {
    /**
     * Data structure for the grid and traversal graph.
     * @param rows Number of rows
     * @param cols Number of columns
     */
    constructor(rows, cols) {
        this.__nrows = Math.abs(rows);
        this.__ncols = Math.abs(cols);
        this.f = 0;
        this.g = 0;
        this.h = 0;

        this.init();
    }

    /**
     * Return number of rows in the grid
     * @returns {number}
     */
    get nrows() {
        return this.__nrows;
    }

    /**
     * Return number of columns in the grid
     * @returns {number}
     */
    get ncols() {
        return this.__ncols;
    }

    /**
     * Set cell at row, column
     * @param r
     * @param c
     * @param val
     */
    set(r, c, val) {
        this.__cells[r][c] = val;
    }

    /**
     * Accesses a cell in the grid based on row and column. Locations are 0-indexed. Instantiates cells on demand.
     * @param row Row
     * @param col Column
     */
    get(row, col) {
        // bail if out of bounds
        if (isNaN(row) || row < 0 || row >= this.__nrows) return;
        if (isNaN(col) || col < 0 || col >= this.__ncols) return;
        if (!Array.isArray(this.__cells[row])) console.error('Rush | Cell array access violation.');  // when is this ever the case if bound_checked?
        let cell = this.__cells[row][col];
        if (!cell) {
            cell = new Cell(this, row, col);
            this.__cells[row][col] = cell;
        }
        return cell;
    }

    /**
     * Check if {row, column} grid position is out of bounds.
     * @param row
     * @param col
     * @returns {boolean}
     */
    valid(row, col) {
        return !(row < 0 || row >= this.__nrows || col < 0 || col >= this.__nrows);
    }

    /**
     *
     * @param callback Function to call on all elements of the grid array.
     */
    forEach(callback) {
        this.__cells.forEach((row) => {
            row.forEach((cell) => {
                return callback(cell);
            })
        })
    }

    /**
     * Apply callback function to all grid positions, instead of just actually instantiated cells.
     * @param callback
     */
    forAll(callback) {
        for (let row=0; row < this.__nrows; row++) {
            for (let col=0; col < this.__ncols; col++) {
                callback(this.get(row, col));
            }
        }
    }

    /**
     *
     * @param lazy Instantiate grid cells on demand.
     */
    init(lazy = true) {
        this.__cells = [...Array(this.__nrows)].map(() => Array(this.__ncols));

        // do not instantiate the whole set of cells, do that on demand
        if (lazy) return;

        // instantiate all cells
        for (let row = 0; row < this.__nrows; row++) {
            for (let col = 0; col < this.__ncols; col++) {
                this.__cells[row][col] = new Cell(this, row, col);
            }
        }
    }

    /**
     * Reset the grid. Required for example when the map changes, i.e. walls are changed. Invalidates all known
     * map graph data, as we can't know what has changed. Hooks: ["onWallChange", "onWallCreate", "onWallDelete"]
     */
    reset() {
        console.log('Rush | Resetting grid data.');
        this.forEach((cell) => {
            cell.probeNeighborhood();
            cell.clean();
        })
    }

    /**
     * Reset per-search data like weights or cost function intermediate values for all instantiated cells
     * in the grid.
     */
    clean() {
        console.log('Rush | Cleaning grid data.');
        this.forEach((cell) => {
            cell.clean();
        })
    }

    /**
     * Draw all currently instantiated cells in their state
     */
    visualize() {
        this.forEach((cell) => {
            cell.draw();
        })
    }
}