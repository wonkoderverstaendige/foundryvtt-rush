/**
 * Get coordinates of mouse cursor event on the canvas, in {x, y} canvas coordinates.
 * @returns {x, y}
 */
export function getPosOnCanvas() {
    // with help by Wasp & Zhell
    if (game.release.generation >= 11) {
        return canvas.app.renderer.plugins.interaction.pointer.getLocalPosition(canvas.app.stage);
    } else {
        return canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
    }
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
    const col = Math.floor((x - canvas.scene.dimensions.sceneX) / canvas.scene.grid.size);
    const row = Math.floor((y - canvas.scene.dimensions.sceneY) / canvas.scene.grid.size);
    return {row: row, col: col};
}

export function gridToPos(indices) {
    const x = canvas.scene.dimensions.sceneX + (indices.col+0.5) * canvas.scene.grid.size;
    const y = canvas.scene.dimensions.sceneY + (indices.row+0.5) * canvas.scene.grid.size;
    return {x: x, y: y};
}

export function easeInOutCubic(x) {
    // from https://easings.net
    return x < 0.5 ? 4*x*x*x : 1-Math.pow(-2*x + 2, 3) / 2;
}
//
// export function easeInOutCosine(x) {
//     // from https://easings.net
//     // Already part of foundry, but this way it's consistent
//     return - (Math.cos(Math.PI * x) - 1) / 2;
// }