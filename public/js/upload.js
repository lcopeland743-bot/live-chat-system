/**
 * Meridian Upload Client
 *
 * Version:
 * v2.0.3
 *
 * Image Upload Client
 */


window.MeridianUpload = {



    async uploadImage(file){



        const formData =

        new FormData();



        formData.append(

            "image",

            file

        );







        const response =

        await fetch(

            "/api/upload",

            {

                method:"POST",

                body:formData

            }

        );







        const result =

        await response.json();







        if(

            !result.success

        ){

            throw new Error(

                result.message

                ||

                "Upload failed"

            );

        }







        return result.url;



    }



};