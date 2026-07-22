/**
 * Meridian Admin Error Monitoring Controller
 *
 * Version:
 * v2.3.10
 */

window.MeridianAdminErrors = {
    busy: false,
    pollTimer: null,


    init(){
        this.panel =
            document.getElementById(
                "adminErrorPanel"
            );

        if(!this.panel){
            return;
        }

        this.listElement =
            document.getElementById(
                "adminErrorList"
            );

        this.statusElement =
            document.getElementById(
                "adminErrorStatus"
            );

        this.unresolvedElement =
            document.getElementById(
                "adminErrorUnresolvedCount"
            );

        this.criticalElement =
            document.getElementById(
                "adminErrorCriticalCount"
            );

        this.errorElement =
            document.getElementById(
                "adminErrorErrorCount"
            );

        this.warningElement =
            document.getElementById(
                "adminErrorWarningCount"
            );

        this.refreshButton =
            document.getElementById(
                "adminErrorRefreshBtn"
            );

        this.resolveAllButton =
            document.getElementById(
                "adminErrorResolveAllBtn"
            );

        this.bindEvents();
        this.load();

        this.pollTimer =
            window.setInterval(
                ()=>this.load({silent:true}),
                30000
            );
    },


    bindEvents(){
        if(this.refreshButton){
            this.refreshButton.onclick =
                ()=>this.load();
        }

        if(this.resolveAllButton){
            this.resolveAllButton.onclick =
                ()=>this.resolveAll();
        }
    },


    async request(url,options={}){
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
            && window.MeridianAdminAuth
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
            .catch(()=>({}));

        if(!response.ok){
            throw new Error(
                result.message
                || "Error monitoring request failed"
            );
        }

        return result;
    },


    setBusy(value){
        this.busy =
            value === true;

        this.panel.classList.toggle(
            "busy",
            this.busy
        );

        if(this.refreshButton){
            this.refreshButton.disabled =
                this.busy;
        }

        if(this.resolveAllButton){
            this.resolveAllButton.disabled =
                this.busy;
        }
    },


    setStatus(message,isError=false){
        if(!this.statusElement){
            return;
        }

        this.statusElement.textContent =
            message || "";

        this.statusElement.classList.toggle(
            "error",
            isError === true
        );
    },


    renderSummary(summary={}){
        if(this.unresolvedElement){
            this.unresolvedElement.textContent =
                Number(summary.unresolved || 0);
        }

        if(this.criticalElement){
            this.criticalElement.textContent =
                Number(summary.critical || 0);
        }

        if(this.errorElement){
            this.errorElement.textContent =
                Number(summary.error || 0);
        }

        if(this.warningElement){
            this.warningElement.textContent =
                Number(summary.warning || 0);
        }

        this.panel.classList.toggle(
            "has-critical",
            Number(summary.critical || 0) > 0
        );
    },


    formatTime(value){
        if(!value){
            return "Unknown time";
        }

        const date =
            new Date(value);

        if(Number.isNaN(date.getTime())){
            return String(value);
        }

        return date.toLocaleString();
    },


    createTextElement(tag,className,text){
        const element =
            document.createElement(tag);

        if(className){
            element.className =
                className;
        }

        element.textContent =
            text;

        return element;
    },


    renderEvents(events=[]){
        if(!this.listElement){
            return;
        }

        this.listElement.textContent =
            "";

        if(!Array.isArray(events) || events.length === 0){
            this.listElement.appendChild(
                this.createTextElement(
                    "div",
                    "admin-error-empty",
                    "No unresolved system errors."
                )
            );
            return;
        }

        events.forEach(event=>{
            const level =
                ["warning","error","critical"]
                .includes(event.level)
                ? event.level
                : "error";

            const item =
                document.createElement("article");

            item.className =
                `admin-error-item level-${level}`;

            const heading =
                document.createElement("div");

            heading.className =
                "admin-error-item-heading";

            heading.appendChild(
                this.createTextElement(
                    "span",
                    `admin-error-level level-${level}`,
                    level.toUpperCase()
                )
            );

            heading.appendChild(
                this.createTextElement(
                    "span",
                    "admin-error-occurrences",
                    `×${Number(event.occurrenceCount || 1)}`
                )
            );

            item.appendChild(heading);

            item.appendChild(
                this.createTextElement(
                    "p",
                    "admin-error-message",
                    event.message
                    || "Unknown error"
                )
            );

            const sourceText =
                event.code
                ? `${event.source || "application"} · ${event.code}`
                : event.source || "application";

            item.appendChild(
                this.createTextElement(
                    "div",
                    "admin-error-source",
                    sourceText
                )
            );

            item.appendChild(
                this.createTextElement(
                    "time",
                    "admin-error-time",
                    this.formatTime(
                        event.lastSeenAt
                        || event.createdAt
                    )
                )
            );

            const resolveButton =
                this.createTextElement(
                    "button",
                    "admin-error-resolve-button",
                    "Resolve"
                );

            resolveButton.type =
                "button";

            resolveButton.onclick =
                ()=>this.resolveEvent(
                    event.eventId
                );

            item.appendChild(
                resolveButton
            );

            this.listElement.appendChild(
                item
            );
        });
    },


    async load({silent=false}={}){
        if(this.busy){
            return;
        }

        this.setBusy(true);

        if(!silent){
            this.setStatus(
                "Loading system errors..."
            );
        }

        try{
            const result =
                await this.request(
                    "/api/admin/errors?resolved=false&limit=20"
                );

            this.renderSummary(
                result.summary || {}
            );

            this.renderEvents(
                result.events || []
            );

            const buffered =
                result.summary
                ? Number(
                    result.summary.buffered
                    || 0
                )
                : 0;

            this.setStatus(
                buffered > 0
                ? `${buffered} event(s) waiting for database recovery.`
                : `Updated ${this.formatTime(new Date())}`
            );
        }
        catch(error){
            console.error(
                "Error monitor load failed:",
                error
            );

            this.setStatus(
                error.message
                || "Unable to load system errors.",
                true
            );
        }
        finally{
            this.setBusy(false);
        }
    },


    async resolveEvent(eventId){
        if(this.busy || !eventId){
            return;
        }

        this.setBusy(true);

        try{
            await this.request(
                `/api/admin/errors/${encodeURIComponent(eventId)}/resolve`,
                {
                    method:"PATCH",
                    headers:{
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }
        catch(error){
            console.error(
                "Error event resolve failed:",
                error
            );

            this.setStatus(
                error.message
                || "Unable to resolve error event.",
                true
            );
            return;
        }
        finally{
            this.setBusy(false);
        }

        await this.load();
    },


    async resolveAll(){
        if(this.busy){
            return;
        }

        this.setBusy(true);

        try{
            await this.request(
                "/api/admin/errors/resolve-all",
                {
                    method:"POST",
                    headers:{
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }
        catch(error){
            console.error(
                "Resolve all error events failed:",
                error
            );

            this.setStatus(
                error.message
                || "Unable to resolve all error events.",
                true
            );
            return;
        }
        finally{
            this.setBusy(false);
        }

        await this.load();
    }
};
