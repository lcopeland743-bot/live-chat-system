/**
 * Meridian Admin UI
 *
 * 后台界面渲染
 *
 * Version: v1.1.0
 */


window.MeridianAdminUI = {



    init(){


        this.messages =
        document.getElementById(
            "adminMessages"
        );



        this.onlineUsers =
        document.getElementById(
            "onlineUsers"
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





    /**
     * 绑定发送事件
     */
    bindSend(callback){



        if(!this.sendButton){

            return;

        }



        this.sendButton.onclick =
        ()=>{


            callback();


        };




        /**
         * Enter发送
         */
        if(this.input){


            this.input.addEventListener(

                "keydown",

                (event)=>{


                    if(
                        event.key === "Enter"
                    ){


                        event.preventDefault();


                        callback();


                    }


                }

            );


        }


    },





    /**
     * 获取输入内容
     */
    getInputMessage(){


        if(!this.input){

            return "";

        }


        return this.input.value.trim();


    },





    /**
     * 清空输入框
     */
    clearInput(){


        if(this.input){


            this.input.value = "";


        }


    },





    /**
     * 添加聊天消息
     */
    addMessage(
        message,
        type,
        time
    ){



        if(!this.messages){

            return;

        }




        const div =
        document.createElement(
            "div"
        );



        div.className =
        "message " + type;




        let timeHTML = "";



        if(time){


            timeHTML = `

                <div class="message-time">

                    ${MeridianTime.format(time)}

                </div>

            `;


        }




        div.innerHTML = `

            <div class="message-content">

                ${message}

            </div>

            ${timeHTML}

        `;




        this.messages.appendChild(
            div
        );



        this.messages.scrollTop =
        this.messages.scrollHeight;


    },





    /**
     * 用户进入
     */
    addEnter(data){



        this.addMessage(

            `
            用户进入：
            ${data.userId}
            `,

            "system",

            data.time

        );


    },





    /**
     * 在线用户渲染
     */
    renderOnlineUsers(){



        if(!this.onlineUsers){

            return;

        }



        const users =
        MeridianAdminState.getOnlineUsers();



        this.onlineUsers.innerHTML = "";




        if(
            users.length === 0
        ){


            this.onlineUsers.innerHTML =
            "<div>暂无在线用户</div>";


            return;


        }




        users.forEach(
            user=>{


                const item =
                document.createElement(
                    "div"
                );



                item.className =
                "online-user";



                item.innerHTML = `

                    <div>

                    🟢 ${user.userId}

                    </div>


                    <small>

                    ${
                        user.connectedAt

                        ?

                        MeridianTime.format(
                            user.connectedAt
                        )

                        :

                        ""

                    }

                    </small>

                `;



                this.onlineUsers.appendChild(
                    item
                );


            }

        );


    }



};