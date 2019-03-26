"use strict";

const _=require("lodash")
, rp = require('request-promise-native')
, cheerio = require('cheerio')
, striptags = require('striptags')
, debug = require('debug')('dot4-client')
;

module.exports = class ServiceDeskClient {
	constructor(baseUrl, user, password){
		debug("creating ServiceDeskClient")
		this.baseUrl=baseUrl
		this.user=user
		this.password=password
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
	
	async loadProblemWithId(id){
		let resp= await this.sdRequest({
			uri: this.baseUrl+"ETM/ProblemManagement/pmtool.asp"
				, method: 'POST'
				, form: {
					gaction: "searchProblemList"
					, sys_pm_id: id
					// , whocares: "Übermitteln"
				}
			})
			
		debug(`statusCode: ${resp.statusCode}`)
		
		const $=cheerio.load(resp.body)
		, loadedDetailsMapper={
			TD0_0: "ID"
			, TD0_1: "Startzeitpunkt"
			, TD0_4: "Betreff"
			, TD0_21: "Kategorie"
			, TD0_15: 'Manager'
			, TD0_17: 'Supportmitarbeiter'
			, TD0_20: 'Status'
			, TD0_18: 'Prioritaet'
			, TD0_19: 'Auswirkung'
			, TD0_24: 'Zieldatum'
			
		}
		, loadedDetails={}
		;
		_.forEach(loadedDetailsMapper, (v,k)=>{
			loadedDetails[v]=striptags($("#"+k).html()).trim()
			debug(`${v}: ${loadedDetails[v]}`)
		})
		
		return /\d/.test(loadedDetails.ID) ? loadedDetails : null
		
	}
	
	async listProblems(){
		let resp=await this.sdRequest({
			uri: this.baseUrl+"ETM/ProblemManagement/pmtool.asp"
			, method: 'POST'
			, form: {
				gaction: "listProblem"
				, sys_pm_managerref: 32
				, sys_pm_userdataref: 32
				, sys_pm_groupref: "6,7,24,4,5,28,27,26,30,29,31,32,17,16,15,1,2,3,25,20,19,18,-30,-31,-4,-6,-3,-5,-9,-7,-2,22,23,21"
				, sys_pm_problemstateref: 1
				, sys_pm_currentuserdataref: 32
				, lstSYS_ASSET_ProblemintEnd: 39
				, lstSYS_ASSET_ProblemstrOrderBy: "sys_pm_startdate"
				, lstSYS_ASSET_ProblemstrSort: "DESC"
				, lstSYS_ASSET_ProblemintListID: 100
			}
		})
		debug(JSON.stringify(resp))
	}
	
	async upsertProblems(problemDataParam){
		let problemDataArray=[]
		
		if(_.isArray(problemDataParam))
			problemDataArray=problemDataParam
		else {
			problemDataArray.push(problemDataParam)
		}
		
		debug(`first(problemDataArray): ${JSON.stringify(_.first(problemDataArray))}`)
		for(const problemReq of problemDataArray){
			let existingProblem
			, gaction
			;
			
			if(problemReq.sd_id)
				existingProblem=await this.loadProblemWithId(problemReq.sd_id)
			
			if(existingProblem){
				//UPDATE 
				debug(`update existing problem. sd_id: ${problemReq.sd_id}, ID: ${existingProblem.ID}`)
				gaction='updateProblem'
			} else {
				//CREATE
				debug("create new problem")
				gaction='insertProblem'
			}				
			let resp=await this.sdRequest({
				uri: this.baseUrl+"ETM/ProblemManagement/pmtool.asp"
				, method: 'POST'
				, form: {
					gaction
					// , sys_pm_showatnewsticker: 0
					, sys_pm_priorityref: 4
					, sys_pm_categoryref_name: 'test'
					, sys_pm_categoryref: 71
					// , sys_pm_categoryref_star: 0
					, sys_pm_name: problemReq.name
					, sys_pm_description: problemReq.description
					// , sys_pm_targetdate_chkdate: 'Y'
					// , sys_pm_targetdate_hour: 0
					// , sys_pm_targetdate_minutes: 0
					// , whocares: 'Hinzufügen'
					, sys_pm_id: problemReq.sd_id
				}
			})
			
			if(gaction=='insertProblem'){
				let $=cheerio.load(resp.body)
				, newId=$("#formedit_2_2").html()
				debug(`SD-ID: ${newId}`)
				problemReq.sd_id=newId
			}		
		}
		debug(JSON.stringify(_.first(problemDataArray)))
			
		return problemDataArray
	}
}

