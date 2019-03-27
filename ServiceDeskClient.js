"use strict";

const _=require("lodash")
, rp = require('request-promise-native')
, cheerio = require('cheerio')
, striptags = require('striptags')
, debug = require('debug')('dot4-client')
;

module.exports = class ServiceDeskClient {
	constructor(baseUrl, user, password, feedbackFunction){
		debug("creating ServiceDeskClient")
		this.baseUrl=baseUrl
		this.user=user
		this.password=password
		this.feedbackFunction=feedbackFunction
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
				, method: 'GET'
				, qs: {
					gaction: "showProblem"
					, sys_pm_id: id
					// , whocares: "UUUUUUUUUUUUbermitteln"
				}
			})
			
		debug(`loaded details for Problem (ID: ${id}). statusCode: ${resp.statusCode}`)
		
		return this.fetchProblemInfoFromHtmlDetails(resp.body)
	}
	
	fetchProblemInfoFromHtmlDetails(html){
		const $=cheerio.load(html)
		, loadedDetailsMapper={
			"formedit_2_2": "ID"
			, "formedit_2_5": "Newsletter"
			, "formedit_7_2": "Betreff"
			, "formedit_6_2": "Kategorie"
			, "formedit_9_2": 'Manager'
			, "formedit_10_2": 'Supportmitarbeiter'
			, "formedit_5_2": 'Status'
			, "formedit_4_2": 'Prioritaet'
			, "formedit_8_2": 'Beschreibung'
			, "formedit_11_2": 'Zieldatum'
		}
		, loadedDetails={}
		
		_.forEach(loadedDetailsMapper, (v,k)=>{
			loadedDetails[v]=striptags($(`#${k}`).html()).trim()
			// debug(`Detailspage. ${v}: ${loadedDetails[v]}`)
		})
		loadedDetails.sd_id=loadedDetails.ID
		return loadedDetails
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
		
		const $=cheerio.load(resp.body)
		, loadedDetailsMapper={
			"0": "ID"
			, "1": "Startzeitpunkt"
			, "4": "Betreff"
			, "21": "Kategorie"
			, "15": 'Manager'
			, "17": 'Supportmitarbeiter'
			, "20": 'Status'
			, "18": 'Prioritaet'
			, "19": 'Auswirkung'
			, "24": 'Zieldatum'
			
		}
		, loadedDetails=[]
		;
		
		let minRowOnPage=-1
		, maxRowOnPage=-1
		;
		$("td[id^='TD']").each(function() {
			if($(this).attr('id').match(/^TD([0-9]+)_[0-9]+/)){
				let row=parseInt(RegExp.$1)
				maxRowOnPage=Math.max(maxRowOnPage, row)
				if(minRowOnPage==-1)
					minRowOnPage=row
				else
					minRowOnPage=Math.min(minRowOnPage, row)
			}
		})
	   
		debug(`###### ANZAHL ZEILEN auf SD-PAge: ${maxRowOnPage}`)
		
		const rowIndices=_.range(minRowOnPage, maxRowOnPage+1)
		let rowCnt=0
		for(const row of rowIndices){
			const rowdata={}
			_.forEach(loadedDetailsMapper, (v,k)=>{
				rowdata[v]=striptags($(`#TD${row}_${k}`).html()).trim()
				// debug(`Listdata. ${v}: ${rowdata[v]}`)
			})
			rowdata.sd_id=rowdata.ID
			
			this.feedbackFunction(`downloading data (${++rowCnt}/${rowIndices.length+1})`);
			const detailData=await this.loadProblemWithId(rowdata["ID"])
			loadedDetails.push(_.merge(rowdata, detailData))
		}
		
		//TODO: click/load next page if more problems available. IS THERE PAGINATION
		
		if( /\d/.test(loadedDetails[0].ID) ) {
			return loadedDetails
		}
		
		debug(`${this.constructor.name}.fetchProblemInfoFromHtmlList(): possible parsing problem`)
		return null
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
					// , whocares: 'Hinzufuuuuuuuuuuuuugen'
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

