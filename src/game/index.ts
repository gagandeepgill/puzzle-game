/**
 * Public surface of the rules engine.
 *
 * Nothing here touches the DOM, React or React Native. The same module serves
 * the web build, the future Expo app, and a server replaying a submitted move
 * list to verify a score.
 */
export * from './types.js';
export * from './content.js';
export * from './rng.js';
export { simulateDrop, isForked } from './simulate.js';
