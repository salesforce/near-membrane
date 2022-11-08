import {
    ArrayIsArray,
    ArrayProtoFind,
    ReflectApply,
    RegExpProtoTest,
} from '@locker/near-membrane-shared';
import { rootWindow } from './Window';

export const IS_CHROMIUM_BROWSER = (() => {
    const {
        // We don't cherry-pick the 'userAgent' property from `navigator` here
        // to avoid triggering its getter.
        navigator,
        navigator: { userAgentData },
    }: any = rootWindow;
    // The user-agent client hints API is experimental and subject to change.
    // https://caniuse.com/mdn-api_navigator_useragentdata
    const brands: { brand: string; version: string }[] = userAgentData?.brands;
    return (
        // While experimental, `navigator.userAgentData.brands` may be defined
        // as an empty array in headless Chromium based browsers.
        ArrayIsArray(brands) && brands.length
            ? // Use user-agent client hints API if available to avoid
              // deprecation warnings.
              // https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API
              ReflectApply(ArrayProtoFind, brands, [(item: any) => item?.brand === 'Chromium'])
            : // Fallback to a standard user-agent string sniff.
              // Note: Chromium identifies itself as Chrome in its user-agent string.
              // https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
              ReflectApply(RegExpProtoTest, / (?:Headless)?Chrome\/\d+/, [navigator.userAgent])
    );
})();
