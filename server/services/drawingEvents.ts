import {EventEmitter} from 'node:events';
// Notification only, after an existing manual transaction commits.
export const drawingEvents = new EventEmitter();
