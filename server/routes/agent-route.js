/**
 * Meridian Agent Route
 *
 * Multi Agent Foundation
 *
 * Version:
 * v2.0.1
 *
 * Features:
 * - Create Agent
 * - List Agents
 * - Get Agent
 * - Update Agent Status
 */


const express =
require("express");


const router =
express.Router();


const agentService =
require("../services/agent-service");





/**
 * 创建客服
 *
 * POST
 * /api/agents
 */
router.post(

    "/",

    async(req,res)=>{


        try{


            const agent =

            await agentService.createAgent(

                req.body

            );



            res.json({

                success:true,

                agent:agent

            });



        }

        catch(error){


            console.error(error);


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









/**
 * 获取全部客服
 *
 * GET
 * /api/agents
 */
router.get(

    "/",

    async(req,res)=>{


        try{


            const agents =

            await agentService.getAgents();



            res.json({

                success:true,

                agents:agents

            });



        }

        catch(error){


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









/**
 * 获取单个客服
 *
 * GET
 * /api/agents/:agentId
 */
router.get(

    "/:agentId",

    async(req,res)=>{


        try{


            const agent =

            await agentService.getAgent(

                req.params.agentId

            );



            res.json({

                success:true,

                agent:agent

            });



        }

        catch(error){


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









/**
 * 更新客服状态
 *
 * PATCH
 * /api/agents/:agentId/status
 */
router.patch(

    "/:agentId/status",

    async(req,res)=>{


        try{


            const agent =

            await agentService.updateStatus(

                req.params.agentId,

                req.body.status

            );



            res.json({

                success:true,

                agent:agent

            });



        }

        catch(error){


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









module.exports = router;