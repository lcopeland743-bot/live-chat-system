const {
    connectDatabase
}
=
require("../server/database/connection");


const agentService =
require("../server/services/agent-service");



async function test(){


    await connectDatabase();



    const agent =

    await agentService.createAgent({

        agentId:"agent_test_001",

        name:"Test Agent"

    });



    console.log(agent);



    process.exit();


}



test();