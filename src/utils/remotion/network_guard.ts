import type { HeadlessBrowser } from "@remotion/renderer";
import { WEBRTC_REMOVAL_SCRIPT, isAllowedSceneRequest } from "./network_policy.js";

type PausedRequest = { requestId: string; request: { url: string }; resourceType?: unknown };
type AttachedTarget = { sessionId: string; targetInfo: { type: string } };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isPausedRequest = (value: unknown): value is PausedRequest =>
  isRecord(value) && typeof value.requestId === "string" && isRecord(value.request) && typeof value.request.url === "string";

const isAttachedTarget = (value: unknown): value is AttachedTarget =>
  isRecord(value) && typeof value.sessionId === "string" && isRecord(value.targetInfo) && typeof value.targetInfo.type === "string";

// Remotion types only the CDP commands it uses itself; Fetch and Runtime.runIfWaitingForDebugger
// are sent through the same send(), which resolves on the reply and rejects on a CDP error.
const sendCommand = async (channel: object, method: string, params: Record<string, unknown> = {}): Promise<void> => {
  const send: unknown = Reflect.get(channel, "send");
  if (typeof send !== "function") throw new Error(`remotion: cannot send ${method}: the browser connection has no send()`);
  await send.call(channel, method, params);
};

const FRAME_TARGET_TYPES = ["page", "iframe"];

export type NetworkGuard = { failures: string[] };

const answerRequest = async (connection: object, paused: PausedRequest, serverPort: number, onBlocked: (url: string) => void) => {
  if (isAllowedSceneRequest({ url: paused.request.url, isDocument: paused.resourceType === "Document" }, serverPort)) {
    await sendCommand(connection, "Fetch.continueRequest", { requestId: paused.requestId });
    return;
  }
  onBlocked(paused.request.url);
  await sendCommand(connection, "Fetch.failRequest", { requestId: paused.requestId, errorReason: "BlockedByClient" });
};

// A target that could not be guarded stays paused, so its render fails instead of running unguarded.
const guardTarget = async (browser: HeadlessBrowser, attached: AttachedTarget) => {
  const session = browser.connection.session(attached.sessionId);
  if (!session) throw new Error(`remotion: no CDP session for a new ${attached.targetInfo.type}`);
  if (FRAME_TARGET_TYPES.includes(attached.targetInfo.type)) {
    await session.send("Page.enable");
    await session.send("Page.addScriptToEvaluateOnNewDocument", { source: WEBRTC_REMOVAL_SCRIPT });
  }
  await sendCommand(session, "Runtime.runIfWaitingForDebugger");
};

export const guardSceneNetwork = async (browser: HeadlessBrowser, serverPort: number, onBlocked: (url: string) => void): Promise<NetworkGuard> => {
  const guard: NetworkGuard = { failures: [] };
  const fail = (error: unknown) => guard.failures.push(error instanceof Error ? error.message : String(error));
  const connection = browser.connection;
  connection.on("Fetch.requestPaused", (event) => {
    if (isPausedRequest(event)) answerRequest(connection, event, serverPort, onBlocked).catch(fail);
  });
  connection.on("Target.attachedToTarget", (event) => {
    if (isAttachedTarget(event)) guardTarget(browser, event).catch(fail);
  });
  await sendCommand(connection, "Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await connection.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });
  return guard;
};
