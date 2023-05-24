# Rush 
Move a group of tokens towards a target without fiddling with their paths.
This module is intended for scenes with lots and lots of tokens where manual movement would be too tedious.

**NOTE** This is a _'I just need something quick for one session!'_ project. If it is useful to you, feedback and bug
reports are welcome, but I do not intend to pour too much time into this at the moment.

# Usage
Select tokens. Hold `CTRL` + `SHIFT` and `Right-click` a target location. To limit the movement to the token actors'
movement range, use `CTRL`+ `SHIFT` + `Left-click`.

# Installation
Find "Rush" in the FoundryVTT module installation list, or use the following URL:

https://github.com/wonkoderverstaendige/foundryvtt-rush/releases/latest/download/module.json

# Dependencies
Rush depends on `lib-wrapper` and currently does not ship with a fallback shim.

# Features
Looks for valid paths through the map towards the target. If the target is occupied, the tokens will
try to surround the target.

# Alternatives
[Drag Ruler](https://foundryvtt.com/packages/drag-ruler) and [routinglib](https://foundryvtt.com/packages/routinglib)
offer pathfinding, too. Perhaps consider them for your needs first.

# Limitations
- **SQUARE GRID ONLY** (other grids work, but a square grid movement and positioning is enforced, which looks bad)
- Generally aimed at medium-sized tokens. Larger or smaller tokens won't move quite as well
- Edge cases in wall arrangements
- Environmental effects like spells or terrain features not considered (e.g. difficult terrain)
- inefficient implementation

# Future Ideas
- token size
- Theta* instead of simplified A* search

# Credits


# Contributions