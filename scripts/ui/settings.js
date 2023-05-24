export class RushSettings {
    static init() {
        // if (!game.user.isGM) return;
        game.settings.register('rush', 'do-dash', {
            name: 'Dash',
            hint: 'Dash when remaining distance larger than highest movement distance.',
            scope: 'world',
            type: Boolean,
            default: true,
            config: true,
            restricted: true,

        })
        game.settings.register('rush', 'move-animation-factor', {
            name: 'Normal Movement Duration',
            hint: 'Normal movement animation speed factor.',
            scope: 'world',
            config: true,
            default: 6,
            type: Number,
            restricted: true,
        });

        game.settings.register('rush', 'dash-animation-factor', {
            name: 'Dash Movement Duration',
            hint: 'Animation speed factor for dash moves.',
            scope: 'world',
            config: true,
            default: 3,
            type: Number,
            restricted: true,
        });
    }
}