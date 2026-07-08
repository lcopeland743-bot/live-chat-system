window.MeridianPixel = {

    track(eventName, data = {}) {

        if (!window.MeridianConfig.tracking.enabled) return;

        console.log("Meridian Pixel:", eventName, data);

        window.dispatchEvent(new CustomEvent("meridian_pixel_event", {

            detail: {

                event: eventName,

                data,

                time: new Date().toISOString()

            }

        }));

    },

    pageView() {

        this.track("page_view", {

            page: window.location.href

        });

    },

    chatOpen() {

        this.track("chat_open");

    },

    messageSent(message) {

        this.track("message_sent", {

            message

        });

    }

};