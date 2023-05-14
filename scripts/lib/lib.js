/**
 * Get coordinates of mouse cursor event on the canvas, in {x, y} canvas coordinates.
 * @param snap
 * @returns {*}
 */
export function getPosOnCanvas(snap=false) {
    // hoisted shamelessly from Sequencer
    const pos = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition( canvas.app.stage );
    return pos;
}

/**
 * Snap {x, y} canvas coordinates to consistent coordinates within the corresponding grid cell.
 * Just a shortening wrapper around the foundry `canvas.grid.getSnappedPosition` method.
 * @param x
 * @param y
 * @param gridSnap
 * @returns {*}
 */
export function snapPosToGrid(x, y, gridSnap = 2) {
    return canvas.grid.getSnappedPosition(x, y, gridSnap);
}

/**
 * Convert {x,y} canvas position to {row, col} grid indices
 * @param x
 * @param y
 * @returns {{col: number, row: number}}
 */
export function posToGrid(x, y) {
    const col = Math.floor((x - canvas.scene.dimensions.sceneY) / canvas.scene.grid.size);
    const row = Math.floor((y - canvas.scene.dimensions.sceneY) / canvas.scene.grid.size);
    return {row: row, col: col};
}

export function gridToPos(indices) {
    const x = canvas.scene.dimensions.sceneX + (indices.col+0.5) * canvas.scene.grid.size;
    const y = canvas.scene.dimensions.sceneY + (indices.row+0.5) * canvas.scene.grid.size;
    return {x: x, y: y};
}