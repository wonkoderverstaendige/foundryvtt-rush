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

        this.gfx = undefined;
        this.label = undefined;

        this.__neighbors = undefined;

        // set up the per-search variables
        this.clean();

        // set up mid-term variables
        this.wipe();
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


        this.color = 0xff0000;
        this.alpha = 0.1;

        // list of time-step keyed occupancy events
        // used for weighing travel without overlap
        this.occupancy = [];
    }

    wipe() {
        this.occupied = false;  // if grid is occupied. Might allow travel, but prevent ending movement here.
        this.onPath = false;
    }

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
                //const neighborLoc = this.grid.get(this.row+a, this.col+b;
                const neighborLoc = {row: this.row + a, col: this.col + b}
                if (neighborLoc.row < 0 || neighborLoc.row >= this.grid.nrows
                    || neighborLoc.col < 0 || neighborLoc.col >= this.grid.ncols) continue;

                mergeObject(neighborLoc, gridToPos(neighborLoc));

                // check if cell can be reached
                // if (this.row === 0 && this.col === 0) {
                //     const sx = canvas.scene.dimensions.sceneX;
                //     const sy = canvas.scene.dimensions.sceneY;
                //     console.log(`Rush | ${this.center.x-sx}, ${this.center.y-sy} -> ${neighborLoc.x-sx}, ${neighborLoc.y-sy}`);
                // }
                const ray = new Ray(this.center, neighborLoc);
                const collision = canvas.walls.checkCollision(ray, {type: 'move', mode: 'any'});
                if (!collision) {
                    this.__neighbors.push(neighborLoc);
                }
            }
        }
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
        const gs = canvas.scene.grid.size;
        if (this.gfx) this.erase();
        this.gfx = new PIXI.Graphics();
        this.gfx.x = canvas.scene.dimensions.sceneX + this.col * gs;
        this.gfx.y = canvas.scene.dimensions.sceneY + this.row * gs;
        canvas.stage.addChild(this.gfx);

        this.label = new PIXI.Text(`${this.row},${this.col}`, CONSTANTS.LABEL_LOC_STYLE);
        this.label.resolution = 2;
        this.label.x = this.gfx.x + gs*0.30;
        this.label.y = this.gfx.y + gs*0.30;
        canvas.stage.addChild(this.label);
    }

    /**
     * Remove any drawing objects for this grid cell from the canvas.
     * Must be done if the cell is destroyed or the graphics are orphaned behind.
     */
    erase() {
        canvas.stage.removeChild(this.gfx);
        this.gfx.destroy();
        this.gfx = undefined;

        canvas.stage.removeChild(this.label);
        this.label.destroy();
        this.label = undefined;

    }

    /**
     * Draw a presentation of the cell state
     */
    draw() {
        // square
        const gs = canvas.scene.grid.size;

        let alpha = this.alpha;
        let color = 0x000000;
        if (this.blocked) color += 0x0000ff;
        if (this.visited) color += 0xff0000;
        if (this.occupied) color += 0x00ff00;
        if (this.onPath) {
            color = 0x0000ff;
            let alpha = 0.5;
        }


        if (!this.gfx) this.paint();
        if (this.gfx?.fill?.color !== color) {
            this.gfx.clear();
            this.gfx.beginFill(color, alpha);
            this.gfx.drawRect(0, 0, gs, gs);
            this.gfx.endFill();
            this.color = color;
        }

        this.label.text = `${this.row},${this.col}\nf=${this.f.toFixed(2)}`;

        if (!this.__neighbors.length) return;

        // Connectivity markers
        const mid = gs/2;
        for (let neighbor of this.__neighbors) {
            this.gfx.beginFill(0x00aa00, 0.2);
            this.gfx.lineStyle({width: 2, color: 0x0000ff, alpha: 0.2});
            const drow = this.row - neighbor.row;
            const dcol = this.col - neighbor.col;
            // console.log(`Rush | Connectivity Marker with drow=${drow}, dcol=${dcol}`);
            this.gfx.moveTo(mid - dcol * gs * 0.1, mid - drow * gs * 0.1);
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
     * Resetting all grid data, including per-search and between-search values for all instantiated cells
     */
    wipe() {
        console.log('Rush | Wiping grid data.');
        this.forEach((cell) => {
            cell.wipe();
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