/**
 * Shared Zod schemas + TS types between apps/web and apps/api.
 *
 * The API exposes an OpenAPI spec — long-term, generate this file from that
 * spec to keep the contract single-sourced. For MVP we hand-write the
 * primitives below and extend as the surface grows.
 */
export * from "./assessment";
export * from "./mower";
export * from "./recommendation";
export * from "./lead";
