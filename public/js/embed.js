/**
 * Meridian Chat SDK
 *
 * Embed Loader
 *
 * Version:
 * v1.1.0
 *
 * One Line Embed
 *
 * Usage:
 *
 * <script src="/js/embed.js"></script>
 *
 */


(function(){



    const currentScript =

    document.currentScript;





    if(!currentScript){


        console.error(

            "Meridian Embed: script not found"

        );


        return;


    }






    const BASE_URL =

    currentScript.src

    .split("/js/embed.js")[0];









    /**
     * Load CSS
     */
    function loadCSS(){



        const exists =

        document.querySelector(

            'link[data-meridian-css]'

        );



        if(exists){

            return;

        }







        const link =

        document.createElement(

            "link"

        );



        link.rel =

        "stylesheet";



        link.href =

        BASE_URL +

        "/css/chat.css";



        link.dataset.meridianCss =

        "true";



        document.head.appendChild(

            link

        );


    }









    /**
     * SDK Scripts
     */
    const scripts = [



        "/socket.io/socket.io.js",



        "/js/core/config.js",



        "/js/core/events.js",



        "/js/core/logger.js",



        "/js/core/time.js",



        "/js/core/socket.js",



        "/js/core/message-adapter.js",



        "/js/core/presence.js",



        "/js/tracking/pixel.js",



        "/js/upload.js",



        "/js/ui/chat-ui.js"



    ];









    function loadScript(src){



        return new Promise(

            (resolve,reject)=>{



                const exists =

                document.querySelector(

                    `script[data-meridian-src="${src}"]`

                );



                if(exists){


                    resolve();

                    return;


                }







                const script =

                document.createElement(

                    "script"

                );



                script.src =

                BASE_URL + src;



                script.dataset.meridianSrc =

                src;





                script.onload =

                resolve;



                script.onerror =

                reject;



                document.body.appendChild(

                    script

                );



            }

        );



    }









    async function loadSDK(){



        try{



            /**
             * Load Style
             */
            loadCSS();







            /**
             * Load JS
             */
            for(

                const script of scripts

            ){



                await loadScript(

                    script

                );


            }







            initMeridian();



        }

        catch(error){



            console.error(

                "Meridian Embed Load Failed:",

                error

            );


        }


    }









    function initMeridian(){



        if(

            !window.MeridianSocket

        ){



            console.error(

                "MeridianSocket missing"

            );


            return;


        }







        if(

            window.MeridianPixel

        ){



            MeridianPixel.pageView();


        }







        MeridianSocket.connect();







        if(

            window.MeridianPresence

        ){



            MeridianPresence.init();


        }








        MeridianChatUI.init();








        MeridianSocket.onAdminReply(

            (data)=>{



                MeridianChatUI.addMessage(

                    data,

                    "admin"

                );


            }

        );







        MeridianSocket.onAiTyping(

            (data)=>{


                MeridianChatUI.setAiTyping(

                    data

                );


            }

        );




        console.log(

            "Meridian Embed Initialized v1.1"

        );



    }









    loadSDK();





})();