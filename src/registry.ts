import { 
    isUndefined, 
    WeakMapCreate,
    WeakMapSet,
    WeakMapGet,
    ErrorCreate,
} from './shared';
import {
    RedObject,
    RedFunction,
    BlueFunction,
    BlueObject,
    RedProxyTarget,
    BlueValue,
    RedValue,
    DistortionMap,
    RedProxy,
    BlueProxy,
    BlueProxyTarget,
} from './types';

export class SandboxRegistry {
    // map from red to blue references
    redMap: WeakMap<RedFunction | RedObject, RedProxyTarget | BlueProxy> = WeakMapCreate();
    // map from blue to red references
    blueMap: WeakMap<BlueFunction | BlueObject, RedProxy | BlueProxyTarget> = WeakMapCreate();
    // blue object distortion map
    distortionMap: DistortionMap = WeakMapCreate();

    addDistortions(distortionMap: Map<RedProxyTarget, RedProxyTarget>) {
        // validating distortion entries
        distortionMap?.forEach((value, key) => {
            if (typeof key !== typeof value) {
                throw ErrorCreate(`Invalid distortion ${value}.`);
            }
            WeakMapSet(this.distortionMap, key, value);
        });
    }

    getBlueRef(red: RedValue): BlueValue | undefined {
        const blue: RedValue | undefined = WeakMapGet(this.redMap, red);
        if (!isUndefined(blue)) {
            return blue;
        }
    }

    getRedRef(blue: BlueValue): RedValue | undefined {
        const red: RedValue | undefined = WeakMapGet(this.blueMap, blue);
        if (!isUndefined(red)) {
            return red;
        }
    }

    setRefMapEntries(red: RedObject, blue: BlueObject) {
        // double index for perf
        WeakMapSet(this.redMap, red, blue);
        WeakMapSet(this.blueMap, blue, red);
    }
}
