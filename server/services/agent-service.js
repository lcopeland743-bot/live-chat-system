/**
 * Meridian Agent Service
 *
 * Multi Agent Foundation
 *
 * Version:
 * v2.0.1
 *
 * Features:
 * - Create Agent
 * - Find Agent
 * - List Agents
 * - Update Status
 */


const Agent =
require("../database/models/agent-model");









/**
 * 创建客服
 */
async function createAgent(data){



    const agent =

    await Agent.findOneAndUpdate(


        {


            agentId:

            data.agentId


        },


        {


            agentId:

            data.agentId,


            name:

            data.name || "",


            email:

            data.email || "",


            role:

            data.role || "agent",


            departmentId:

            data.departmentId || null



        },


        {


            new:true,


            upsert:true


        }


    );







    return agent;



}









/**
 * 获取客服
 */
async function getAgent(

    agentId

){



    return await Agent.findOne({


        agentId:agentId


    });



}









/**
 * 获取全部客服
 */
async function getAgents(){



    return await Agent.find()

    .sort({


        createdAt:-1


    });



}









/**
 * 更新客服状态
 */
async function updateStatus(

    agentId,

    status

){



    return await Agent.findOneAndUpdate(


        {


            agentId:agentId


        },


        {


            status:status,


            lastSeen:new Date()



        },


        {


            new:true


        }


    );



}









/**
 * 设置部门
 */
async function assignDepartment(

    agentId,

    departmentId

){



    return await Agent.findOneAndUpdate(


        {


            agentId:agentId


        },


        {


            departmentId:departmentId


        },


        {


            new:true


        }


    );



}









module.exports = {


    createAgent,


    getAgent,


    getAgents,


    updateStatus,


    assignDepartment


};