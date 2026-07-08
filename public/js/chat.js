(function () {


    function initMeridianChat() {


        MeridianPixel.pageView();



        MeridianSocket.connect();



        /**
         * 初始化用户在线状态
         */
        MeridianPresence.init();



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