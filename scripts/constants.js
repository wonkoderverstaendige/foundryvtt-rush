const CONSTANTS = {
    MODULE_NAME: "rush",
    SEARCH_MODE: 'A*',
    GRID_DIRECTIONS: [-1, 0, 1],
    LABEL_LOC_STYLE: new PIXI.TextStyle({fontFamily: 'Arial', fontSize: 10, fontWeight: 'lighter'}),
    SUPPORTED_GRIDS: [CONST.GRID_TYPES.SQUARE],
    RUSH_EFFECT: {
        id: 'rush-dash',
        label: 'Dashed',
        icon: '/modules/rush/resources/rush-dash.svg'
    }
}

export default CONSTANTS;