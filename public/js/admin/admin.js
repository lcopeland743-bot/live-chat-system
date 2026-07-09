/**
 * Meridian Admin Bootstrap
 *
 * Version:
 * v1.2.2
 *
 * Features:
 * - State Restore
 * - UI Init
 * - Socket Init
 * - Send Binding
 */



(function(){



    function initAdmin(){





        /**
         * 初始化后台状态
         */
        window.MeridianAdminState.init();







        /**
         * 初始化后台UI
         */
        window.MeridianAdminUI.init();








        /**
         * 初始化后台Socket
         */
        window.MeridianAdminSocket.init();








        /**
         * 绑定发送按钮
         */
        window.MeridianAdminUI.bindSend(

            ()=>{



                const message =

                window.MeridianAdminUI.getInputMessage();







                if(!message){


                    return;


                }








                window.MeridianAdminSocket.sendReply(

                    message

                );







                window.MeridianAdminUI.clearInput();




            }

        );









        console.log(

            "Meridian Admin initialized"

        );



    }









    if(

        document.readyState==="loading"

    ){



        document.addEventListener(

            "DOMContentLoaded",

            initAdmin

        );



    }
    else{


        initAdmin();


    }







})();