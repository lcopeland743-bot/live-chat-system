/**
 * Meridian Presence Service
 *
 * Real-time visitor connection tracking.
 * One visitor may have multiple active browser tabs/sockets.
 *
 * Version: v2.4.2
 */

class PresenceService {
    constructor() {
        /**
         * Key: userId
         * Value: one logical visitor with one or more socket IDs
         */
        this.users = new Map();
    }


    normalizeSocketIds(user) {
        const ids = new Set();

        if (
            user
            && Array.isArray(user.socketIds)
        ) {
            user.socketIds
            .filter(Boolean)
            .forEach(id => ids.add(id));
        }

        if (user && user.socketId) {
            ids.add(user.socketId);
        }

        return ids;
    }


    addUser(userData) {
        const existing =
            this.users.get(userData.userId);

        const socketIds =
            this.normalizeSocketIds(existing);

        if (userData.socketId) {
            socketIds.add(userData.socketId);
        }

        const now =
            new Date().toISOString();

        const user = {
            userId:
                userData.userId,
            socketId:
                userData.socketId
                || (
                    existing
                    && existing.socketId
                )
                || null,
            socketIds:
                Array.from(socketIds),
            socketCount:
                socketIds.size,
            status:
                "online",
            page:
                userData.page
                || (
                    existing
                    && existing.page
                )
                || "",
            ipAddress:
                userData.ipAddress
                || (
                    existing
                    && existing.ipAddress
                )
                || "",
            userAgent:
                userData.userAgent
                || (
                    existing
                    && existing.userAgent
                )
                || "",
            geoLocation:
                userData.geoLocation
                || (
                    existing
                    && existing.geoLocation
                )
                || null,
            connectedAt:
                (
                    existing
                    && existing.connectedAt
                )
                || userData.connectedAt
                || now,
            lastSeen:
                now
        };

        this.users.set(
            user.userId,
            user
        );

        return user;
    }


    getUser(userId) {
        return this.users.get(userId)
            || null;
    }


    hasUser(userId) {
        return this.users.has(userId);
    }


    removeUser(userId) {
        const user =
            this.users.get(userId);

        if (!user) {
            return null;
        }

        user.status = "offline";
        user.lastSeen =
            new Date().toISOString();
        user.socketIds = [];
        user.socketCount = 0;

        this.users.delete(userId);

        return user;
    }


    /**
     * Remove one socket from a logical visitor.
     * The visitor remains online while another tab/socket is active.
     */
    removeUserBySocket(socketId) {
        for (
            const [userId, user]
            of this.users.entries()
        ) {
            const socketIds =
                this.normalizeSocketIds(user);

            if (!socketIds.has(socketId)) {
                continue;
            }

            socketIds.delete(socketId);

            if (socketIds.size > 0) {
                user.socketIds =
                    Array.from(socketIds);
                user.socketCount =
                    socketIds.size;
                user.socketId =
                    user.socketIds[
                        user.socketIds.length - 1
                    ]
                    || null;
                user.status = "online";
                user.lastSeen =
                    new Date().toISOString();

                return {
                    user,
                    isOffline: false,
                    activeSocketId:
                        user.socketId
                };
            }

            const removed =
                this.removeUser(userId);

            return {
                user: removed,
                isOffline: true,
                activeSocketId: null
            };
        }

        return null;
    }


    updateGeoLocation(
        userId,
        geoLocation
    ) {
        const user =
            this.users.get(userId);

        if (
            user
            && geoLocation
        ) {
            user.geoLocation = {
                ...geoLocation
            };
            user.lastSeen =
                new Date().toISOString();
        }

        return user || null;
    }


    updateLastSeen(userId) {
        const user =
            this.users.get(userId);

        if (user) {
            user.lastSeen =
                new Date().toISOString();
        }

        return user;
    }


    getOnlineUsers() {
        const users =
            Array.from(this.users.values());

        const ipCounts = new Map();

        for (const user of users) {
            const ip =
                String(user.ipAddress || "")
                .trim();

            if (!ip) {
                continue;
            }

            ipCounts.set(
                ip,
                (ipCounts.get(ip) || 0) + 1
            );
        }

        return users.map(user => ({
            ...user,
            socketIds:
                Array.isArray(user.socketIds)
                ? user.socketIds.slice()
                : [],
            sameIpOnlineCount:
                user.ipAddress
                ? ipCounts.get(user.ipAddress) || 1
                : 0
        }));
    }


    clear() {
        this.users.clear();
    }


    count() {
        return this.users.size;
    }
}


module.exports =
new PresenceService();
