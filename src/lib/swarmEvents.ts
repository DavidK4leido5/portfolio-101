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
