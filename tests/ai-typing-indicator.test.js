const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
    return fs.readFileSync(
        path.join(
            __dirname,
            "..",
            relativePath
        ),
        "utf8"
    );
}

const handler =
    read("server/socket/chat-handler.js");

const events =
    read("public/js/core/events.js");

const socket =
    read("public/js/core/socket.js");

const chat =
    read("public/js/chat.js");

const embed =
    read("public/js/embed.js");

const ui =
    read("public/js/ui/chat-ui.js");

const css =
    read("public/css/chat.css");

const packageJson =
    JSON.parse(
        read("package.json")
    );

assert.match(
    handler,
    /\.emit\(\s*"ai_typing"/
);

assert.match(
    handler,
    /emitAiTyping\([\s\S]*payload,[\s\S]*true/
);

assert.match(
    handler,
    /finally\s*\{[\s\S]*emitAiTyping\([\s\S]*payload,[\s\S]*false/
);

assert.match(
    handler,
    /aiReplyLimitReached[\s\S]*!==\s*true/
);

assert.match(
    handler,
    /Number\([\s\S]*aiReplyCount[\s\S]*\)\s*<\s*5/
);

assert.match(
    events,
    /AI_TYPING:\s*"ai_typing"/
);

assert.match(
    socket,
    /onAiTyping\(callback\)/
);

assert.match(
    chat,
    /MeridianSocket\.onAiTyping/
);

assert.match(
    embed,
    /MeridianSocket\.onAiTyping/
);

assert.match(
    ui,
    /typingRequests:new Map\(\)/
);

assert.match(
    ui,
    /typingTimeoutMs:130000/
);

assert.match(
    ui,
    /meridian-typing-indicator/
);

assert.match(
    ui,
    /insertBefore\([\s\S]*messageDiv,[\s\S]*typingIndicator/
);

assert.match(
    css,
    /@keyframes meridian-typing-bounce/
);

assert.strictEqual(
    packageJson.version,
    "2.3.8"
);

assert.strictEqual(
    packageJson.scripts["test:ai-typing"],
    "node tests/ai-typing-indicator.test.js"
);

console.log(
    "AI Typing Indicator v2.3.8 tests passed."
);
