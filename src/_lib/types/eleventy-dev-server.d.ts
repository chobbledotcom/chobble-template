/**
 * Ambient declaration for @11ty/eleventy-dev-server.
 *
 * The upstream package ships no declarations. We only use the static
 * factory plus serve/close, for the browser-automation static server
 * in `#media/browser-utils.js`.
 */

declare module "@11ty/eleventy-dev-server" {
  type DevServerLogger = {
    info: (message: string) => void;
    log: (message: string) => void;
    error: (message: string) => void;
  };

  type DevServerOptions = {
    liveReload?: boolean;
    portReassignmentRetryCount?: number;
    logger?: DevServerLogger;
  };

  export default class EleventyDevServer {
    static getServer(
      name: string,
      dir: string,
      options?: DevServerOptions,
    ): EleventyDevServer;
    serve(port: number): void;
    close(): Promise<void>;
  }
}
