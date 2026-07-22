/**
 * Meridian AI Auto Reply Scheduler
 *
 * Version:
 * v2.3.9
 *
 * Strategy:
 * - One running Auto AI task per session.
 * - Keep only the latest pending Auto message.
 * - Different sessions may run in parallel.
 * - Cancellation prevents stale replies from being delivered.
 */

const sessionStates =
new Map();


function createNoneResult(
    reason,
    details = {}
) {
    return {
        action:
            "none",
        reason,
        ...details
    };
}


function normalizeReason(
    reason,
    fallback
) {
    const value =
        String(
            reason
            || ""
        )
        .trim();

    return value || fallback;
}


function createJob({
    userId,
    messageId,
    task,
    onCancel
}) {
    let resolvePromise;
    let rejectPromise;

    const promise =
        new Promise(
            (resolve, reject) => {
                resolvePromise =
                    resolve;
                rejectPromise =
                    reject;
            }
        );

    return {
        userId,
        messageId:
            String(
                messageId
                || ""
            ),
        task,
        onCancel:
            typeof onCancel ===
                "function"
            ? onCancel
            : null,
        resolve:
            resolvePromise,
        reject:
            rejectPromise,
        promise,
        cancelled:
            false,
        cancelReason:
            null,
        cancelNotified:
            false,
        settled:
            false
    };
}


function notifyCancellation(
    job,
    reason,
    details = {}
) {
    if (
        !job
        || job.cancelNotified
    ) {
        return;
    }

    job.cancelNotified =
        true;

    if (!job.onCancel) {
        return;
    }

    try {
        job.onCancel({
            userId:
                job.userId,
            messageId:
                job.messageId,
            reason,
            ...details
        });
    } catch (error) {
        console.error(
            "[AI Auto Queue Cancel Callback Error]",
            {
                userId:
                    job.userId,
                messageId:
                    job.messageId,
                reason,
                error:
                    error.message
                    || String(error)
            }
        );
    }
}


function settleJob(
    job,
    method,
    value
) {
    if (
        !job
        || job.settled
    ) {
        return;
    }

    job.settled =
        true;
    job[method](value);
}


function cancelJob(
    job,
    reason,
    details = {},
    settleImmediately = false
) {
    if (
        !job
        || job.settled
    ) {
        return;
    }

    const normalizedReason =
        normalizeReason(
            reason,
            "auto_reply_cancelled"
        );

    job.cancelled =
        true;
    job.cancelReason =
        normalizedReason;

    notifyCancellation(
        job,
        normalizedReason,
        details
    );

    if (settleImmediately) {
        settleJob(
            job,
            "resolve",
            createNoneResult(
                normalizedReason,
                {
                    cancelled:
                        true,
                    ...details
                }
            )
        );
    }
}


function getOrCreateState(
    userId
) {
    let state =
        sessionStates.get(userId);

    if (state) {
        return state;
    }

    state = {
        userId,
        running:
            null,
        pending:
            null,
        stopPendingReason:
            null
    };

    sessionStates.set(
        userId,
        state
    );

    return state;
}


function cancelPendingJob(
    state,
    reason,
    details = {}
) {
    if (
        !state
        || !state.pending
    ) {
        return false;
    }

    const pending =
        state.pending;

    state.pending =
        null;

    cancelJob(
        pending,
        reason,
        details,
        true
    );

    return true;
}


function createTaskContext(
    state,
    job
) {
    return {
        userId:
            job.userId,
        messageId:
            job.messageId,

        isActive() {
            return Boolean(
                !job.cancelled
                && sessionStates.get(
                    job.userId
                ) === state
                && state.running === job
            );
        },

        stopPending(
            reason =
                "auto_reply_stopped"
        ) {
            if (
                sessionStates.get(
                    job.userId
                ) !== state
                || state.running !== job
            ) {
                return false;
            }

            state.stopPendingReason =
                normalizeReason(
                    reason,
                    "auto_reply_stopped"
                );

            return cancelPendingJob(
                state,
                state.stopPendingReason,
                {
                    stoppedByMessageId:
                        job.messageId
                }
            );
        }
    };
}


