"use strict";

const _=require("lodash")

, ServiceDeskClient = require('./ServiceDeskClient')
;

module.exports = function(RED) {
    function problemExport(config) {

        RED.nodes.createNode(this,config)
        const node = this
		, sdConfigNode = RED.nodes.getNode(config.sdconfig);

		if(sdConfigNode){
			

			node.on('input', async function(msg) {
				try{
					node.log(`create sd Client. url: ${sdConfigNode.url}, user: ${sdConfigNode.user}`)
					node.status({fill:"green",shape:"ring",text:"connecting"});
					
					const sdCli=new ServiceDeskClient(sdConfigNode.url, sdConfigNode.user, _.get(sdConfigNode,"credentials.password"), (feedback)=>{
						node.status({fill:"blue",shape:"ring",text: feedback});
					});
					node.log("connected to sd")

					node.status({fill:"blue",shape:"ring",text:"downloading data"});
					msg.payload=await sdCli.listProblems()
					
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
    RED.nodes.registerType("problem-export",problemExport);
}