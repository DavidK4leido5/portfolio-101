/**
 * Window events the particle cloud sends the UI. Fired by BrainTouchProbe;
 * the cursor and the hero hint listen.
 */
/** The pointer has come onto the cloud. */
export const SWARM_ENTER = 'swarm:enter'
/** The pointer has left the cloud. */
export const SWARM_LEAVE = 'swarm:leave'
/** A click landed on the cloud and startled the swarm. */
export const SWARM_TOUCH = 'swarm:touch'
/** A raid has reached the cursor. */
export const SWARM_ATTACK = 'swarm:attack'
/** One attacker has bitten the cursor. */
export const SWARM_BITE = 'swarm:bite'
/** The raid is falling back. */
export const SWARM_RETREAT = 'swarm:retreat'
