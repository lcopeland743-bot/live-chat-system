/**
 * Meridian Upload Route
 *
 * Version:
 * v2.0.3
 *
 * Image Upload API
 */


const express = require("express");

const multer = require("multer");

const path = require("path");


const uploadService = require("../services/upload-service");



const router = express.Router();







const storage = multer.diskStorage({



    destination:(req,file,cb)=>{


        cb(

            null,

            uploadService.getUploadPath()

        );


    },





    filename:(req,file,cb)=>{


        const ext =

        path.extname(

            file.originalname

        );



        const filename =


        "img_" +

        Date.now()

        +

        "_"

        +

        Math.random()

        .toString(36)

        .substring(2,8)

        +

        ext;



        cb(

            null,

            filename

        );


    }



});









const upload = multer({



    storage:storage,



    limits:{


        fileSize:

        5 * 1024 * 1024


    },



    fileFilter:(req,file,cb)=>{



        if(

            uploadService.checkImageType(

                file

            )

        ){


            cb(

                null,

                true

            );


        }

        else{


            cb(

                new Error(

                    "Only image files allowed"

                )

            );


        }



    }



});









/**
 * Upload Image
 */
router.post(

    "/",

    upload.single("image"),

    (req,res)=>{



        if(!req.file){



            return res.json({



                success:false,

                message:

                "No file uploaded"



            });


        }







        res.json({



            success:true,



            url:

            "/uploads/"

            +

            req.file.filename



        });



    }



);







module.exports = router;