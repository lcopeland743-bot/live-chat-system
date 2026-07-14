window.MeridianChatUI = {


  elements:{},


  investorChoices:[

    {

      id:"long-term-investor",

      label:"Long-term Investor"

    },

    {

      id:"short-term-trader",

      label:"Short-term Trader"

    },

    {

      id:"just-exploring",

      label:"Just Exploring"

    }

  ],


  investorChoiceLocked:false,



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


    this.renderInvestorChoices();



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


  getInvestorChoiceStorageKey(){


    const userId =

    window.MeridianConfig

    &&

    window.MeridianConfig.user

    ?

    window.MeridianConfig.user.id

    :

    "anonymous";



    return (

      "meridian_investor_choice_"

      +

      userId

    );


  },





  hasStoredInvestorChoice(){


    try{


      return Boolean(

        window.localStorage.getItem(

          this.getInvestorChoiceStorageKey()

        )

      );


    }

    catch(error){


      return false;


    }


  },





  storeInvestorChoice(choiceId){


    try{


      window.localStorage.setItem(

        this.getInvestorChoiceStorageKey(),

        choiceId

      );


    }

    catch(error){


      console.warn(

        "Investor choice could not be stored locally",

        error

      );


    }


  },





  renderInvestorChoices(){


    if(

      !this.elements.messages

      ||

      this.hasStoredInvestorChoice()

      ||

      document.getElementById(

        "meridianInvestorChoices"

      )

    ){

      return;

    }



    const panel =

    document.createElement("div");



    panel.id =

    "meridianInvestorChoices";



    panel.className =

    "meridian-investor-choices";



    this.investorChoices.forEach(

      choice=>{


        const button =

        document.createElement("button");



        button.type = "button";


        button.className =

        "meridian-investor-choice-button";


        button.textContent =

        choice.label;


        button.onclick = ()=>{


          this.handleInvestorChoice(

            choice,

            panel

          );


        };



        panel.appendChild(button);


      }

    );



    this.elements.messages.appendChild(

      panel

    );



    this.scrollBottom();


  },





  handleInvestorChoice(

    choice,

    panel

  ){


    if(this.investorChoiceLocked){

      return;

    }



    if(

      !window.MeridianSocket

      ||

      typeof window.MeridianSocket
      .sendInvestorChoice !== "function"

    ){


      console.error(

        "MeridianSocket investor choice support is not loaded"

      );


      return;


    }



    this.investorChoiceLocked = true;



    const buttons =

    panel.querySelectorAll(

      ".meridian-investor-choice-button"

    );



    buttons.forEach(

      button=>{


        button.disabled = true;


        if(

          button.textContent === choice.label

        ){


          button.classList.add(

            "selected"

          );


        }


      }

    );



    const sent =

    window.MeridianSocket

    .sendInvestorChoice(

      choice.id,

      choice.label

    );



    if(!sent){


      this.investorChoiceLocked = false;



      buttons.forEach(

        button=>{


          button.disabled = false;


          button.classList.remove(

            "selected"

          );


        }

      );



      return;


    }



    this.addMessage(

      choice.label,

      "user"

    );



    this.storeInvestorChoice(

      choice.id

    );



    window.setTimeout(

      ()=>{


        panel.remove();


      },

      180

    );


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

    let metadata={};





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



      metadata=

      message.metadata

      ||

      {};


    }








    if(

      type==="text"

      &&

      /^https?:\/\/.+/i.test(content)

    ){


      type="link";


    }









    if(type==="link-card"){


      this.renderLinkCard(

        container,

        {

          content:content,

          message:content,

          metadata:metadata

        }

      );


      return;


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








  getSafeUrl(value){


    if(!value){

      return "";

    }



    try{


      const url =
      new URL(

        value,

        window.location.origin

      );



      if(

        url.protocol!=="http:"

        &&

        url.protocol!=="https:"

      ){

        return "";

      }



      return url.href;


    }

    catch(error){


      return "";


    }


  },





  ensureLinkBubbleStyles(){


    if(

      document.getElementById(

        "meridianWhatsAppBubbleStyles"

      )

    ){

      return;

    }



    const style =

    document.createElement("style");



    style.id =

    "meridianWhatsAppBubbleStyles";



    style.textContent = `

      .meridian-briefing-card{

        width:205px;

        display:flex;

        flex-direction:column;

        align-items:stretch;

        gap:10px;

      }


      .meridian-briefing-message{

        color:#111827;

        font-size:14px;

        font-weight:600;

        line-height:1.45;

      }


      .meridian-whatsapp-bubble{

        position:relative;

        min-height:54px;

        display:flex;

        align-items:center;

        justify-content:center;

        padding:12px 18px;

        border-radius:18px 18px 18px 6px;

        background:#25d366;

        color:#ffffff !important;

        text-decoration:none !important;

        text-align:center;

        font-size:15px;

        font-weight:700;

        line-height:1.3;

        box-shadow:0 7px 18px rgba(37,211,102,.30);

        cursor:pointer;

        transition:transform .15s ease, box-shadow .15s ease;

      }


      .meridian-whatsapp-bubble::after{

        content:"";

        position:absolute;

        left:0;

        bottom:-6px;

        width:15px;

        height:15px;

        background:#25d366;

        clip-path:polygon(0 0,100% 0,0 100%);

      }


      .meridian-whatsapp-bubble:hover{

        transform:translateY(-1px);

        box-shadow:0 10px 22px rgba(37,211,102,.38);

      }


      .meridian-whatsapp-bubble:focus-visible{

        outline:3px solid rgba(37,211,102,.32);

        outline-offset:3px;

      }

    `;



    document.head.appendChild(style);


  },





  renderLinkCard(

    container,

    message

  ){


    const metadata =

    message.metadata || {};



    const url =

    this.getSafeUrl(

      metadata.url

      ||

      message.content

      ||

      message.message

      ||

      ""

    );



    if(!url){


      container.textContent =

      message.content

      ||

      message.message

      ||

      "Link unavailable";


      return;


    }



    this.ensureLinkBubbleStyles();



    const wrapper =

    document.createElement("div");



    wrapper.className =

    "meridian-briefing-card";



    const intro =

    document.createElement("div");



    intro.className =

    "meridian-briefing-message";



    intro.textContent =

    metadata.title

    ||

    "Your briefing is ready.";



    const bubble =

    document.createElement("a");



    bubble.className =

    "meridian-whatsapp-bubble";



    bubble.href = url;



    bubble.target = "_blank";



    bubble.rel =

    "noopener noreferrer";



    bubble.setAttribute(

      "aria-label",

      metadata.buttonText

      ||

      "Claim for free"

    );



    bubble.textContent =

    metadata.buttonText

    ||

    "Claim for free";



    wrapper.appendChild(intro);



    wrapper.appendChild(bubble);



    container.appendChild(wrapper);


  },




  scrollBottom(){



    this.elements.messages.scrollTop =

    this.elements.messages.scrollHeight;


  }


};

/**
 *
 * Meridian External Control API
 *
 * Version:
 * v1.2.0
 *
 */


window.MeridianChat = {


    open(){


        if(window.MeridianChatUI){


            window.MeridianChatUI.open();


        }


    },





    close(){


        if(window.MeridianChatUI){


            window.MeridianChatUI.close();


        }


    },





    toggle(){


        const panel =

        document.getElementById(

            "meridianChatPanel"

        );





        if(!panel){

            return;

        }





        if(

            panel.classList.contains(

                "active"

            )

        ){


            window.MeridianChatUI.close();


        }

        else{


            window.MeridianChatUI.open();


        }


    }


};