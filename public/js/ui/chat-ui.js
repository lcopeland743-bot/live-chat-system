window.MeridianChatUI = {

  elements: {},


  init() {

    const config = window.MeridianConfig.chat;


    const container = document.createElement("div");

    container.className = "meridian-chat";


    container.innerHTML = `

      <button 
      class="meridian-chat-button" 
      id="meridianChatButton">
      💬
      </button>


      <div 
      class="meridian-chat-panel" 
      id="meridianChatPanel">


        <div class="meridian-chat-header">

          <span>
          ${config.title}
          </span>

          <button id="meridianChatClose">
          ×
          </button>

        </div>



        <div 
        class="meridian-chat-messages"
        id="meridianChatMessages">

          <div class="
          meridian-message 
          meridian-message-admin">

          ${config.welcomeMessage}

          </div>


        </div>




        <div class="meridian-chat-input">


          <input

          id="meridianChatInput"

          type="text"

          placeholder="${config.placeholder}">


          <button

          id="meridianChatSend">

          ${config.sendButtonText}

          </button>


        </div>


      </div>

    `;



    document.body.appendChild(container);




    this.elements = {


      button:
      document.getElementById(
        "meridianChatButton"
      ),


      panel:
      document.getElementById(
        "meridianChatPanel"
      ),


      close:
      document.getElementById(
        "meridianChatClose"
      ),


      messages:
      document.getElementById(
        "meridianChatMessages"
      ),


      input:
      document.getElementById(
        "meridianChatInput"
      ),


      send:
      document.getElementById(
        "meridianChatSend"
      )


    };



    this.bindEvents();


  },







  bindEvents() {


    this.elements.button.onclick = ()=>{

      this.open();

    };



    this.elements.close.onclick = ()=>{

      this.close();

    };



    this.elements.send.onclick = ()=>{

      this.handleSend();

    };



    this.elements.input.onkeydown = (e)=>{


      if(e.key === "Enter"){

        this.handleSend();

      }


    };


  },







  open() {


    this.elements.panel
    .classList
    .add("active");



    if(window.MeridianPixel){

      window.MeridianPixel.chatOpen();

    }


  },







  close() {


    this.elements.panel
    .classList
    .remove("active");


  },







  /**
   * 用户发送消息
   *
   * 保持旧Socket协议
   */
  handleSend() {


    const message =

    this.elements.input.value.trim();



    if(!message){

      return;

    }




    this.addMessage(

      message,

      "user"

    );





    if(window.MeridianSocket){


      window.MeridianSocket.sendMessage(

        message

      );


    }





    if(window.MeridianPixel){


      window.MeridianPixel.messageSent(

        message

      );


    }





    this.elements.input.value = "";


  },







  /**
   * 消息显示入口
   *
   * 兼容：
   *
   * 旧：
   * "hello"
   *
   * 新：
   * {
   * type:"text",
   * content:"hello"
   * }
   */
  addMessage(

    message,

    sender="admin"

  ){


    const messageDiv =

    document.createElement("div");



    messageDiv.className =

    `meridian-message meridian-message-${sender}`;



    this.renderMessage(

      messageDiv,

      message

    );



    this.elements.messages.appendChild(

      messageDiv

    );



    this.scrollBottom();


  },







  /**
   * Rich Message Renderer
   */
  renderMessage(

    container,

    message

  ){



    let type = "text";

    let content = "";



    /**
     * 兼容旧字符串
     */
    if(typeof message === "string"){


      content = message;


    }


    else if(message){



      type =

      message.type

      ||

      "text";



      content =

      message.content

      ||

      message.message

      ||

      "";



    }


/**
 * 自动识别URL
 */
if(

    type === "text"

    &&

    /^https?:\/\/.+/i.test(content)

){

    type="link";

}




    /**
     * 图片
     */
    if(type === "image"){



      const img =

      document.createElement("img");



      img.src = content;


      img.style.maxWidth = "100%";


      img.style.cursor = "pointer";



      img.onclick = ()=>{


        window.open(

          content,

          "_blank"

        );


      };



      container.appendChild(img);



      return;


    }







    /**
     * 链接
     */
    if(type === "link"){


    const link =
    document.createElement("a");


    link.href = content;


    link.target = "_blank";


    link.rel =
    "noopener noreferrer";


    link.textContent =
    content;


    link.style.display =
    "inline-block";


    link.style.cursor =
    "pointer";


    link.style.textDecoration =
    "underline";


    container.appendChild(link);


    return;


}






    /**
     * 文件
     */
    if(type === "file"){



      const link =

      document.createElement("a");



      link.href = content;


      link.target = "_blank";


      link.textContent = "📎 文件";



      container.appendChild(link);



      return;


    }







    /**
     * 普通文字
     */
    container.textContent = content;


  },







  scrollBottom() {


    this.elements.messages.scrollTop =

    this.elements.messages.scrollHeight;


  }


};