window.MeridianChatUI = {


  elements:{},



  init(){


    const config =
    window.MeridianConfig.chat;



    const container =
    document.createElement("div");



    container.className =
    "meridian-chat";



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






          <input

          id="meridianImageInput"

          type="file"

          accept="image/*"

          style="display:none;">






          <button

          id="meridianImageButton">

          📷

          </button>







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
      ),



      imageButton:

      document.getElementById(
        "meridianImageButton"
      ),



      imageInput:

      document.getElementById(
        "meridianImageInput"
      )


    };





    this.bindEvents();



  },









  bindEvents(){



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


      if(e.key==="Enter"){


        this.handleSend();


      }


    };







    this.elements.imageButton.onclick = ()=>{


      this.elements.imageInput.click();


    };







    this.elements.imageInput.onchange = ()=>{


      const file =

      this.elements.imageInput.files[0];



      if(file){


        this.handleImageUpload(file);


      }


    };



  },









  open(){


    this.elements.panel

    .classList

    .add("active");





    if(window.MeridianPixel){


      window.MeridianPixel.chatOpen();


    }


  },









  close(){


    this.elements.panel

    .classList

    .remove("active");


  },









  handleSend(){


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







    this.elements.input.value="";



  },









  async handleImageUpload(file){



    try{



      if(!window.MeridianUpload){



        console.error(

          "MeridianUpload not loaded"

        );


        return;


      }








      const url =

      await MeridianUpload.uploadImage(

        file

      );







      const message =

      MeridianMessageAdapter

      .createImageMessage(

        url

      );








      this.addMessage(

        message,

        "user"

      );







      if(window.MeridianSocket){



        window.MeridianSocket.sendMessage(

          message

        );


      }





    }

    catch(error){



      console.error(

        "Image upload failed:",

        error

      );



    }


  },









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









  renderMessage(

    container,

    message

  ){



    let type="text";

    let content="";





    if(typeof message==="string"){


      content=message;


    }

    else if(message){



      type=

      message.type

      ||

      "text";



      content=

      message.content

      ||

      message.message

      ||

      "";


    }








    if(

      type==="text"

      &&

      /^https?:\/\/.+/i.test(content)

    ){


      type="link";


    }









    if(type==="image"){



      const img =

      document.createElement("img");





      img.src=content;



      img.style.maxWidth="100%";



      img.style.cursor="pointer";





      img.onclick=()=>{


        window.open(

          content,

          "_blank"

        );


      };





      container.appendChild(img);



      return;


    }









    if(type==="link"){



      const link=

      document.createElement("a");





      link.href=content;



      link.target="_blank";



      link.rel=

      "noopener noreferrer";





      link.textContent=content;



      link.style.textDecoration=

      "underline";





      container.appendChild(link);



      return;


    }









    if(type==="file"){



      const link=

      document.createElement("a");





      link.href=content;



      link.target="_blank";



      link.textContent=

      "📎 文件";





      container.appendChild(link);



      return;


    }









    container.textContent=

    content;



  },









  scrollBottom(){



    this.elements.messages.scrollTop =

    this.elements.messages.scrollHeight;


  }


};