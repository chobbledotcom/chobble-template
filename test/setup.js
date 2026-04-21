/**
 * Test setup file - preloaded before all tests.
 * Registers happy-dom globals (document, window, etc.) for DOM testing.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const NO_NAV = {
  disableMainFrameNavigation: true,
  disableChildFrameNavigation: true,
  disableChildPageNavigation: true,
};

GlobalRegistrator.register({
  settings: {
    disableCSSFileLoading: true,
    disableJavaScriptFileLoading: true,
    disableJavaScriptEvaluation: true,
    disableIframePageLoading: true,
    disableComputedStyleRendering: true,
    navigation: NO_NAV,
  },
});
