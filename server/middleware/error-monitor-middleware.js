/**
 * Meridian Error Monitor Middleware
 *
 * Version:
 * v2.3.10
 */

const crypto =
require("crypto");


const errorMonitorService =
require("../services/error-monitor-service");


let processHandlersInstalled =
false;


function createRequestId() {
    return `req_${crypto.randomUUID()}`;
}


function requestContext(req) {
    return {
        requestId:
            req.errorMonitorRequestId
            || null,
        method:
            req.method,
        path:
            req.originalUrl
            || req.url,
        query:
            req.query
            || {},
        ip:
            req.ip
            || null,
        userAgent:
            req.get
            ? req.get("user-agent")
            : null,
        adminUsername:
            req.session
            && req.session.admin
            ? req.session.admin.username
            : null
    };
}


function requestIdMiddleware(
    req,
    res,
    next
) {
    const requestId =
        createRequestId();

    req.errorMonitorRequestId =
        requestId;

    res.set(
        "X-Request-Id",
        requestId
    );

    next();
}


function expressErrorHandler(
    error,
    req,
    res,
    next
) {
    if (res.headersSent) {
        return next(error);
    }

    const status =
        Number.isInteger(error.status)
        && error.status >= 400
        && error.status <= 599
        ? error.status
        : 500;

    errorMonitorService
    .captureError({
        source:
            "express.request",
        error,
        message:
            "Express request processing failed.",
        code:
            error.code
            || `HTTP_${status}`,
        context: {
            ...requestContext(req),
            status
        }
    })
    .catch(
        monitorError => {
            console.warn(
                "[Express Error Monitor Failure]",
                monitorError
                && monitorError.message
                ? monitorError.message
                : monitorError
            );
        }
    );

    return res
    .status(status)
    .json({
        success: false,
        code:
            error.code
            || "INTERNAL_SERVER_ERROR",
        message:
            status >= 500
            ? "Internal server error"
            : error.message
            || "Request failed",
        requestId:
            req.errorMonitorRequestId
    });
}


function installProcessHandlers({
    exitOnUncaught = true
} = {}) {
    if (processHandlersInstalled) {
        return;
    }

    processHandlersInstalled =
        true;

    process.on(
        "unhandledRejection",
        reason => {
            const error =
                reason instanceof Error
                ? reason
                : new Error(
                    typeof reason === "string"
                    ? reason
                    : "Unhandled promise rejection"
                );

            console.error(
                "[Unhandled Rejection]",
                error
            );

            errorMonitorService
            .captureCritical({
                source:
                    "process.unhandledRejection",
                error,
                message:
                    "Unhandled promise rejection.",
                code:
                    error.code
                    || "UNHANDLED_REJECTION"
            })
            .catch(() => {});
        }
    );

    process.on(
        "uncaughtException",
        error => {
            console.error(
                "[Uncaught Exception]",
                error
            );

            const capture =
                errorMonitorService
                .captureCritical({
                    source:
                        "process.uncaughtException",
                    error,
                    message:
                        "Uncaught process exception.",
                    code:
                        error.code
                        || "UNCAUGHT_EXCEPTION"
                })
                .catch(() => null);

            if (!exitOnUncaught) {
                return;
            }

            Promise.race([
                capture,
                new Promise(
                    resolve => setTimeout(
                        resolve,
                        1000
                    )
                )
            ])
            .finally(
                () => process.exit(1)
            );
        }
    );
}


function resetProcessHandlerFlagForTests() {
    processHandlersInstalled =
        false;
}


module.exports = {
    requestIdMiddleware,
    expressErrorHandler,
    installProcessHandlers,
    requestContext,
    resetProcessHandlerFlagForTests
};
