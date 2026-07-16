/**
 * Meridian Admin AI Controller
 *
 * Version:
 * v2.3.3
 */

window.MeridianAdminAI = {


    configured:false,


    model:"gpt-5.6",


    selectedUserId:null,


    suggestion:"",


    suggestions:{},


    suggestionPayloads:{},


    errors:{},


    busy:false,


    init(){


        this.panel =

        document.getElementById(

            "adminAiPanel"

        );


        this.connectionStatus =

        document.getElementById(

            "adminAiConnectionStatus"

        );


        this.sessionStatus =

        document.getElementById(

            "adminAiSessionStatus"

        );


        this.suggestionArea =

        document.getElementById(

            "adminAiSuggestionArea"

        );


        this.suggestionInput =

        document.getElementById(

            "adminAiSuggestion"

        );


        this.generateButton =

        document.getElementById(

            "adminAiGenerateBtn"

        );


        this.useButton =

        document.getElementById(

            "adminAiUseBtn"

        );


        this.message =

        document.getElementById(

            "adminAiMessage"

        );


        this.modeButtons =

        Array.from(

            document.querySelectorAll(

                "[data-ai-mode]"

            )

        );


        this.bindEvents();


        this.loadStatus();


    },


    bindEvents(){


        this.modeButtons.forEach(

            button=>{


                button.onclick = ()=>{


                    this.setMode(

                        button.dataset.aiMode

                    );


                };


            }

        );


        if(this.generateButton){


            this.generateButton.onclick = ()=>{


                this.generateSuggestion();


            };


        }


        if(this.useButton){


            this.useButton.onclick = ()=>{


                this.useSuggestion();


            };


        }


    },


    async request(

        url,

        options={}

    ){


        const response =

        await fetch(

            url,

            {


                credentials:

                "same-origin",


                cache:

                "no-store",


                ...options


            }

        );


        if(

            window.MeridianAdminAuth

            &&

            window.MeridianAdminAuth

            .handleUnauthorizedResponse(

                response

            )

        ){


            throw new Error(

                "ADMIN_AUTH_REQUIRED"

            );


        }


        const result =

        await response.json()

        .catch(

            ()=>({})

        );


        if(!response.ok){


            throw new Error(

                result.message

                ||

                "AI request failed"

            );


        }


        return result;


    },


    async loadStatus(){


        try{


            const result =

            await this.request(

                "/api/admin/ai/status"

            );


            this.configured =

            result.ai.configured === true;


            this.model =

            result.ai.model

            ||

            "gpt-5.6";


            const searchLabel =

            result.ai.webSearchEnabled === true

            ?

            " · Web Search"

            :

            "";


            const limitLabel =

            result.ai.replyCharacterLimit

            ?

            ` · ${result.ai.replyCharacterLimit} chars`

            :

            "";


            this.connectionStatus.textContent =

            this.configured

            ?

            `${this.model}${searchLabel}${limitLabel}`

            :

            "API key missing";


            this.panel.classList.toggle(

                "not-configured",

                !this.configured

            );


            this.updateControls();


        }

        catch(error){


            console.error(

                "AI status load failed:",

                error

            );


            this.connectionStatus.textContent =

            "Status unavailable";


        }


    },


    renderSession(session){


        this.selectedUserId =

        session

        &&

        session.userId

        ?

        session.userId

        :

        null;


        const storedPayload =

        this.selectedUserId

        ?

        this.suggestionPayloads[

            this.selectedUserId

        ]

        :

        null;


        this.suggestion =

        storedPayload

        ?

        (

            storedPayload.content

            ||

            ""

        )

        :

        "";


        if(this.suggestionInput){


            this.suggestionInput.value =

            this.suggestion;


        }


        if(!session){


            this.sessionStatus.textContent =

            "Select a conversation";


            this.suggestionArea.hidden =

            true;


            this.updateControls();


            return;


        }


        const mode =

        session.aiMode

        ||

        "off";


        const takeover =

        session.humanTakeover === true;


        this.modeButtons.forEach(

            button=>{


                button.classList.toggle(

                    "active",

                    button.dataset.aiMode === mode

                );


            }

        );


        const conversion =

        session.conversionState

        ||

        {};


        const conversionLabel =

        conversion.stage

        ?

        ` · ${conversion.stage}`

        :

        "";


        const replyCount =

        Number(

            conversion.aiReplyCount

            ||

            0

        );


        const replyLimitLabel =

        conversion.aiReplyLimitReached === true

        ?

        ` · AI limit ${replyCount}/5`

        :

        ` · AI ${replyCount}/5`;


        this.sessionStatus.textContent =

        takeover

        ?

        `${mode.toUpperCase()} · Human takeover${conversionLabel}${replyLimitLabel}`

        :

        `${mode.toUpperCase()}${conversionLabel}${replyLimitLabel}`;


        this.suggestionArea.hidden =

        mode !== "assist";


        const storedError =

        this.errors[

            session.userId

        ]

        ||

        "";


        this.setMessage(

            takeover

            ?

            "AI is paused because an administrator replied. Select ASSIST or AUTO again to resume."

            :

            storedError

        );


        this.updateControls();


    },


    updateControls(){


        const disabled =

        !this.configured

        ||

        !this.selectedUserId

        ||

        this.busy;


        this.modeButtons.forEach(

            button=>{


                button.disabled =

                disabled;


            }

        );


        if(this.generateButton){


            this.generateButton.disabled =

            disabled;


        }


        if(this.useButton){


            this.useButton.disabled =

            disabled

            ||

            !this.suggestion;


        }


    },


    setBusy(value){


        this.busy =

        Boolean(value);


        this.panel.classList.toggle(

            "busy",

            this.busy

        );


        this.updateControls();


    },


    setMessage(text){


        if(this.message){


            this.message.textContent =

            text

            ||

            "";


        }


    },


    async setMode(mode){


        if(

            !this.selectedUserId

            ||

            !this.configured

        ){


            return;


        }


        this.setBusy(true);


        this.setMessage(

            "Updating AI mode..."

        );


        try{


            const result =

            await this.request(

                `/api/admin/ai/sessions/${encodeURIComponent(this.selectedUserId)}/mode`,

                {


                    method:"PATCH",


                    headers:{


                        "Content-Type":

                        "application/json"


                    },


                    body:

                    JSON.stringify({


                        mode:

                        mode


                    })


                }

            );


            MeridianAdminState.updateSession(

                result.session

            );


            this.renderSession(

                result.session

            );


            MeridianAdminUI.renderSessions();


            this.setMessage(

                mode === "auto"

                ?

                "AUTO enabled. New text messages will receive an AI reply."

                :

                mode === "assist"

                ?

                "ASSIST enabled. AI will draft replies for the administrator."

                :

                "AI disabled for this conversation."

            );


        }

        catch(error){


            console.error(

                "AI mode update failed:",

                error

            );


            this.setMessage(

                error.message

            );


        }

        finally{


            this.setBusy(false);


        }


    },


    async generateSuggestion(){


        if(

            !this.selectedUserId

            ||

            !this.configured

        ){


            return;


        }


        this.setBusy(true);


        this.setMessage(

            "Generating suggestion..."

        );


        try{


            const result =

            await this.request(

                `/api/admin/ai/sessions/${encodeURIComponent(this.selectedUserId)}/suggest`,

                {


                    method:"POST",


                    headers:{


                        "Content-Type":

                        "application/json"


                    }


                }

            );


            this.receiveSuggestion(

                result.suggestion

            );


        }

        catch(error){


            console.error(

                "AI suggestion failed:",

                error

            );


            this.setMessage(

                error.message

            );


        }

        finally{


            this.setBusy(false);


        }


    },


    receiveSuggestion(data){


        if(

            !data

            ||

            !data.userId

        ){


            return;


        }


        this.suggestionPayloads[

            data.userId

        ] =

        {


            ...data,


            metadata:

            data.metadata

            ||

            {


                source:"openai",


                model:

                data.model,


                responseId:

                data.responseId,


                webSearchUsed:

                data.webSearchUsed === true,


                searchedAt:

                data.searchedAt,


                sources:

                data.sources

                ||

                [],


                conversion:

                data.conversion

                ||

                null


            }


        };


        this.suggestions[

            data.userId

        ] =

        data.content

        ||

        "";


        if(

            data.userId !== this.selectedUserId

        ){


            return;


        }


        this.suggestion =

        data.content

        ||

        "";


        if(this.suggestionInput){


            this.suggestionInput.value =

            this.suggestion;


        }


        this.suggestionArea.hidden =

        false;


        this.setMessage(

            this.suggestion

            ?

            "AI suggestion ready."

            :

            "AI returned an empty suggestion."

        );


        this.updateControls();


    },


    receiveError(data){


        if(

            !data

            ||

            !data.userId

        ){


            return;


        }


        this.errors[

            data.userId

        ] =

        data.message

        ||

        "AI request failed.";


        if(

            data.userId !== this.selectedUserId

        ){


            return;


        }


        this.setMessage(

            this.errors[

                data.userId

            ]

        );


    },


    decorateOutgoingMessage(message){


        if(

            typeof message !== "string"

            ||

            !this.selectedUserId

        ){


            return message;


        }


        const payload =

        this.suggestionPayloads[

            this.selectedUserId

        ];


        if(

            !payload

            ||

            !payload.content

            ||

            message.trim() !== payload.content.trim()

        ){


            return message;


        }


        return {


            type:"text",


            content:

            message,


            message:

            message,


            metadata:

            {


                ...(

                    payload.metadata

                    ||

                    {}

                ),


                source:"openai-assist",


                aiMode:"assist"


            }


        };


    },


    markSuggestionUsed(){


        if(!this.selectedUserId){


            return;


        }


        delete this.suggestions[

            this.selectedUserId

        ];


        delete this.suggestionPayloads[

            this.selectedUserId

        ];


        this.suggestion =

        "";


        if(this.suggestionInput){


            this.suggestionInput.value =

            "";


        }


        this.updateControls();


    },


    useSuggestion(){


        if(!this.suggestion){


            return;


        }


        const input =

        document.getElementById(

            "adminReplyInput"

        );


        if(!input){


            return;


        }


        input.value =

        this.suggestion;


        input.focus();


        this.setMessage(

            "Suggestion copied to the reply box. Review it before sending."

        );


    }


};
