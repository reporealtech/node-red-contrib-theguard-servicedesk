"use strict";

const _=require("lodash")

, ServiceDeskClient = require('./ServiceDeskClient')
;

module.exports = function(RED) {
    function problemUpsert(config) {

        RED.nodes.createNode(this,config)
        const node = this
		, sdConfigNode = RED.nodes.getNode(config.sdconfig);

		if(sdConfigNode){
			
			
			node.on('input', async function(msg) {
				try{
					node.log(`create sd Client. url: ${sdConfigNode.url}, user: ${sdConfigNode.user}`)
					node.status({fill:"green",shape:"ring",text:"connecting"});
					
					const sdCli=new ServiceDeskClient(sdConfigNode.url, sdConfigNode.user, _.get(sdConfigNode,"credentials.password"), node);
					node.log("connected to sd")

					node.status({fill:"blue",shape:"ring",text:"uploading problem data"});
					msg.payload=await sdCli.upsertProblems(msg.payload)
					
					node.send(msg);
					node.status({fill:"green",shape:"dot",text:`finished`});
				} catch(e) {
					node.log("ERROR: "+e)
					node.status({fill:"red",shape:"dot",text:`${e}`});
					msg.payload=`${e}`
					node.send(msg)
				}
			});
		}
    }
    RED.nodes.registerType("problem-upsert",problemUpsert);
}