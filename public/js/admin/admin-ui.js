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





    /**
     * 绑定发送
     */
    bindSend(callback){



        if(this.sendButton){


            this.sendButton.onclick =
            ()=>{


                callback();


            };


        }





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
     * 获取输入
     */
    getInputMessage(){


        if(!this.input){

            return "";

        }


        return this.input.value.trim();


    },





    /**
     * 清空输入
     */
    clearInput(){


        if(this.input){


            this.input.value="";


        }


    },





    /**
     * 消息显示
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



        div.innerHTML = `

            <div class="message-content">

                ${message}

            </div>


            ${
                time
                ?
                `
                <div class="message-time">

                ${MeridianTime.format(time)}

                </div>
                `
                :
                ""
            }


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
            用户进入:
            ${data.userId}
            `,

            "system",

            data.time

        );


    },





    /**
     * 在线用户
     */
    renderOnlineUsers(){



        if(!this.onlineUsers){

            return;

        }



        const users =
        MeridianAdminState.getOnlineUsers();



        this.onlineUsers.innerHTML="";




        if(users.length===0){


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

                    🟢 ${user.userId}

                    <br>

                    <small>

                    在线时间:
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


    },






    /**
     * 离线用户
     */
    renderOfflineUsers(){



        if(!this.offlineUsers){

            return;

        }



        const users =
        MeridianAdminState.getOfflineUsers();



        this.offlineUsers.innerHTML="";





        if(users.length===0){


            this.offlineUsers.innerHTML =
            "<div>暂无离线用户</div>";


            return;


        }






        users.forEach(

            user=>{


                const item =
                document.createElement(
                    "div"
                );



                item.className =
                "offline-user";



                item.innerHTML = `

                    ⚫ ${user.userId}

                    <br>

                    <small>

                    最后在线:

                    ${
                    user.lastSeen
                    ?
                    MeridianTime.format(
                        user.lastSeen
                    )
                    :
                    ""
                    }

                    </small>

                `;



                this.offlineUsers.appendChild(
                    item
                );


            }

        );


    }



};