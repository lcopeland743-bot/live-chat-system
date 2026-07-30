/**
 * Meridian Briefing Auto Reply Service
 *
 * Version:
 * v2.4.2
 *
 * Responsibilities:
 * - Investor profile choice validation
 * - Automatic briefing response selection
 * - WhatsApp prefilled link generation
 */

const whatsappSettingsService =
require("./whatsapp-settings-service");


const INTERACTION_TYPE =
"investor-profile";


const choices = Object.freeze({


    "long-term-investor":{


        label:

        "Long-term Investor",


        response:

        `Fair enough — and honestly, this is a tricky moment for long-term money. The Fed just flipped from "when's the next cut" to talking about possible hikes, and AI names dropped over 12% in June before bouncing. Moments like this are where regime tracking earns its keep: knowing whether the environment is actually turning, or just shaking out weak hands. That's exactly what our daily briefing breaks down — in about 5 minutes.`,


        whatsappPrefill:

        "Please send me the Long-Term Investor Briefing 📊"


    },


    "short-term-trader":{


        label:

        "Short-term Trader",


        response:

        `Then you already know what June felt like — AI stocks down double digits, then a sharp bounce, oil spiking on Iran headlines, yields jumping around every Fed comment. Momentum is rotating fast between tech, energy and small caps right now. Our daily briefing maps where the pressure is building each morning, so you're not trading yesterday's story.`,


        whatsappPrefill:

        "Please send me the Short-Term Trading Briefing 📊"


    },


    "just-exploring":{


        label:

        "Just Exploring",


        response:

        `Smart place to start, honestly. Right now is a confusing tape even for pros: the market's near all-time highs, yet the Fed is hinting at rate hikes and AI stocks just had their worst month in a while. Our daily briefing translates all of that into plain English — what regime we're in, which sectors are moving, where risk is building. Five minutes a day, no jargon.`,


        whatsappPrefill:

        "Please send me today's AIRA Market Briefing 📊"


    }


});


function getChoice(choiceId){


    return choices[choiceId]

    ||

    null;


}


function getChoiceFromPayload(payload){


    const metadata =

    payload

    &&

    payload.metadata

    ?

    payload.metadata

    :

    {};



    if(

        metadata.interaction !== INTERACTION_TYPE

    ){


        return null;


    }



    const choice =

    getChoice(

        metadata.choiceId

    );



    if(

        !choice

        ||

        choice.label !== payload.content

    ){


        return null;


    }



    return {


        id:

        metadata.choiceId,


        ...choice


    };


}


function createWhatsAppUrl(prefill){


    return whatsappSettingsService

    .buildInternalUrl(prefill);


}




async function createAutoReplyMessages(choiceId){


    const choice =

    getChoice(choiceId);



    if(!choice){


        return [];


    }



    const messages = [


        {


            type:"text",


            content:

            choice.response,


            metadata:{


                automated:true,


                source:

                "investor-profile",


                choiceId:

                choiceId


            }


        }


    ];



    const whatsappSettings =

    await whatsappSettingsService

    .getResolvedSettings();



    if(

        !whatsappSettings.enabled

        ||

        !whatsappSettings.number

    ){


        return messages;


    }



    const url =

    createWhatsAppUrl(

        choice.whatsappPrefill

    );



    messages.push(


        {


            type:"link-card",


            content:url,


            metadata:{


                automated:true,


                source:

                "investor-profile",


                choiceId:

                choiceId,


                platform:

                "whatsapp",


                title:

                "Your briefing is ready.",


                buttonText:

                "Claim for free",


                prefill:

                choice.whatsappPrefill,


                url:url


            }


        }


    );



    return messages;


}



module.exports = {


    INTERACTION_TYPE,


    getChoice,


    getChoiceFromPayload,


    createWhatsAppUrl,


    createAutoReplyMessages


};
