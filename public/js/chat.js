(function () {

    function initMeridianChat() {

        MeridianPixel.pageView();

        MeridianSocket.connect();

        MeridianChatUI.init();

        MeridianSocket.onAdminReply((data) => {

            MeridianChatUI.addMessage(

                data.message,

                "admin"

            );

        });

        MeridianLogger.info(
    "Chat SDK initialized"
);

    }

    if (document.readyState === "loading") {

        document.addEventListener(

            "DOMContentLoaded",

            initMeridianChat

        );

    } else {

        initMeridianChat();

    }

})();