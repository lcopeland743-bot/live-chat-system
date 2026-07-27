/**
 * Meridian Admin UI
 *
 * Version:
 * v2.4.2
 *
 * Features:
 * - Conversation Management
 * - AI Message Renderer
 * - AI Mode Badges
 * - Rich Message Renderer
 * - Visitor Classification Statistics
 * - Lead Intent and Label Badges
 */

window.MeridianAdminUI = {


    historyLoaded:{},


    init(){


        this.messages =

        document.getElementById(

            "adminMessages"

        );


        this.sessions =

        document.getElementById(

            "sessions"

        );


        this.activeConversationsCount =

        document.getElementById(

            "activeConversationsCount"

        );


        this.silentVisitorsCount =

        document.getElementById(

            "silentVisitorsCount"

        );


        this.onlineVisitorsCount =

        document.getElementById(

            "onlineVisitorsCount"

        );


        this.onlineSilentVisitorsCount =

        document.getElementById(

            "onlineSilentVisitorsCount"

        );


        this.onlineUsers =

        document.getElementById(

            "onlineUsers"

        );


        this.offlineUsers =

        document.getElementById(

            "offlineUsers"

        );


        this.input =

        document.getElementById(

            "adminReplyInput"

        );


        this.sendButton =

        document.getElementById(

            "adminSendBtn"

        );


    },


    async restoreCurrentSession(){


        const current =

        MeridianAdminState

        .getCurrentUser();


        if(

            !current

            ||

            !current.userId

        ){


            return;


        }


        let session =

        MeridianAdminState

        .restoreSessionUser();


        if(

            !session

            &&

            window.MeridianAdminLeads

            &&

            window.MeridianAdminLeads

            .isReady()

        ){


            session =

            await window.MeridianAdminLeads

            .fetchSession(

                current.userId

            );


        }


        if(!session){


            return;


        }


        MeridianAdminState.selectSession(

            session

        );


        await this.loadHistory(

            session.userId

        );


        this.renderConversation(

            session.userId

        );


        if(

            window.MeridianAdminLeads

        ){


            window.MeridianAdminLeads

            .renderCurrentSession(

                session

            );


        }


    },


    async loadHistory(userId){


        if(!window.MeridianHistoryLoader){


            return;


        }


        if(this.historyLoaded[userId]){


            return;


        }


        try{


            const messages =

            await MeridianHistoryLoader.load(

                userId

            );


            messages.forEach(

                msg=>{


                    MeridianConversationStore

                    .addMessage(

                        userId,

                        {


                            messageId:

                            msg.messageId,


                            message:

                            msg.content,


                            content:

                            msg.content,


                            metadata:

                            msg.metadata

                            ||

                            {},


                            sender:

                            msg.sender,


                            messageType:

                            msg.type

                            ||

                            "text",


                            time:

                            msg.createdAt


                        }

                    );


                }

            );


            this.historyLoaded[userId] =

            true;


        }

        catch(error){


            console.error(

                "History load failed:",

                error

            );


        }


    },


    renderConversation(userId){


        if(!this.messages){


            return;


        }


        const messages =

        MeridianConversationStore

        .getMessages(

            userId

        );


        this.messages.innerHTML =

        "";


        if(messages.length === 0){


            const empty =

            document.createElement(

                "div"

            );


            empty.className =

            "conversation-empty-state";


            empty.textContent =

            "该访客尚未发送消息，可在下方主动回复。";


            this.messages.appendChild(

                empty

            );


            return;


        }


        messages.forEach(

            msg=>{


                const sender =

                msg.sender === "ai"

                ?

                "ai"

                :

                msg.sender === "admin"

                ?

                "admin"

                :

                "user";


                const div =

                document.createElement(

                    "div"

                );


                div.className =

                "message "

                +

                sender;


                if(sender === "ai"){


                    const label =

                    document.createElement(

                        "div"

                    );


                    label.className =

                    "message-ai-label";


                    label.textContent =

                    msg.metadata

                    &&

                    msg.metadata.webSearchUsed === true

                    ?

                    "GPT-5.6 AI · Web Search"

                    :

                    "GPT-5.6 AI";


                    div.appendChild(

                        label

                    );


                }


                const content =

                document.createElement(

                    "div"

                );


                content.className =

                "message-content";


                this.renderMessage(

                    content,

                    msg

                );


                const time =

                document.createElement(

                    "small"

                );


                time.textContent =

                msg.time

                ||

                "";


                div.appendChild(

                    content

                );


                div.appendChild(

                    time

                );


                this.messages.appendChild(

                    div

                );


            }

        );


        this.messages.scrollTop =

        this.messages.scrollHeight;


    },


    renderMessage(

        container,

        msg

    ){


        const type =

        msg.messageType

        ||

        msg.type

        ||

        "text";


        const content =

        msg.message

        ||

        msg.content

        ||

        "";


        const metadata =

        msg.metadata

        ||

        {};


        if(type === "link-card"){


            this.renderLinkCard(

                container,

                {


                    content:

                    content,


                    message:

                    content,


                    metadata:

                    metadata


                }

            );


            return;


        }


        if(type === "link"){


            const link =

            document.createElement(

                "a"

            );


            link.href =

            content;


            link.target =

            "_blank";


            link.rel =

            "noopener noreferrer";


            link.textContent =

            content;


            link.style.cursor =

            "pointer";


            link.style.textDecoration =

            "underline";


            container.appendChild(

                link

            );


            return;


        }


        if(type === "image"){


            const image =

            document.createElement(

                "img"

            );


            image.src =

            content;


            image.style.maxWidth =

            "300px";


            image.style.cursor =

            "pointer";


            image.onclick = ()=>{


                window.open(

                    content,

                    "_blank"

                );


            };


            container.appendChild(

                image

            );


            return;


        }


        if(type === "file"){


            const link =

            document.createElement(

                "a"

            );


            link.href =

            content;


            link.target =

            "_blank";


            link.textContent =

            "📎 文件";


            container.appendChild(

                link

            );


            return;


        }


        container.textContent =

        content;


        this.renderAiExtras(

            container,

            metadata

        );


    },



    ensureAiResponseStyles(){


        if(

            document.getElementById(

                "meridianAdminAiResponseStyles"

            )

        ){


            return;


        }


        const style =

        document.createElement(

            "style"

        );


        style.id =

        "meridianAdminAiResponseStyles";


        style.textContent = `

            .admin-ai-message-extras{
                margin-top:9px;
                padding-top:8px;
                border-top:1px solid rgba(15,23,42,.12);
            }

            .admin-ai-message-sources{
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:5px;
                margin-bottom:8px;
                font-size:11px;
            }

            .admin-ai-message-source{
                display:inline-flex;
                align-items:center;
                justify-content:flex-start;
                min-height:22px;
                max-width:100%;
                padding:3px 7px;
                border-radius:999px;
                background:#eef4ff;
                color:#1358bf !important;
                text-decoration:none !important;
                font-weight:700;
                line-height:1.25;
                overflow-wrap:anywhere;
            }

            .admin-ai-message-search-time{
                margin:0 0 8px;
                color:#64748b;
                font-size:10px;
                line-height:1.3;
            }

            .admin-ai-message-whatsapp-intro{
                margin-bottom:6px;
                color:#334155;
                font-size:12px;
                line-height:1.35;
            }

            .admin-ai-message-whatsapp-button{
                min-height:36px;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                padding:7px 12px;
                border-radius:9px;
                background:#25d366;
                color:#ffffff !important;
                text-decoration:none !important;
                font-size:12px;
                font-weight:700;
            }

        `;


        document.head.appendChild(

            style

        );


    },


    renderAiExtras(

        container,

        metadata

    ){


        const sources =

        Array.isArray(metadata.sources)

        ?

        metadata.sources

        .filter(

            source=>{


                return (

                    source

                    &&

                    this.getSafeUrl(

                        source.url

                    )

                );


            }

        )

        .slice(0,3)

        :

        [];


        const searchedAtDate =

        metadata.searchedAt

        ?

        new Date(metadata.searchedAt)

        :

        null;


        const searchedAtText =

        searchedAtDate

        &&

        !Number.isNaN(

            searchedAtDate.getTime()

        )

        ?

        searchedAtDate.toLocaleString()

        :

        "";


        const whatsapp =

        metadata.whatsapp

        &&

        typeof metadata.whatsapp === "object"

        ?

        metadata.whatsapp

        :

        null;


        const whatsappUrl =

        whatsapp

        ?

        this.getSafeUrl(

            whatsapp.url

        )

        :

        "";


        if(

            sources.length === 0

            &&

            !searchedAtText

            &&

            !whatsappUrl

        ){


            return;


        }


        this.ensureAiResponseStyles();


        const extras =

        document.createElement(

            "div"

        );


        extras.className =

        "admin-ai-message-extras";


        if(sources.length > 0){


            const sourceRow =

            document.createElement(

                "div"

            );


            sourceRow.className =

            "admin-ai-message-sources";


            const label =

            document.createElement(

                "span"

            );


            label.textContent =

            "Sources:";


            sourceRow.appendChild(

                label

            );


            sources.forEach(

                (source,index)=>{


                    const link =

                    document.createElement(

                        "a"

                    );


                    link.className =

                    "admin-ai-message-source";


                    link.href =

                    this.getSafeUrl(

                        source.url

                    );


                    link.target =

                    "_blank";


                    link.rel =

                    "noopener noreferrer";


                    const sourceTitle =

                    String(

                        source.title

                        ||

                        new URL(link.href).hostname

                    )

                    .trim();


                    const visibleTitle =

                    sourceTitle.length > 42

                    ?

                    sourceTitle.slice(0,39) + "..."

                    :

                    sourceTitle;


                    link.textContent =

                    `[${index + 1}] ${visibleTitle}`;


                    link.title =

                    sourceTitle;


                    sourceRow.appendChild(

                        link

                    );


                }

            );


            extras.appendChild(

                sourceRow

            );


        }


        if(searchedAtText){


            const searchedAt =

            document.createElement(

                "div"

            );


            searchedAt.className =

            "admin-ai-message-search-time";


            searchedAt.textContent =

            `Checked: ${searchedAtText}`;


            extras.appendChild(

                searchedAt

            );


        }


        if(whatsappUrl){


            if(whatsapp.intro){


                const intro =

                document.createElement(

                    "div"

                );


                intro.className =

                "admin-ai-message-whatsapp-intro";


                intro.textContent =

                whatsapp.intro;


                extras.appendChild(

                    intro

                );


            }


            const button =

            document.createElement(

                "a"

            );


            button.className =

            "admin-ai-message-whatsapp-button";


            button.href =

            whatsappUrl;


            button.target =

            "_blank";


            button.rel =

            "noopener noreferrer";


            button.textContent =

            whatsapp.buttonText

            ||

            "Get full briefing";


            extras.appendChild(

                button

            );


        }


        container.appendChild(

            extras

        );


    },


    getSafeUrl(value){


        if(!value){


            return "";


        }


        try{


            const url =

            new URL(

                value,

                window.location.origin

            );


            if(

                url.protocol !== "http:"

                &&

                url.protocol !== "https:"

            ){


                return "";


            }


            return url.href;


        }

        catch(error){


            return "";


        }


    },


    ensureLinkBubbleStyles(){


        if(

            document.getElementById(

                "meridianAdminWhatsAppBubbleStyles"

            )

        ){


            return;


        }


        const style =

        document.createElement(

            "style"

        );


        style.id =

        "meridianAdminWhatsAppBubbleStyles";


        style.textContent = `

            .meridian-briefing-card{
                width:215px;
                display:flex;
                flex-direction:column;
                align-items:stretch;
                gap:10px;
            }

            .meridian-briefing-message{
                color:#111827;
                font-size:14px;
                font-weight:600;
                line-height:1.45;
            }

            .meridian-whatsapp-bubble{
                position:relative;
                min-height:56px;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:13px 20px;
                border-radius:19px 19px 19px 6px;
                background:#25d366;
                color:#ffffff !important;
                text-decoration:none !important;
                text-align:center;
                font-size:15px;
                font-weight:700;
                line-height:1.3;
                box-shadow:0 7px 18px rgba(37,211,102,.30);
                cursor:pointer;
            }

            .meridian-whatsapp-bubble::after{
                content:"";
                position:absolute;
                left:0;
                bottom:-6px;
                width:15px;
                height:15px;
                background:#25d366;
                clip-path:polygon(0 0,100% 0,0 100%);
            }

        `;


        document.head.appendChild(

            style

        );


    },


    renderLinkCard(

        container,

        message

    ){


        const metadata =

        message.metadata

        ||

        {};


        const url =

        this.getSafeUrl(

            metadata.url

            ||

            message.content

            ||

            message.message

            ||

            ""

        );


        if(!url){


            container.textContent =

            message.content

            ||

            message.message

            ||

            "Link unavailable";


            return;


        }


        this.ensureLinkBubbleStyles();


        const wrapper =

        document.createElement(

            "div"

        );


        wrapper.className =

        "meridian-briefing-card";


        const intro =

        document.createElement(

            "div"

        );


        intro.className =

        "meridian-briefing-message";


        intro.textContent =

        metadata.title

        ||

        "Your briefing is ready.";


        const bubble =

        document.createElement(

            "a"

        );


        bubble.className =

        "meridian-whatsapp-bubble";


        bubble.href =

        url;


        bubble.target =

        "_blank";


        bubble.rel =

        "noopener noreferrer";


        bubble.textContent =

        metadata.buttonText

        ||

        "Claim for free";


        wrapper.appendChild(

            intro

        );


        wrapper.appendChild(

            bubble

        );


        container.appendChild(

            wrapper

        );


    },


    renderVisitorStats(){


        const stats =

        MeridianAdminState

        .getVisitorStats();


        if(this.activeConversationsCount){


            this.activeConversationsCount

            .textContent =

            stats.activeConversations;


        }


        if(this.silentVisitorsCount){


            this.silentVisitorsCount

            .textContent =

            stats.silentVisitors;


        }


        if(this.onlineVisitorsCount){


            this.onlineVisitorsCount

            .textContent =

            stats.onlineVisitors;


        }


        if(this.onlineSilentVisitorsCount){


            this.onlineSilentVisitorsCount

            .textContent =

            stats.onlineSilentVisitors;


        }


    },


    renderOnlineUsers(){


        if(this.onlineUsers){


            this.renderPresenceList(

                this.onlineUsers,

                MeridianAdminState.onlineUsers,

                "online-user"

            );


        }


        if(this.offlineUsers){


            this.renderPresenceList(

                this.offlineUsers,

                MeridianAdminState.offlineUsers,

                "offline-user"

            );


        }


    },


    escapeHtml(value){


        return String(

            value

            ===

            null

            ||

            value

            ===

            undefined

            ?

            ""

            :

            value

        )

        .replace(

            /&/g,

            "&amp;"

        )

        .replace(

            /</g,

            "&lt;"

        )

        .replace(

            />/g,

            "&gt;"

        )

        .replace(

            /"/g,

            "&quot;"

        )

        .replace(

            /'/g,

            "&#39;"

        );


    },


    getVisitorGeoLocation(item){


        return (

            item

            &&

            item.geoLocation

            &&

            typeof item.geoLocation === "object"

            ?

            item.geoLocation

            :

            {}

        );


    },


    formatVisitorLocation(item, compact = false){


        const geo =

        this.getVisitorGeoLocation(item);


        if(geo.lookupStatus !== "success"){


            return "";


        }


        const values =

        compact

        ?

        [

            geo.region,

            geo.city,

            geo.country

        ]

        :

        [

            geo.country,

            geo.region,

            geo.city

        ];


        return Array.from(

            new Set(

                values

                .map(value=>String(value || "").trim())

                .filter(Boolean)

            )

        )

        .slice(0, compact ? 2 : 3)

        .join(" · ");


    },


    formatVisitorLocalTime(item, compact = false){


        const geo =

        this.getVisitorGeoLocation(item);


        const timezone =

        String(geo.timezone || "")

        .trim();


        if(!timezone){


            return "";


        }


        try{


            return new Intl.DateTimeFormat(

                "zh-CN",

                compact

                ?

                {

                    timeZone: timezone,

                    hour: "2-digit",

                    minute: "2-digit",

                    hour12: false

                }

                :

                {

                    timeZone: timezone,

                    year: "numeric",

                    month: "2-digit",

                    day: "2-digit",

                    hour: "2-digit",

                    minute: "2-digit",

                    second: "2-digit",

                    hour12: false

                }

            )

            .format(new Date());


        }

        catch(error){


            return "";


        }


    },


    getSameIpCount(ipAddress){


        const target =

        String(ipAddress || "")

        .trim();


        if(!target){


            return 0;


        }


        const sessions =

        MeridianAdminState

        .getSessions

        ?

        MeridianAdminState.getSessions()

        :

        [];


        const sources = [


            ...(MeridianAdminState.onlineUsers || []),


            ...(MeridianAdminState.offlineUsers || []),


            ...(sessions || [])


        ];


        const userIds =

        new Set();


        sources.forEach(

            item=>{


                if(

                    item

                    &&

                    String(item.ipAddress || "").trim()

                    ===

                    target

                    &&

                    item.userId

                ){


                    userIds.add(item.userId);


                }


            }

        );


        return userIds.size;


    },


    async selectConversationSession(

        session,

        item = null

    ){


        if(

            !session

            ||

            !session.userId

        ){


            return;


        }


        MeridianAdminState

        .selectSession(

            session

        );


        await this.loadHistory(

            session.userId

        );


        this.renderConversation(

            session.userId

        );


        if(item){


            this.highlightSession(

                item

            );


        }


        if(

            window.MeridianAdminLeads

        ){


            window.MeridianAdminLeads

            .renderCurrentSession(

                session

            );


        }


    },


    renderPresenceList(

        container,

        users,

        className

    ){


        container.innerHTML =

        "";


        (

            users

            ||

            []

        )

        .forEach(

            user=>{


                const item =

                document.createElement(

                    "div"

                );


                item.className =

                className;


                const userId =

                user.userId

                ||

                "Unknown visitor";


                const title =

                document.createElement(

                    "strong"

                );


                title.textContent =

                userId;


                item.appendChild(title);


                const ipAddress =

                String(

                    user.ipAddress || ""

                )

                .trim();


                if(ipAddress){


                    const sameIpCount =

                    this.getSameIpCount(

                        ipAddress

                    );


                    const network =

                    document.createElement(

                        "small"

                    );


                    network.className =

                    "presence-network-meta";


                    network.textContent =

                    `IP ${ipAddress}`

                    +

                    (

                        sameIpCount > 1

                        ?

                        ` · 同 IP ${sameIpCount}`

                        :

                        ""

                    );


                    item.appendChild(network);


                }


                const location =

                this.formatVisitorLocation(

                    user,

                    true

                );


                const localTime =

                this.formatVisitorLocalTime(

                    user,

                    true

                );


                if(location || localTime){


                    const locationMeta =

                    document.createElement(

                        "small"

                    );


                    locationMeta.className =

                    "presence-network-meta";


                    locationMeta.textContent =

                    [

                        location,

                        localTime

                        ?

                        `当地 ${localTime}`

                        :

                        ""

                    ]

                    .filter(Boolean)

                    .join(" · ");


                    item.appendChild(

                        locationMeta

                    );


                }


                item.onclick =

                async()=>{


                    let session =

                    MeridianAdminState

                    .getSessionByUserId(

                        user.userId

                    );


                    if(

                        window.MeridianAdminLeads

                        &&

                        window.MeridianAdminLeads

                        .isReady()

                    ){


                        const enriched =

                        await window.MeridianAdminLeads

                        .fetchSession(

                            user.userId

                        );


                        session =

                        enriched

                        ||

                        session;


                    }


                    if(session){


                        await this

                        .selectConversationSession(

                            session

                        );


                    }


                };


                container.appendChild(

                    item

                );


            }

        );


    },


    renderSessions(restoreCurrentSession = true){


        if(!this.sessions){


            return;


        }


        const sessions =

        MeridianAdminState

        .getSessions();


        const currentId =

        MeridianAdminState

        .getCurrentConversationId();


        this.sessions.innerHTML =

        "";


        if(!sessions.length){


            const empty =

            document.createElement(

                "div"

            );


            empty.className =

            "conversation-empty-state";


            empty.textContent =

            "没有符合当前筛选条件的会话";


            this.sessions.appendChild(

                empty

            );


        }


        sessions.forEach(

            session=>{


                const div =

                document.createElement(

                    "div"

                );


                div.className =

                "session-item";


                div.dataset.userId =

                session.userId

                ||

                "";


                if(

                    currentId

                    ===

                    session.userId

                ){


                    div.classList.add(

                        "selected"

                    );


                }


                const statusIcon =

                session.status === "online"

                ?

                "🟢"

                :

                "⚫";


                const time =

                session.lastMessageAt

                ?

                new Date(

                    session.lastMessageAt

                )

                .toLocaleString()

                :

                "";


                const unread =

                session.unreadCount > 0

                ?

                `<span class="session-unread-badge">🔴${Number(session.unreadCount) || 0}</span>`

                :

                "";


                const mode =

                session.aiMode

                ||

                "off";


                const takeover =

                session.humanTakeover === true

                ?

                " · HUMAN"

                :

                "";


                const conversion =

                session.conversionState

                ||

                {};


                const conversionStage =

                conversion.stage

                ||

                "new";


                const conversionAsset =

                conversion.asset

                ?

                ` · ${this.escapeHtml(conversion.asset)}`

                :

                "";


                const replyCount =

                Number(

                    conversion.aiReplyCount

                    ||

                    0

                );


                const replyLimit =

                conversion.aiReplyLimitReached === true

                ?

                " · AI LIMIT"

                :

                "";


                const conversionFlags =

                conversion.whatsappClicked === true

                ?

                " · WA CLICKED"

                :

                conversion.doNotPush === true

                ?

                " · NO PUSH"

                :

                "";


                const lead =

                session.leadIntent

                ||

                {

                    level:

                    "low",

                    score:

                    0

                };


                const leadLevel =

                [

                    "high",

                    "medium",

                    "low"

                ]

                .includes(lead.level)

                ?

                lead.level

                :

                "low";


                const priority =

                session.priority

                ||

                "normal";

                const followUpStatus =

                session.followUpStatus

                ||

                "not_followed_up";


                const followUpLabels = {
                    not_followed_up:
                    "未跟进",

                    contacted:
                    "已联系",

                    joined_whatsapp:
                    "已加入WA",

                    converted:
                    "已转化",

                    invalid:
                    "无效"
                };


                const followUpLabel =

                followUpLabels[
                    followUpStatus
                ]

                ||

                "未跟进";



                const tags =

                Array.from(

                    new Set(

                        [

                            ...(

                                Array.isArray(session.tags)

                                ?

                                session.tags

                                :

                                []

                            ),

                            ...(

                                Array.isArray(session.autoTags)

                                ?

                                session.autoTags

                                :

                                []

                            )

                        ]

                    )

                )

                .slice(

                    0,

                    4

                );


                const ipAddress =

                String(

                    session.ipAddress || ""

                )

                .trim();


                const sameIpCount =

                ipAddress

                ?

                this.getSameIpCount(ipAddress)

                :

                0;


                const location =

                this.formatVisitorLocation(

                    session,

                    true

                );


                const localTime =

                this.formatVisitorLocalTime(

                    session,

                    true

                );


                const networkLines = [];


                if(ipAddress){


                    networkLines.push(

                        `IP ${this.escapeHtml(ipAddress)}${sameIpCount > 1 ? ` · 同 IP ${sameIpCount}` : ""}`

                    );


                }


                if(location || localTime){


                    networkLines.push(

                        [

                            location

                            ?

                            this.escapeHtml(location)

                            :

                            "",

                            localTime

                            ?

                            `当地 ${this.escapeHtml(localTime)}`

                            :

                            ""

                        ]

                        .filter(Boolean)

                        .join(" · ")

                    );


                }


                const networkMarkup =

                networkLines

                .map(line=>`<div class="session-network-meta">${line}</div>`)

                .join("");


                const tagMarkup =

                tags.length

                ?

                `<div class="session-tag-row">${tags.map(tag=>`<span>${this.escapeHtml(tag)}</span>`).join("")}</div>`

                :

                "";


                div.innerHTML = `

                    <div class="session-item-heading">
                        <b>
                            ${statusIcon}
                            ${this.escapeHtml(session.userId)}
                        </b>
                        <span class="session-intent-badge intent-${leadLevel}">
                            ${leadLevel.toUpperCase()} ${Number(lead.score) || 0}
                        </span>
                    </div>

                    ${networkMarkup}

                    <div class="session-message-preview">
                        ${this.escapeHtml(session.lastMessage || "暂无消息")}
                    </div>

                    <small>
                        ${this.escapeHtml(time)}
                        ${unread}
                    </small>

                    <div class="session-badge-row">
                        <span class="session-ai-badge ai-${this.escapeHtml(mode)}">
                            AI ${this.escapeHtml(String(mode).toUpperCase())}${takeover}
                        </span>
                        <span class="session-priority-badge priority-${this.escapeHtml(priority)}">
                            ${this.escapeHtml(String(priority).toUpperCase())}
                        </span>
                        <span class="session-follow-up-badge follow-up-${this.escapeHtml(followUpStatus)}">
                            ${this.escapeHtml(followUpLabel)}
                        </span>
                    </div>

                    <span class="session-ai-badge session-conversion-badge">
                        ${this.escapeHtml(conversionStage)}${conversionAsset}
                        · AI ${replyCount}/5
                        · CTA ${Number(conversion.ctaShownCount) || 0}
                        ${conversionFlags}${replyLimit}
                    </span>

                    ${tagMarkup}

                `;


                div.onclick =

                async()=>{


                    await this

                    .selectConversationSession(

                        session,

                        div

                    );


                };


                this.sessions.appendChild(

                    div

                );


            }

        );


        if(restoreCurrentSession){


            this.restoreCurrentSession();


        }


    },


    highlightSession(item){


        document

        .querySelectorAll(

            ".session-item"

        )

        .forEach(

            element=>{


                element.classList.remove(

                    "selected"

                );


            }

        );


        if(item){


            item.classList.add(

                "selected"

            );


        }


    },


    bindSend(callback){


        if(this.sendButton){


            this.sendButton.onclick =

            callback;


        }


        if(this.input){


            this.input.addEventListener(

                "keydown",

                event=>{


                    if(event.key === "Enter"){


                        callback();


                    }


                }

            );


        }


    },


    getInputMessage(){


        return this.input

        ?

        this.input.value.trim()

        :

        "";


    },


    clearInput(){


        if(this.input){


            this.input.value =

            "";


        }


    }


};
