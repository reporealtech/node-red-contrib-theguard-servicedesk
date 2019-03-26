"use strict";

const _=require("lodash")
, rp = require('request-promise-native')
, cheerio = require('cheerio')
;

class ServiceDeskClient {
	constructor(baseUrl, user, password, node){
		node.log("creating ServiceDeskClient")
		this.baseUrl=baseUrl
		this.user=user
		this.password=password
		this.node=node
		//this.cookiejar = rp.jar();
		
		if(this.baseUrl.endsWith('/'))
			this.baseUrl+='/'
	}
	async sdRequest(options){
		let url=options.uri
		if(url.match(/(.+?):\/\/(.+)/)){
			url=RegExp.$1+'://'+this.user+':'+this.password+'@'+RegExp.$2
		}
		if(url.indexOf(this.user)==-1)
			throw new Error("invalid url "+url)
		
		options.uri=url
		options.resolveWithFullResponse=true
		let resp= await rp(options)
		if(resp.statusCode != 200)
			throw new Error(`statusCode: ${resp.statusCode}`)
		return resp;
	}
	async createProblems(problemDataParam){
		let problemDataArray=[]
		
		if(_.isArray(problemDataParam))
			problemDataArray=problemDataParam
		else {
			problemDataArray.push(problemDataParam)
		}
		
		for(const problemReq of problemDataArray){
			//pmtool.asp
			let resp=await this.sdRequest({
				uri: this.baseUrl+"ETM/ProblemManagement/pmtool.asp"
				, method: 'POST'
				, form: {
					gaction: 'insertProblem'
					, sys_pm_showatnewsticker: 0
					, sys_pm_priorityref: 4
					, sys_pm_categoryref_name: 'test'
					, sys_pm_categoryref: 71
					, sys_pm_categoryref_star: 0
					, sys_pm_name: problemReq.name
					, sys_pm_description: problemReq.description
					, sys_pm_targetdate_chkdate: 'Y'
					, sys_pm_targetdate_hour: 0
					, sys_pm_targetdate_minutes: 0
					, whocares: 'Hinzufügen'
				}
			})
			
			this.node.log(`statusCode: ${resp.statusCode}`)
			let $=cheerio.load(resp.body)
			, newId=$("#formedit_2_2").html()
			this.node.log(`SD-ID: ${newId}`)
			problemReq.sd_id=newId
		}
		this.node.log(JSON.stringify(_.first(problemDataArray)))
		return problemDataArray
	}
}

module.exports = function(RED) {
    function problemCreate(config) {

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
					msg.payload=await sdCli.createProblems(msg.payload)
					
					node.send(msg);
					node.status({fill:"green",shape:"dot",text:`finished`});
				} catch(e) {
					node.log("ERROR: "+e)
					node.status({fill:"red",shape:"dot",text:`${e}`});
				}
			});
		}
    }
    RED.nodes.registerType("problem-create",problemCreate);
}