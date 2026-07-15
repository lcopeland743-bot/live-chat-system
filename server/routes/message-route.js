/**
 * Meridian Message Route
 *
 * Admin History Message API
 *
 * Version:
 * v2.1.2
 */



const express =
require("express");



const router =
express.Router();


const {
    requireAdminApi
}
=
require("../middleware/admin-auth-middleware");






const messageService =
require("../services/message-service");









router.use(

    requireAdminApi

);







/**
 * 获取用户历史消息
 *
 * GET
 * /api/messages/:userId
 */
router.get(

    "/:userId",

    async(req,res)=>{


        try{


            const userId =
            req.params.userId;





            const messages =

            await messageService.getMessages(

                userId

            );







            res.json({


                success:true,


                messages:messages



            });




        }
        catch(error){



            console.error(

                "Get messages error:",

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