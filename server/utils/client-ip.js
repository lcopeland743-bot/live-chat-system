/**
 * Meridian Client Network Utilities
 *
 * Extracts client network metadata from a Socket.io handshake.
 * The server is the source of truth; client JavaScript does not report IP.
 *
 * Version: v1.0.0
 */

const MAX_IP_LENGTH = 128;
const MAX_USER_AGENT_LENGTH = 512;


function firstHeaderValue(value) {
    if (Array.isArray(value)) {
        return value[0] || "";
    }

    return String(value || "")
    .split(",")[0]
    .trim();
}


function normalizeIp(value) {
    let ip = firstHeaderValue(value);

    if (!ip) {
        return "";
    }

    if (ip.startsWith("::ffff:")) {
        ip = ip.slice(7);
    }

    if (ip === "::1") {
        ip = "127.0.0.1";
    }

    if (
        ip.startsWith("[")
        && ip.includes("]")
    ) {
        ip = ip.slice(
            1,
            ip.indexOf("]")
        );
    }

    return ip.slice(0, MAX_IP_LENGTH);
}


function getSocketClientIp(socket) {
    const handshake =
        socket
        && socket.handshake
        ? socket.handshake
        : {};

    const headers =
        handshake.headers
        || {};

    return normalizeIp(
        headers["x-forwarded-for"]
        || headers["x-real-ip"]
        || handshake.address
        || (
            socket
            && socket.conn
            && socket.conn.remoteAddress
        )
        || (
            socket
            && socket.request
            && socket.request.socket
            && socket.request.socket.remoteAddress
        )
    );
}


function getSocketUserAgent(socket) {
    const headers =
        socket
        && socket.handshake
        && socket.handshake.headers
        ? socket.handshake.headers
        : {};

    return String(
        headers["user-agent"]
        || ""
    )
    .trim()
    .slice(0, MAX_USER_AGENT_LENGTH);
}


module.exports = {
    normalizeIp,
    getSocketClientIp,
    getSocketUserAgent
};
