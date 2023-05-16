import BinaryHeap from "./binaryheap.js";

export default class AStar {
    /**
     * Search through Grid graph with A*
     *
     * @param {Grid} grid
     * @param {Object} options
     * @param {Function} [options.heuristic] Optional alternative heuristic function
     */
    constructor(grid, options = {}) {
        console.log('Rush | Initiating A* Search');
        this.options = options;
        this.grid = grid;
        this.heuristics = {
            'manhattan': this.manhattan,
            'chebyshev': this.chebyshev,
            'octile': this.octile,
            'euclidean': this.euclidean
        }

        this.heap = new BinaryHeap((node) => {
            return node.f;
        });
    }

    /**
     *
     * @param start Grid location to start search from
     * @param end Grid location to search path towards
     * @param heuristic Name of heuristic function from {manhattan, euclidean, chebyshev, octile}
     * @param closeIn Try to get as close as possible even if exact target is unreachable
     */
    search(start, end, heuristic = 'octile', closeIn = true) {
        this.grid.clean();
        this.start = this.grid.get(start.row, start.col);
        this.end = this.grid.get(end.row, end.col);

        // choose our heuristic function
        const heuristicFun = this.heuristics[heuristic];

        this.start.h = heuristicFun(this.start, this.end);
        console.log(`Rush | Searching from ${this.start.row},${this.start.col} to ${this.end.row}, ${this.end.col}.`);

        this.heap.push(this.start);

        let closestNode = this.start;  // node to end on if we can't quite get there
        let step = 0;
        while (this.heap.size > 0) {
            step ++;
            // console.log(`Rush | Heap size = ${this.heap.size}`);
            // get next node to process
            let currentNode = this.heap.pop();
            // console.log(`Rush | Current cell: ${currentNode.row},${currentNode.col}`);

            // termination test for complete path
            if (currentNode === this.end) {
                // console.log(`Rush | Current cell is end. Completed path.`);
                console.log(`Rush | Search terminated after ${step} steps at End.`)
                return this.pathFrom(currentNode);
            }

            // non-termination branch -- close node and check its neighbors
            currentNode.closed = true;

            // we've checked here already
            currentNode.neighbors.forEach((neighborLoc) => {
                // get (and instantiate if needed!) neighbor cell
                const neighbor = this.grid.get(neighborLoc.row, neighborLoc.col);

                // cell neighbor probing happens without touching actual neighboring cells.
                // Here we need to check a few extra things that weren't available at the time.
                // E.g. occupancy
                // NOTE 5e: Move through friendly creature, but enemy only if two sizes in difference.
                //          Either way counts as difficult terrain.
                if (neighbor.closed || neighbor.blocked || neighbor.occupied) {
                    // console.log(`Rush | Rejecting neighbor: ${neighbor.row},${neighbor.col}`);
                    return;
                }

                const gScore = currentNode.g + this.cost(currentNode, neighbor);
                // console.log(`Rush | Neighbor ${neighbor.row},${neighbor.col} w/ gScore=${gScore}`);

                const wasVisited = neighbor.visited; // needed after check!

                if (!wasVisited || gScore < neighbor.g) {
                    // Found new best path to node.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristicFun(neighbor, end);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;

                    // check if neighbor is closer, or equally close but has cheaper path
                    // this will be useful for surrounding tokens later on
                    if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                        closestNode = neighbor;
                    }
                }

                // this.grid.visualize();

                if (!wasVisited) {
                    this.heap.push(neighbor);
                } else {
                    this.heap.rethink(neighbor);
                }

            });
        }

        console.log(`Rush | Search terminated after ${step} steps at closest.`)
        if (closeIn) {
            return this.pathFrom(closestNode);
        }
        return [];
    }

    /**
     * Given chaining list of cells, build the path and return in start->end order.
     * As the path contains all cells, the resulting animation would be very stuttering. We want to optionall
     * combine cells that are within LOS into a single move.
     * @param cell
     * @param simplify
     * @returns {*[]}
     */
    pathFrom(cell, simplify=true, maxDistance=Infinity) {
        // console.log(`Rush | Build path from cell ${cell.row},${cell.col}`);
        let current = cell;
        const path = [];

        while (current.parent) {
            current.onPath = true;
            path.push(current);
            current = current.parent;
        }
        path.push(this.start);
        this.start.onPath = true;

        // have the path go from start->end
        path.reverse();

        // console.log(`Rush | Has Start: ${path.indexOf(this.start)}, Has End: ${path.indexOf(this.end)}`);

        if (simplify) {
            return this.reducePath(path);
        } else {
            return path;
        }
    }

    /**
     * Reduce path of single steps into a path of LoS connected segments. The order is critical, as we need to
     * check if one-sided walls are passable!
     *
     * @param path Array of steps, start to end
     * @returns {*[]} Reduced array, start to end
     */
    reducePath(path) {
        const simplePath = [];

        let current = path.shift();
        simplePath.push(current);
        let previous = current;
        let next = current;

        while (path.length) {
            next = path.shift();
            if (next.occupied) {
                // Rush.debug(false, `Cell ${next.row}, ${next.col} occupied!`);
            } else {
                // Rush.debug(false, `Cell ${next.row}, ${next.col} not Occupied!`);
            }
            const ray = new Ray(current.center, next.center);
            if (next.occupied || canvas.walls.checkCollision(ray, {type: 'move', mode: 'any'})) {
                simplePath.push(previous);
                current = previous;
            }
            previous = next;
        }
        simplePath.push(next);
        console.log(`Rush | Simplified path of length: ${simplePath.length}`);
        return simplePath;
    }

    cost(start, end) {
        return this.euclidean(start, end) * start.weight;
    }

    /**
     * Boring old manhattan distance, taking only cardinal direction moves into account.
     * On open maps can lead to very wide search.
     * @param start
     * @param end
     * @returns {number}
     */
    manhattan(start, end) {
        const dx = Math.abs(start.col - end.col);
        const dy = Math.abs(start.row - end.row);
        return dx + dy;
    }

    /**
     * Chebyshev distance metric, diagonal moves count same as cardinal directions.
     * Equivalent of the 5/5/5 movement rule for dnd5e
     *
     * see http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
     * @param start
     * @param end
     * @param D
     * @param D2
     */
    chebyshev(start, end, D = 1, D2 = 1) {
        const dr = Math.abs(end.row - start.row);
        const dc = Math.abs(end.col - start.col);

        return D * Math.max(dc, dr) + (D2 - D) * Math.min(dc, dr);
    }

    /**
     * Octile distance measure, diagonal moves count sqrt(2) times the cardinal directions.
     * This is an "approximation" for the dnd5e 5/10/5 movement rule, i.e. same as chebyshev
     * @param start
     * @param end
     * @param D
     * @param D2
     * @returns {number}
     */
    octile(start, end, D = 1, D2 = Math.sqrt(2)) {
        const dr = Math.abs(end.row - start.row);
        const dc = Math.abs(end.col - start.col);

        return D * Math.max(dc, dr) + (D2 - D) * Math.min(dc, dr);
    }

    euclidean(start, end) {
        const dx = start.col - end.col;
        const dy = start.row - end.row;

        return Math.sqrt(dx ** 2 + dy ** 2);
    }

}