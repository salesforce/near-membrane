import { createMembraneMarshall } from './membrane';
import type { Connector } from './types';

const TypeErrorCtor = TypeError;

const createMembraneMarshallSourceInStrictMode = `
'use strict';
(${createMembraneMarshall})`;

export function createBlueConnector(globalObject: typeof globalThis): Connector {
    if (typeof globalObject !== 'object' || globalObject === null) {
        throw new TypeErrorCtor('Missing globalObject.');
    }
    return createMembraneMarshall(globalObject);
}

export function createRedConnector(evaluator: typeof eval): Connector {
    if (typeof evaluator !== 'function') {
        throw new TypeErrorCtor('Missing evaluator function.');
    }
    return evaluator(createMembraneMarshallSourceInStrictMode)() as Connector;
}
