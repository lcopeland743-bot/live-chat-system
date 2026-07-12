/**
 * Meridian Admin Upload
 *
 * Version:
 * v2.0.10
 *
 * Admin Image Upload Controller
 */


window.MeridianAdminUpload = {


    init(){


        const imageBtn =

        document.getElementById(
            "adminImageBtn"
        );


        const imageInput =

        document.getElementById(
            "adminImageInput"
        );



        if(
            !imageBtn
            ||
            !imageInput
        ){

            console.warn(
                "Admin upload elements missing"
            );

            return;

        }



        imageBtn.onclick = ()=>{


            imageInput.click();


        };





        imageInput.onchange = async ()=>{


            const file =

            imageInput.files[0];



            if(!file){

                return;

            }




            try{


                const url =

                await MeridianUpload.uploadImage(
                    file
                );



                MeridianAdminSocket.sendReply({

                    type:"image",

                    content:url

                });



            }

            catch(error){


                console.error(

                    "Admin image upload failed:",

                    error

                );


            }



            imageInput.value="";


        };



    }


};