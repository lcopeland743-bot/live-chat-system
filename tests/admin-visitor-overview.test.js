/**
 * Meridian Admin Visitor Overview Test
 *
 * Version:
 * v2.3.6
 */

const assert =
require("assert");


const fs =
require("fs");


const path =
require("path");


const vm =
require("vm");


const Module =
require("module");


const Session =
require(
    "../server/database/models/session-model"
);


const originalModuleLoad =
Module._load;


Module._load =
function(request,parent,isMain){
    const fromSessionService =
        parent
        &&
        /session-service\.js$/.test(
            parent.filename
        );

    if(fromSessionService){
        if(request === "../config/ai-config"){
            return {
                defaultMode: "auto",
                normalizeMode: mode=>mode
            };
        }

        if(request === "../config/conversion-config"){
            return {};
        }

        if(request === "./conversion-state-service"){
            return {
                normalize: state=>state || {},
                createDefaultState: ()=>({})
            };
        }

        if(request === "../config/data-retention-config"){
            return {
                calculateClosedSessionPurgeAt:
                    ()=>null
            };
        }
    }

    return originalModuleLoad(
        request,
        parent,
        isMain
    );
};


const sessionService =
require(
    "../server/services/session-service"
);


Module._load =
originalModuleLoad;


function runPresenceSelectionTest(){
    const stateSource =
        fs.readFileSync(
            path.join(
                __dirname,
                "../public/js/admin/admin-state.js"
            ),
            "utf8"
        );

    const storage =
        new Map();

    const context = {
        console,
        localStorage: {
            getItem: key=>
                storage.has(key)
                ? storage.get(key)
                : null,
            setItem: (key,value)=>
                storage.set(key,value),
            removeItem: key=>
                storage.delete(key)
        },
        window: {}
    };

    vm.createContext(context);
    vm.runInContext(
        stateSource,
        context
    );

    const state =
        context.window.MeridianAdminState;

    state.setPresenceUsers(
        [
            {
                userId: "silent_online_1",
                socketId: "socket_1",
                status: "online",
                aiMode: "auto",
                messageCount: 0
            }
        ],
        []
    );

    state.setSessions([]);

    assert.strictEqual(
        state.getConversationSessionByUserId(
            "silent_online_1"
        ),
        null,
        "silent visitor must stay out of conversation sessions"
    );

    const silentSession =
        state.getSessionByUserId(
            "silent_online_1"
        );

    assert.ok(
        silentSession,
        "online silent visitor should be selectable"
    );

    state.selectSession(
        silentSession
    );

    assert.strictEqual(
        state.getCurrentUser().socketId,
        "socket_1",
        "selected silent visitor should retain socket id for proactive reply"
    );

    state.addOfflineUser({
        userId: "silent_online_1",
        status: "offline"
    });

    assert.strictEqual(
        state.onlineUsers.length,
        0
    );

    assert.strictEqual(
        state.offlineUsers.length,
        0,
        "offline silent visitor should remain hidden"
    );
}


async function run(){
    const originalAggregate =
        Session.aggregate;

    let capturedPipeline =
        null;

    Session.aggregate =
        async pipeline=>{
            capturedPipeline =
                pipeline;

            return [
                {
                    sessions: [
                        {
                            userId: "active_1",
                            messageCount: 1
                        }
                    ],
                    onlineUsers: [
                        {
                            userId: "active_1",
                            status: "online"
                        },
                        {
                            userId: "silent_1",
                            status: "online"
                        }
                    ],
                    offlineUsers: [],
                    stats: [
                        {
                            totalVisitors: 3,
                            activeConversations: 1,
                            silentVisitors: 2,
                            onlineVisitors: 2,
                            onlineSilentVisitors: 1
                        }
                    ]
                }
            ];
        };

    try{
        const overview =
            await sessionService
            .getAdminVisitorOverview();

        assert.ok(
            Array.isArray(capturedPipeline),
            "aggregation pipeline should be used"
        );

        assert.ok(
            capturedPipeline.some(
                stage=>stage.$facet
            ),
            "pipeline should classify sessions with $facet"
        );

        assert.strictEqual(
            overview.sessions.length,
            1
        );

        assert.strictEqual(
            overview.onlineUsers.length,
            2
        );

        assert.strictEqual(
            overview.offlineUsers.length,
            0
        );

        assert.deepStrictEqual(
            overview.visitorStats,
            {
                totalVisitors: 3,
                activeConversations: 1,
                silentVisitors: 2,
                onlineVisitors: 2,
                onlineSilentVisitors: 1
            }
        );

        runPresenceSelectionTest();

        console.log(
            "Admin visitor overview and presence selection tests passed."
        );
    }
    finally{
        Session.aggregate =
            originalAggregate;
    }
}


run()
.catch(
    error=>{
        console.error(error);
        process.exitCode = 1;
    }
);
