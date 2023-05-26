# Animation
- [ ] adjust movement animation based on speed
- [X] ease movement without dependency
- [ ] look at extended animations
  - rotate in movement direction
  - movement styles (sharp, smooth, fluttery, stomping...)
- [ ] organic movement
  - add additional animation (wiggle for flight, random speed variations, spline smoothed curves)
  - needs augmentation of foundry's animation system

# Compatibility
- [ ] check with modules that use mouse interactions on the token layer
  - Sequencer
  - Warpgate
  - MATT
  - Drag Ruler
- [ ] move speed from popular systems other than dnd5e
  - set status effect (if combat?)
  - remove on turn change or new move command

# UI
- [ ] indicate which tokens have dashed this turn
  - temporary active effects?

# Search
- [ ] non-grid based movement
- [ ] movement heuristics dependent on token actor intelligence/type etc.
  - smarter enemies try to not get in each other's way, optimize encircle or cut off exits
  - dumb enemies block each other, get stuck, take inefficient paths
- [ ] prevent simultaneous occupation during movement
  - insert ghost stops to let token pass
- [ ] order determined by initiative, speed and distance from target
- [ ] alternative non-square grid algorithms (A*, Θ*, SIPP)
- [ ] terminate eagerly on searching vicinity 
  - if target is occupied, stop with a good candidate without searching the whole graph
  - failure in termination a bug?
  - search from both sides -> nearby candidates as new target
- [ ] occupation blocking on end/costing in traversal
- [ ] recycle tokens if path is blocked, configurable max. number of attempts before giving up

# Configuration
- [ ] animation speed independent of actor attributes
- [ ] debug without dev mode


# Technical
- [ ] libWrapper shim
- [ ] benchmarking vs. routinglib to see how much! slower this is
- [ ] integration with existing foundry grid

