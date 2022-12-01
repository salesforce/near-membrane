import {
    ArrayIsArray,
    ArrayProtoFind,
    ReflectApply,
    RegExpProtoTest,
} from '@locker/near-membrane-shared';
import { rootWindow } from './Window';

const {
    // We don't cherry-pick the 'userAgent' property from `navigator` here
    // to avoid triggering its getter.
    navigator,
    navigator: { userAgentData },
}: any = rootWindow;
// The user-agent client hints API is experimental and subject to change.
// https://caniuse.com/mdn-api_navigator_useragentdata

// istanbul ignore next: optional chaining and nullish coalescing results in an expansion that contains an unreachable "void 0" branch for every occurrence of the operator
const brands: { brand: string; version: string }[] = userAgentData?.brands;

// Note: Chromium identifies itself as Chrome in its user-agent string.
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
const chromiumUserAgentRegExp = / (?:Headless)?Chrome\/\d+/;

let userAgent: string | undefined;

function getUserAgent(): string {
    if (userAgent === undefined) {
        userAgent = navigator.userAgent as string;
    }
    return userAgent;
}

export const IS_CHROMIUM_BROWSER =
    // While experimental, `navigator.userAgentData.brands` may be defined as an
    // empty array in headless Chromium based browsers.
    ArrayIsArray(brands) && brands.length
        ? // Use user-agent client hints API if available to avoid deprecation
          // warnings.
          // https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API

          // istanbul ignore next: this code is not reachable in the coverage run.
          ReflectApply(ArrayProtoFind, brands, [
              // prettier-ignore
              (item: any) => item?.brand === 'Chromium',
          ]) !== undefined
        : // Fallback to a standard user-agent string sniff.
          ReflectApply(RegExpProtoTest, chromiumUserAgentRegExp, [getUserAgent()]);

export const IS_OLD_CHROMIUM_BROWSER =
    IS_CHROMIUM_BROWSER &&
    // Chromium added support for `navigator.userAgentData` in v90.
    // https://caniuse.com/mdn-api_navigator_useragentdata
    userAgentData === undefined;