async function runCurrent(
    state
) {
    const job =
        state.running;

    if (!job) {
        return;
    }

    const context =
        createTaskContext(
            state,
            job
        );

    try {
        const result =
            await job.task(
                context
            );

        if (job.cancelled) {
            settleJob(
                job,
                "resolve",
                createNoneResult(
                    job.cancelReason
                    || "auto_reply_cancelled",
                    {
                        cancelled:
                            true
                    }
                )
            );
        } else {
            settleJob(
                job,
                "resolve",
                result
            );
        }
    } catch (error) {
        if (job.cancelled) {
            settleJob(
                job,
                "resolve",
                createNoneResult(
                    job.cancelReason
                    || "auto_reply_cancelled",
                    {
                        cancelled:
                            true
                    }
                )
            );
        } else {
            settleJob(
                job,
                "reject",
                error
            );
        }
    } finally {
        if (
            sessionStates.get(
                state.userId
            ) !== state
        ) {
            return;
        }

        if (state.running === job) {
            state.running =
                null;
        }

        if (
            state.stopPendingReason
            && state.pending
        ) {
            cancelPendingJob(
                state,
                state.stopPendingReason,
                {
                    stoppedByMessageId:
                        job.messageId
                }
            );
        }

        state.stopPendingReason =
            null;

        if (state.pending) {
            state.running =
                state.pending;
            state.pending =
                null;

            Promise.resolve()
            .then(
                () => runCurrent(
                    state
                )
            );

            return;
        }

        sessionStates.delete(
            state.userId
        );
    }
}


function schedule({
    userId,
    messageId,
    task,
    onCancel
}) {
    const normalizedUserId =
        String(
            userId
            || ""
        )
        .trim();

    if (!normalizedUserId) {
        return Promise.resolve(
            createNoneResult(
                "invalid_user_id"
            )
        );
    }

    if (typeof task !== "function") {
        return Promise.reject(
            new TypeError(
                "AI auto reply task must be a function."
            )
        );
    }

    const state =
        getOrCreateState(
            normalizedUserId
        );

    const job =
        createJob({
            userId:
                normalizedUserId,
            messageId,
            task,
            onCancel
        });

    if (!state.running) {
        state.running =
            job;

        Promise.resolve()
        .then(
            () => runCurrent(
                state
            )
        );

        return job.promise;
    }

    if (state.stopPendingReason) {
        cancelJob(
            job,
            state.stopPendingReason,
            {
                stoppedByMessageId:
                    state.running
                    ? state.running.messageId
                    : null
            },
            true
        );

        return job.promise;
    }

    if (state.pending) {
        const replaced =
            state.pending;

        cancelPendingJob(
            state,
            "superseded_by_latest_message",
            {
                supersededByMessageId:
                    job.messageId
            }
        );

        console.log(
            "[AI Auto Queue]",
            {
                event:
                    "pending_replaced",
                userId:
                    normalizedUserId,
                replacedMessageId:
                    replaced.messageId,
                latestMessageId:
                    job.messageId
            }
        );
    }

    state.pending =
        job;

    return job.promise;
}


function cancel(
    userId,
    reason =
        "auto_reply_cancelled"
) {
    const normalizedUserId =
        String(
            userId
            || ""
        )
        .trim();

    const state =
        sessionStates.get(
            normalizedUserId
        );

    if (!state) {
        return {
            cancelled:
                false,
            running:
                false,
            pending:
                false
        };
    }

    const normalizedReason =
        normalizeReason(
            reason,
            "auto_reply_cancelled"
        );

    const hadRunning =
        Boolean(
            state.running
        );

    const hadPending =
        Boolean(
            state.pending
        );

    state.stopPendingReason =
        normalizedReason;

    if (state.running) {
        cancelJob(
            state.running,
            normalizedReason
        );
    }

    cancelPendingJob(
        state,
        normalizedReason,
        {
            cancelledByControlChange:
                true
        }
    );

    console.log(
        "[AI Auto Queue]",
        {
            event:
                "cancelled",
            userId:
                normalizedUserId,
            reason:
                normalizedReason,
            running:
                hadRunning,
            pending:
                hadPending
        }
    );

    return {
        cancelled:
            hadRunning
            || hadPending,
        running:
            hadRunning,
        pending:
            hadPending
    };
}


function getStatus(
    userId = null
) {
    if (userId) {
        const state =
            sessionStates.get(
                String(userId)
            );

        return {
            running:
                Boolean(
                    state
                    && state.running
                ),
            pending:
                Boolean(
                    state
                    && state.pending
                ),
            runningMessageId:
                state
                && state.running
                ? state.running.messageId
                : null,
            pendingMessageId:
                state
                && state.pending
                ? state.pending.messageId
                : null
        };
    }

    let runningSessions =
        0;
    let pendingSessions =
        0;

    for (
        const state
        of sessionStates.values()
    ) {
        if (state.running) {
            runningSessions +=
                1;
        }

        if (state.pending) {
            pendingSessions +=
                1;
        }
    }

    return {
        strategy:
            "latest_pending_only",
        runningSessions,
        pendingSessions
    };
}


function resetForTests() {
    for (
        const userId
        of Array.from(
            sessionStates.keys()
        )
    ) {
        cancel(
            userId,
            "test_reset"
        );
    }

    sessionStates.clear();
}


module.exports = {
    schedule,
    cancel,
    getStatus,
    resetForTests
};
