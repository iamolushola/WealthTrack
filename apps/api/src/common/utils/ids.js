"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createId = createId;
exports.nowIso = nowIso;
const node_crypto_1 = require("node:crypto");
function createId() {
    return (0, node_crypto_1.randomUUID)();
}
function nowIso() {
    return new Date().toISOString().slice(0, 23).replace('T', ' ');
}
//# sourceMappingURL=ids.js.map