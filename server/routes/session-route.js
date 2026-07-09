/**
 * Meridian Session Route
 *
 * Admin Session Restore API
 *
 * Version:
 * v1.2.2
 */



const express =

require("express");



const router =

express.Router();





const sessionService =

require("../services/session-service");









/**
 * 获取全部Session
 *
 * GET
 * /api/sessions
 */
router.get(

    "/",

    async(req,res)=>{



        try{


            const sessions =

            await sessionService.getSessions();








            res.json({


                success:true,


                sessions:sessions



            });





        }

        catch(error){



            console.error(

                "Get sessions error:",

                error

            );







            res.status(500)

            .json({


                success:false,


                error:error.message



            });



        }



    }

);








module.exports = router;