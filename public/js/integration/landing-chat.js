/**
 * Meridian Landing Chat Adapter
 *
 * Version:
 * v1.0.0
 *
 * Purpose:
 * Connect landing page AI chat
 * with Meridian Chat SDK
 */


window.MeridianLandingChat = {



    init(){



        this.bindSend();



        this.bindQuickQuestions();



        console.log(

            "Landing Chat Adapter initialized"

        );



    },









    sendMessage(message){



        if(!message){

            return;

        }





        /**
         * 添加到落地页聊天窗口
         */
        this.addUserMessage(

            message

        );






        /**
         * 发送到 Meridian
         */
        if(window.MeridianSocket){



            MeridianSocket.sendMessage(

                message

            );


        }



    },









    bindSend(){



        const button =

        document.querySelector(

            "#chatSend"

        );



        const input =

        document.querySelector(

            "#chatInput"

        );







        if(!button || !input){



            console.warn(

                "Landing chat input not found"

            );


            return;


        }







        button.onclick = ()=>{



            const message =

            input.value.trim();







            if(message){



                this.sendMessage(

                    message

                );



                input.value="";



            }



        };







        input.addEventListener(

            "keydown",

            (e)=>{



                if(e.key==="Enter"){



                    button.click();



                }


            }

        );



    },









    bindQuickQuestions(){



        const buttons =

        document.querySelectorAll(

            ".quick-btn"

        );







        buttons.forEach(

            btn=>{



                btn.onclick = ()=>{



                    this.sendMessage(

                        btn.innerText

                    );



                };



            }

        );



    },









    addUserMessage(message){



        const box =

        document.querySelector(

            "#chatMessages"

        );



        if(!box){

            return;

        }







        const div =

        document.createElement(

            "div"

        );





        div.className =

        "message user";





        div.innerText =

        message;







        box.appendChild(

            div

        );



        box.scrollTop =

        box.scrollHeight;



    }







};