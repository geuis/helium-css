//Helium-css v1.0
//Copyright 2010, Charles Lawrence http://twitter.com/geuis
//License: MIT License(http://opensource.org/licenses/mit-license.php) 
//release: 1/13/10

var helium = {

	data:{
		//timeout
		//status,
		//findinglist,
		//pagelist,
		//currenturl,
		//pages,
		//stylesheets
	},



	init:function(){

        //silently fail if localStorage is not available
        if( window.localStorage ){

            //load page data
            helium.load();

            helium.data.timeout = 3000;
            helium.save();

            helium.checkstatus();
        }

	},

	checkstatus:function(){
		//determine state
		//0: not started
		//1: finding stylesheets on all pages
		//2: loading/parsing stylesheets
		//3: check if selectors found on pages
		//4: finished, show report

		if(typeof helium.data.status === 'undefined')
			helium.data.status = 0;	


		if( helium.data.status === 0 ){
			//not started
			
			//prompt for list of pages
			var frag = document.createDocumentFragment();
			frag.appendChild( document.createElement('div') );
			frag.lastChild.setAttribute('id','cssdetectID');

			var html  = '<style>#cssdetectID{width:500px;height:300px;background-color:#fff;position:absolute;top:20%;left:50%;margin-left:-250px;z-index:90000000;border:2px solid #000;padding:15px;} #cssdetectTextarea{width:100%;min-height:200px;margin-bottom:10px;} #cssdetectStart, #cssdetectRestart{float:right; margin-left:10px;}</style>';
			var style = '<h2>Paste a list of pages on your site you want to test:</h2><textarea id="cssdetectTextarea"></textarea><br/><input type="button" id="cssdetectStart" value="Start"/> <input type="button" id="cssdetectRestart" value="Reset to Beginning"/>';
			frag.lastChild.innerHTML = html + style;
			document.getElementsByTagName('body')[0].appendChild(frag);

			//add listener to save list and start processing
			//document.getElementById('cssdetectStart').addEventListener('click',function(){

            helium.on( Sizzle('#cssdetectStart'), 'click', function(){

				//currently based on new-line separated values. Eventually supports sitemap XML format and comma-delineated.
				var list = document.getElementById('cssdetectTextarea').value.split('\n');
				
				helium.setPageList(list);

				//set status to 'finding'
				helium.data.status = 1;

				//copy pagelist
				helium.data.findinglist = helium.data.pagelist.slice(0); //copy not reference
				helium.save();
				
				//navigate to first page
				helium.nav( helium.data.findinglist );
						
			},false);

			//add listener to reset all data
			//document.getElementById('cssdetectRestart').addEventListener('click',function(){
            helium.on( Sizzle('#cssdetectRestart'), 'click', function(){
				//clear stored pages
				document.getElementById('cssdetectTextarea').value = '';
				
				helium.reset();
							
			}, false);

			return false;
		}

		
		if( helium.data.status === 1 ){
			//finding stylesheets
			helium.findstylesheets();
			
			return false;
		}

		if( helium.data.status === 2 ){
			//loading & parsing stylesheets
			helium.getcss();			
			
			return false;
		}
	
		if( helium.data.status === 3 ){
			//check if selectors found on pages
			helium.checkcss();

			return false;
		}
		
		if( helium.data.status === 4 ){
			//Finished, issue report
			helium.report();
		}
		
		

	},

	//display final report for unused selectors
	report:function(){

		var frag = document.createDocumentFragment();
		frag.appendChild( document.createElement('div') );
		frag.lastChild.setAttribute('id','cssdetectID');

		var div = frag.lastChild;

		var flip=false;

		var str = '<h2>CSS Detection Report</h2>';
		str+= '<input type="button" id="cssreportResetID" value="New Test (Warning: This erases all data from the current test)"/>';
		str+= '<p> <span class="green">**Green: unmatched selectors</span>, <span class="black">**Black: matched selectors that are defined with non-matched selectors</span>, <span class="red">**Red: a malformed selector</span> <span class="blue">**Blue: a selector with a pseudo-class. You must test these manually.</span></p>';
		
		//loop through stylesheets
		for(var i=0; i<helium.data.stylesheets.length; i++){
			
			//add stylesheet link
			str+= '<div><strong><a href="'+ helium.data.stylesheets[i].url +'">'+ helium.data.stylesheets[i].url +'</a></strong></div>';
			
			var sels = helium.data.stylesheets[i].selectors;

			if( sels.length > 0 ){
				str+= '<ul>';
				//display selectors that are false, ie never found on any tested pages
				for(var d=0; d < sels.length; d++){

					var tmpstr='';
					var counttrue=0;					

					for(var e=0; e < sels[d].length; e++){

						//identify selectors that were matched on a page somewhere, but are defined in combination with non-matched selectors.
						if( sels[d][e].v === true && sels[d].length > 1){
							if(e > 0){ tmpstr+=', '; }
							tmpstr+= '<strong><span class="selector matchedselector">'+sels[d][e].s+'</span></strong>';
							counttrue++;
						}
						
						//shows if a pseudo-class is found. Not currently testing these so the user must do so manually
						if( sels[d][e].v === 'pseudo_class' ){
							if(e > 0){ tmpstr+=', '; }
							tmpstr+='<strong class="pseudoclass">'+'<span class="selector">'+sels[d][e].s+'</span>'+'</strong>';
						}
						
						//shows as a broken selecgtor, ie it is written in a way the browser cannot parse.
						if( sels[d][e].v === 'broken_selector' ){
							if(e > 0){ tmpstr+=', '; }
							tmpstr+='<strong class="badselector">'+'<span class="selector">'+sels[d][e].s+'</span>'+'</strong>';
						}

						//shows if the selector was not found anywhere.
						if( sels[d][e].v === false ){
							if(e > 0){ tmpstr+=', '; }
							tmpstr+= '<span class="selector">'+sels[d][e].s+'</span>';
						}

					}
					
					//detect if multiple selectors defined together are all matched. Remove if so.
					if( counttrue === sels[d].length )
						tmpstr='';
					counttrue = 0;

					if(tmpstr !== ''){
						if( flip ){
							var classname=' class="alternate"';
							flip = false;
						}else{
							var classname='';
							flip = true;							
						}						
						str+='<li'+classname+'>'+tmpstr+'</li>';
					}

				}
				str+= '</ul>';
			}else{
				str+= 'No unmatched selectors found.';
			}
		}

		str+='<style>';
		str+='#cssdetectID{ font-family:arial;font-size:13px; font-weight:bold; color:#009000; border:2px solid #000; position:absolute; top:50px; left:50%; width:80%; margin-left:-40%; z-index:999999999; background-color:#fff;padding:15px;}';
		str+='#cssdetectID p .black, #cssdetectID .matchedselector{ color:#323839; }';
		str+='#cssdetectID p .red, #cssdetectID .badselector{ color:#cc0000; }';
		str+='#cssdetectID p .green{ color:#009000; }';
		str+='#cssdetectID p .blue, #cssdetectID .pseudoclass{ color:#0000cc; }';
		str+='#cssdetectID .alternate{ background-color:#EBFEFF; }';
		str+='#cssdetectID li:hover{ background-color:#8AD9FF; }';
		str+='#cssdetectID li strong{ font-weight:bold;}';
		str+='#cssdetectID div{ margin-top:20px; padding:5px 0 5px 0; border-top:3px solid #cc0000;}';
		str+='#cssdetectID div a{ font-weight:bold; font-size:14px; color:#0064B1}';
		str+='#cssdetectID #cssreportResetID{ position:absolute; top:3px;right:3px; padding:3px; border:1px solid #323839; background-color:#fff; -moz-border-radius: 5px; -webkit-border-radius: 5px;}';
		str+='#cssdetectID #cssreportResetID:hover{ cursor:pointer; }';
		str+='#cssdetectID #cssreportResetID:active{ text-shadow: 1px 1px 2px #000; }';
		str+='</style>';

		div.innerHTML = str;		
		document.getElementsByTagName('body')[0].appendChild( frag );

		//toggle selector visibility
		var sels = Sizzle('#cssdetectID ul li'); //document.querySelectorAll('#cssdetectID ul li');
		for(var s=0; s<sels.length; s++){
			(function(){
				var i=s;
//				sels[i].addEventListener('click',function(){
                helium.on( sels[i], 'click', function(){					
					this.style.opacity = '0.5';
				},false);
			})();			
		}

		//setup click-selector testing on the current page
		//var sels = document.querySelectorAll('#cssdetectID .selector');
		//for(var s=0; s<sels.length; s++){
		//	(function(){
		//		var i=s;
		//		sels[i].addEventListener('click',function(){
		//			console.log( document.querySelectorAll( this.innerHTML ) );
		//		},false);
		//	})();			
		//}

		//setup New Test button
		//document.getElementById('cssreportResetID').addEventListener('click',function(){
        helium.on( Sizzle('#cssreportResetID'), 'click', function(){
			helium.reset();
		},false);

	},
	
	reset:function(){
		//resets to beginning
		localStorage.removeItem('cssdetect');
		
		var nodes = Sizzle('#cssdetectID');
		for(var i=0;i<nodes.length;i++){
			nodes[i].parentNode.removeChild(nodes[i]);
		}
		
		helium.init();	
	},

	//check if selectors found on pages
	checkcss:function(){


		//delay time period set with helium.data.timeout. For purposes of waiting for content to render after load event(XHR)
		setTimeout(function(){

			//find the current page in the list of pages
			for(var i=0; i<helium.data.pages.length; i++){
				if( helium.data.pages[i].url === helium.data.currenturl ){

					//loop through stylesheet links on page
					for( var b=0; b<helium.data.pages[i].links.length; b++){

						//find the stylesheet array element that matches the stylesheet link currently being worked on
						var thislink = helium.data.pages[i].links[b];
						for( var c=0; c < helium.data.stylesheets.length; c++){
							if( helium.data.stylesheets[c].url === thislink ){

								var stylesheet = helium.data.stylesheets[c];

								//loop through selectors and test if active on this page. 
								//If it is a single selector( length===1 ), remove them from the array
								//If length > 1, the "sub selector" gets an attribute of 'true' to indicate it was found
								for( var d=0; d < stylesheet.selectors.length; d++ ){

									for( var e=0; e < stylesheet.selectors[d].length; e++ ){

										var response = helium.find( stylesheet.selectors[d][e].s );
										if( response === true ){
											stylesheet.selectors[d][e].v = true;
										}
										if( response === 'bad_selector'){
											stylesheet.selectors[d][e].v = response;
										}
										if( response === 'pseudo_class' ){
											stylesheet.selectors[d][e].v = 'pseudo_class';
										}

									}

								}

								//end the current loop
								c = helium.data.stylesheets.length;
							}						
						}

					}			
					
					//end the current loop
					i = helium.data.pages.length;
				}
			
			}

			helium.save();
			
			if( helium.data.pagelist.length > 0 ){
				//navigate to next page
				helium.nav();
			}else{
			
				helium.data.status = 4;
				helium.save();
				
				//do report
				helium.report();

			}
			
		}, helium.data.timeout);		


	},

	//search current page for selectors
	find:function(selector){

		//try/catch is used because querySelectorAll throws errors when syntactically invalid selectors are passed through. Useful for detection purposes.
		try{
			//returns true if selector found on page, false if not
			if( Sizzle(selector).length > 0 ){
				return true;
			}
		}catch(err){
			return 'broken_selector';
		}

		//detect if the selector includes a pseudo-class, i.e. :active, :focus
		var parse = selector.match(/\:+[\w-]+/gi);
		if( parse !== null && parse.hasOwnProperty('length') && parse.length > 0){
			return 'pseudo_class';
		}else{
			return false;
		}

	},

	findstylesheets:function(){

		var page = {
			url: helium.data.currenturl,
			links:[]
		}

		//find link elements on the page
		//var links = Sizzle("link[type='text/css'][rel='stylesheet']"); //## failing when type=text/css not being specified
        var links = Sizzle("link[rel='stylesheet']");
		
        for(var i=0; i<links.length; i++){

			//get href
			var tmplink = links[i].getAttribute('href');

			//append full URI if absent
			if( tmplink.indexOf('http') !== 0 && tmplink.substr(0,2) !== '//') {
                // make sure that relative URLs work too
                if (tmplink.indexOf('/') != 0) {
                    var lastDir = window.location.pathname.lastIndexOf('/');
                    if (lastDir > 0) {
                        directory = window.location.pathname.substring(0, lastDir+1);
                    } else {
                        directory = '/';
                    }
                    tmplink = directory + tmplink;
                }
				tmplink = window.location.protocol + '//' + window.location.hostname + ":" + window.location.port + tmplink;
			}

			//filter out urls not on this domain
			if( tmplink.indexOf( window.location.hostname ) !== -1 ){
				page.links.push( tmplink );
				
				if( typeof helium.data.stylesheets === 'undefined' )
					helium.data.stylesheets = [];
				
				helium.data.stylesheets.push( tmplink );
			}

		}

		//check if data field exists
		if( typeof helium.data.pages === 'undefined' )
			helium.data.pages = [];
		
		//save pages
		helium.data.pages.push( page );
		helium.save();

		//go to next page
		if( helium.data.findinglist.length > 0){
			helium.nav( helium.data.findinglist );
		}else{

            //remove duplicates from stylesheets list
            helium.data.stylesheets.sort();



			for( var i=0; i < helium.data.stylesheets.length-1; i++){
				if(helium.data.stylesheets[i] === helium.data.stylesheets[i+1]){
					helium.data.stylesheets.splice(i--,1);
				}
			}
			
			for( var i=0; i < helium.data.stylesheets.length; i++ ){
				var tmp = helium.data.stylesheets[i];
				helium.data.stylesheets[i] = {
					url: tmp,
					selectors: []
				}
			}
			
			//update status
			helium.data.status = 2;
			helium.save();
			
			helium.checkstatus();

		}
	},

	//list of stylesheet links on page
	getcss:function(){

		for(var i=0; i<helium.data.stylesheets.length; i++){
		
			//get content of stylesheets via XHR
			helium.get( helium.data.stylesheets[i].url, i, function(index, data){		

				//remove css comments
				data = data.replace(/\/\*[\s\S]*?\*\//gim,"");

				//parse selectors. ##NEWLINE REMOVAL IS HACKISH, CAN BE DONE BETTER WITH A BETTER REGEX
				var selectors = data.replace(/\n/g,'').match(/[^\}]+[\.\#\-\w]?(?=\{)/gim);

				//results of selector tests
				var results = [];

				for(var e=0; e<selectors.length; e++){

					var sel = selectors[e].split(',');
					
					//check for multiple selectors defined together. eg body,h1,h2,h3{}
					if( sel.length > 0 ){
						
						var arr = [];
						for(var t=0; t < sel.length; t++ ){
						
							arr.push({s: sel[t], v: false});
						
						}
						
						results.push( arr );

					}else{
						results.push( [{ s: selectors[e], v: false}] );
					}

				}

				//store stylesheet results
				helium.data.stylesheets[index].selectors = results;
				helium.save();

				//set status if the last request is done
				if( index === helium.data.stylesheets.length-1 ){
					helium.data.status = 3;
					
					//navigate to first page in helium.pagelist
					helium.nav();
				}
				
			});
		
		}
		
	},


	//navigate to next page in list
	nav:function( list ){
	
		//if no list is provided, default to pagelist
		if( !list ){
			var list = helium.data.pagelist;
		}
		
		//remove first url in list
		var next = list.shift();

		//stores the url that is being redirected to
		if( next !== undefined )
			helium.data.currenturl = next;

		helium.save();
											
		//redirect
		if( next !== undefined )
			window.location = next;

	},
	
	//store list of pages to be checked
	setPageList:function(pagelist){

		helium.data.pagelist = pagelist;
		helium.save();

	},

    //cross browser event handler
    //##Should be able to attach events to all objects sizzle passes in
    on: function(target, ev, fn){

        target = target[0] || target; //Sizzle passes through an array. Get the first element of the array or its object if index 0 doesnt exist

        if( window.attachEvent ){
            target.attachEvent('on'+ev, fn);
        }else{
            target.addEventListener(ev, fn, false);
        }
    },

	//return info from localStorage
	load:function(){

		if( !localStorage.cssdetect )
			localStorage.cssdetect = JSON.stringify({});

		helium.data = JSON.parse( localStorage.cssdetect );

	},

	save:function(){
		
		//store page data into localStorage
		localStorage.cssdetect = JSON.stringify( helium.data );

	},

    // when something goes wrong, nice to helium.clear() to nuke the local storage
    clear:function() {
        delete localStorage['cssdetect'];
    },

	get:function(url, index, callback){
		if(window.attachEvent){
			var http = new ActiveXObject("Microsoft.XMLHTTP");
		}else{
			var http = new XMLHttpRequest();
		}
		http.open("GET", url);
		http.onreadystatechange=function() {
			if(http.readyState === 4) {
				callback(index, http.responseText);
			}
		}
		http.send(null);
	}

};



/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/

    v100644 1408 lines (1108 sloc) 33.243 kb
 */
(function(){function y(a,b,c,d,f,e){for(var f=0,h=d.length;f<h;f++){var g=d[f];if(g){for(var i=!1,g=g[a];g;){if(g.sizcache===c){i=d[g.sizset];break}if(g.nodeType===1&&!e)g.sizcache=c,g.sizset=f;if(g.nodeName.toLowerCase()===b){i=g;break}g=g[a]}d[f]=i}}}function z(a,b,c,d,f,e){for(var f=0,h=d.length;f<h;f++){var g=d[f];if(g){for(var j=!1,g=g[a];g;){if(g.sizcache===c){j=d[g.sizset];break}if(g.nodeType===1){if(!e)g.sizcache=c,g.sizset=f;if(typeof b!=="string"){if(g===b){j=!0;break}}else if(i.filter(b,
[g]).length>0){j=g;break}}g=g[a]}d[f]=j}}}var w=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,x=0,A=Object.prototype.toString,t=!1,B=!0,p=/\\/g,u=/\W/;[0,0].sort(function(){B=!1;return 0});var i=function(a,b,c,d){var c=c||[],f=b=b||document;if(b.nodeType!==1&&b.nodeType!==9)return[];if(!a||typeof a!=="string")return c;var e,h,g,l,s,m=!0,n=i.isXML(b),k=[],p=a;do if(w.exec(""),e=w.exec(p))if(p=e[3],k.push(e[1]),
e[2]){l=e[3];break}while(e);if(k.length>1&&D.exec(a))if(k.length===2&&j.relative[k[0]])h=C(k[0]+k[1],b);else for(h=j.relative[k[0]]?[b]:i(k.shift(),b);k.length;)a=k.shift(),j.relative[a]&&(a+=k.shift()),h=C(a,h);else if(!d&&k.length>1&&b.nodeType===9&&!n&&j.match.ID.test(k[0])&&!j.match.ID.test(k[k.length-1])&&(e=i.find(k.shift(),b,n),b=e.expr?i.filter(e.expr,e.set)[0]:e.set[0]),b){e=d?{expr:k.pop(),set:o(d)}:i.find(k.pop(),k.length===1&&(k[0]==="~"||k[0]==="+")&&b.parentNode?b.parentNode:b,n);h=
e.expr?i.filter(e.expr,e.set):e.set;for(k.length>0?g=o(h):m=!1;k.length;)e=s=k.pop(),j.relative[s]?e=k.pop():s="",e==null&&(e=b),j.relative[s](g,e,n)}else g=[];g||(g=h);g||i.error(s||a);if(A.call(g)==="[object Array]")if(m)if(b&&b.nodeType===1)for(a=0;g[a]!=null;a++)g[a]&&(g[a]===!0||g[a].nodeType===1&&i.contains(b,g[a]))&&c.push(h[a]);else for(a=0;g[a]!=null;a++)g[a]&&g[a].nodeType===1&&c.push(h[a]);else c.push.apply(c,g);else o(g,c);l&&(i(l,f,c,d),i.uniqueSort(c));return c};i.uniqueSort=function(a){if(v&&
(t=B,a.sort(v),t))for(var b=1;b<a.length;b++)a[b]===a[b-1]&&a.splice(b--,1);return a};i.matches=function(a,b){return i(a,null,null,b)};i.matchesSelector=function(a,b){return i(b,null,null,[a]).length>0};i.find=function(a,b,c){var d;if(!a)return[];for(var f=0,e=j.order.length;f<e;f++){var h,g=j.order[f];if(h=j.leftMatch[g].exec(a)){var i=h[1];h.splice(1,1);if(i.substr(i.length-1)!=="\\"&&(h[1]=(h[1]||"").replace(p,""),d=j.find[g](h,b,c),d!=null)){a=a.replace(j.match[g],"");break}}}d||(d=typeof b.getElementsByTagName!==
"undefined"?b.getElementsByTagName("*"):[]);return{set:d,expr:a}};i.filter=function(a,b,c,d){for(var f,e,h=a,g=[],l=b,o=b&&b[0]&&i.isXML(b[0]);a&&b.length;){for(var m in j.filter)if((f=j.leftMatch[m].exec(a))!=null&&f[2]){var n,k,p=j.filter[m];k=f[1];e=!1;f.splice(1,1);if(k.substr(k.length-1)!=="\\"){l===g&&(g=[]);if(j.preFilter[m])if(f=j.preFilter[m](f,l,c,g,d,o)){if(f===!0)continue}else e=n=!0;if(f)for(var q=0;(k=l[q])!=null;q++)if(k){n=p(k,f,q,l);var r=d^!!n;c&&n!=null?r?e=!0:l[q]=!1:r&&(g.push(k),
e=!0)}if(n!==void 0){c||(l=g);a=a.replace(j.match[m],"");if(!e)return[];break}}}if(a===h)if(e==null)i.error(a);else break;h=a}return l};i.error=function(a){throw"Syntax error, unrecognized expression: "+a;};var j=i.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(a){return a.getAttribute("href")},type:function(a){return a.getAttribute("type")}},relative:{"+":function(a,b){var c=
typeof b==="string",d=c&&!u.test(b),c=c&&!d;d&&(b=b.toLowerCase());for(var d=0,f=a.length,e;d<f;d++)if(e=a[d]){for(;(e=e.previousSibling)&&e.nodeType!==1;);a[d]=c||e&&e.nodeName.toLowerCase()===b?e||!1:e===b}c&&i.filter(b,a,!0)},">":function(a,b){var c,d=typeof b==="string",f=0,e=a.length;if(d&&!u.test(b))for(b=b.toLowerCase();f<e;f++){if(c=a[f])c=c.parentNode,a[f]=c.nodeName.toLowerCase()===b?c:!1}else{for(;f<e;f++)(c=a[f])&&(a[f]=d?c.parentNode:c.parentNode===b);d&&i.filter(b,a,!0)}},"":function(a,
b,c){var d,f=x++,e=z;typeof b==="string"&&!u.test(b)&&(d=b=b.toLowerCase(),e=y);e("parentNode",b,f,a,d,c)},"~":function(a,b,c){var d,f=x++,e=z;typeof b==="string"&&!u.test(b)&&(d=b=b.toLowerCase(),e=y);e("previousSibling",b,f,a,d,c)}},find:{ID:function(a,b,c){if(typeof b.getElementById!=="undefined"&&!c)return(a=b.getElementById(a[1]))&&a.parentNode?[a]:[]},NAME:function(a,b){if(typeof b.getElementsByName!=="undefined"){for(var c=[],d=b.getElementsByName(a[1]),f=0,e=d.length;f<e;f++)d[f].getAttribute("name")===
a[1]&&c.push(d[f]);return c.length===0?null:c}},TAG:function(a,b){if(typeof b.getElementsByTagName!=="undefined")return b.getElementsByTagName(a[1])}},preFilter:{CLASS:function(a,b,c,d,f,e){a=" "+a[1].replace(p,"")+" ";if(e)return a;for(var e=0,h;(h=b[e])!=null;e++)h&&(f^(h.className&&(" "+h.className+" ").replace(/[\t\n\r]/g," ").indexOf(a)>=0)?c||d.push(h):c&&(b[e]=!1));return!1},ID:function(a){return a[1].replace(p,"")},TAG:function(a){return a[1].replace(p,"").toLowerCase()},CHILD:function(a){if(a[1]===
"nth"){a[2]||i.error(a[0]);a[2]=a[2].replace(/^\+|\s*/g,"");var b=/(-?)(\d*)(?:n([+\-]?\d*))?/.exec(a[2]==="even"&&"2n"||a[2]==="odd"&&"2n+1"||!/\D/.test(a[2])&&"0n+"+a[2]||a[2]);a[2]=b[1]+(b[2]||1)-0;a[3]=b[3]-0}else a[2]&&i.error(a[0]);a[0]=x++;return a},ATTR:function(a,b,c,d,f,e){b=a[1]=a[1].replace(p,"");!e&&j.attrMap[b]&&(a[1]=j.attrMap[b]);a[4]=(a[4]||a[5]||"").replace(p,"");a[2]==="~="&&(a[4]=" "+a[4]+" ");return a},PSEUDO:function(a,b,c,d,f){if(a[1]==="not")if((w.exec(a[3])||"").length>1||
/^\w/.test(a[3]))a[3]=i(a[3],null,null,b);else return a=i.filter(a[3],b,c,1^f),c||d.push.apply(d,a),!1;else if(j.match.POS.test(a[0])||j.match.CHILD.test(a[0]))return!0;return a},POS:function(a){a.unshift(!0);return a}},filters:{enabled:function(a){return a.disabled===!1&&a.type!=="hidden"},disabled:function(a){return a.disabled===!0},checked:function(a){return a.checked===!0},selected:function(a){return a.selected===!0},parent:function(a){return!!a.firstChild},empty:function(a){return!a.firstChild},
has:function(a,b,c){return!!i(c[3],a).length},header:function(a){return/h\d/i.test(a.nodeName)},text:function(a){var b=a.getAttribute("type"),c=a.type;return a.nodeName.toLowerCase()==="input"&&"text"===c&&(b===c||b===null)},radio:function(a){return a.nodeName.toLowerCase()==="input"&&"radio"===a.type},checkbox:function(a){return a.nodeName.toLowerCase()==="input"&&"checkbox"===a.type},file:function(a){return a.nodeName.toLowerCase()==="input"&&"file"===a.type},password:function(a){return a.nodeName.toLowerCase()===
"input"&&"password"===a.type},submit:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"submit"===a.type},image:function(a){return a.nodeName.toLowerCase()==="input"&&"image"===a.type},reset:function(a){return a.nodeName.toLowerCase()==="input"&&"reset"===a.type},button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&"button"===a.type||b==="button"},input:function(a){return/input|select|textarea|button/i.test(a.nodeName)},focus:function(a){return a===a.ownerDocument.activeElement}},
setFilters:{first:function(a,b){return b===0},last:function(a,b,c,d){return b===d.length-1},even:function(a,b){return b%2===0},odd:function(a,b){return b%2===1},lt:function(a,b,c){return b<c[3]-0},gt:function(a,b,c){return b>c[3]-0},nth:function(a,b,c){return c[3]-0===b},eq:function(a,b,c){return c[3]-0===b}},filter:{PSEUDO:function(a,b,c,d){var f=b[1],e=j.filters[f];if(e)return e(a,c,b,d);else if(f==="contains")return(a.textContent||a.innerText||i.getText([a])||"").indexOf(b[3])>=0;else if(f==="not"){b=
b[3];c=0;for(d=b.length;c<d;c++)if(b[c]===a)return!1;return!0}else i.error(f)},CHILD:function(a,b){var c=b[1],d=a;switch(c){case "only":case "first":for(;d=d.previousSibling;)if(d.nodeType===1)return!1;if(c==="first")return!0;d=a;case "last":for(;d=d.nextSibling;)if(d.nodeType===1)return!1;return!0;case "nth":var c=b[2],f=b[3];if(c===1&&f===0)return!0;var e=b[0],h=a.parentNode;if(h&&(h.sizcache!==e||!a.nodeIndex)){for(var g=0,d=h.firstChild;d;d=d.nextSibling)if(d.nodeType===1)d.nodeIndex=++g;h.sizcache=
e}d=a.nodeIndex-f;return c===0?d===0:d%c===0&&d/c>=0}},ID:function(a,b){return a.nodeType===1&&a.getAttribute("id")===b},TAG:function(a,b){return b==="*"&&a.nodeType===1||a.nodeName.toLowerCase()===b},CLASS:function(a,b){return(" "+(a.className||a.getAttribute("class"))+" ").indexOf(b)>-1},ATTR:function(a,b){var c=b[1],c=j.attrHandle[c]?j.attrHandle[c](a):a[c]!=null?a[c]:a.getAttribute(c),d=c+"",f=b[2],e=b[4];return c==null?f==="!=":f==="="?d===e:f==="*="?d.indexOf(e)>=0:f==="~="?(" "+d+" ").indexOf(e)>=
0:!e?d&&c!==!1:f==="!="?d!==e:f==="^="?d.indexOf(e)===0:f==="$="?d.substr(d.length-e.length)===e:f==="|="?d===e||d.substr(0,e.length+1)===e+"-":!1},POS:function(a,b,c,d){var f=j.setFilters[b[2]];if(f)return f(a,c,b,d)}}},D=j.match.POS,E=function(a,b){return"\\"+(b-0+1)},q;for(q in j.match)j.match[q]=RegExp(j.match[q].source+/(?![^\[]*\])(?![^\(]*\))/.source),j.leftMatch[q]=RegExp(/(^(?:.|\r|\n)*?)/.source+j.match[q].source.replace(/\\(\d+)/g,E));var o=function(a,b){a=Array.prototype.slice.call(a,
0);if(b)return b.push.apply(b,a),b;return a};try{Array.prototype.slice.call(document.documentElement.childNodes,0)}catch(F){o=function(a,b){var c=0,d=b||[];if(A.call(a)==="[object Array]")Array.prototype.push.apply(d,a);else if(typeof a.length==="number")for(var f=a.length;c<f;c++)d.push(a[c]);else for(;a[c];c++)d.push(a[c]);return d}}var v,r;document.documentElement.compareDocumentPosition?v=function(a,b){if(a===b)return t=!0,0;if(!a.compareDocumentPosition||!b.compareDocumentPosition)return a.compareDocumentPosition?
-1:1;return a.compareDocumentPosition(b)&4?-1:1}:(v=function(a,b){var c,d,f=[],e=[];c=a.parentNode;d=b.parentNode;var h=c;if(a===b)return t=!0,0;else if(c===d)return r(a,b);else if(c){if(!d)return 1}else return-1;for(;h;)f.unshift(h),h=h.parentNode;for(h=d;h;)e.unshift(h),h=h.parentNode;c=f.length;d=e.length;for(h=0;h<c&&h<d;h++)if(f[h]!==e[h])return r(f[h],e[h]);return h===c?r(a,e[h],-1):r(f[h],b,1)},r=function(a,b,c){if(a===b)return c;for(a=a.nextSibling;a;){if(a===b)return-1;a=a.nextSibling}return 1});
i.getText=function(a){for(var b="",c,d=0;a[d];d++)c=a[d],c.nodeType===3||c.nodeType===4?b+=c.nodeValue:c.nodeType!==8&&(b+=i.getText(c.childNodes));return b};(function(){var a=document.createElement("div"),b="script"+(new Date).getTime(),c=document.documentElement;a.innerHTML="<a name='"+b+"'/>";c.insertBefore(a,c.firstChild);if(document.getElementById(b))j.find.ID=function(a,b,c){if(typeof b.getElementById!=="undefined"&&!c)return(b=b.getElementById(a[1]))?b.id===a[1]||typeof b.getAttributeNode!==
"undefined"&&b.getAttributeNode("id").nodeValue===a[1]?[b]:void 0:[]},j.filter.ID=function(a,b){var c=typeof a.getAttributeNode!=="undefined"&&a.getAttributeNode("id");return a.nodeType===1&&c&&c.nodeValue===b};c.removeChild(a);c=a=null})();(function(){var a=document.createElement("div");a.appendChild(document.createComment(""));if(a.getElementsByTagName("*").length>0)j.find.TAG=function(a,c){var d=c.getElementsByTagName(a[1]);if(a[1]==="*"){for(var f=[],e=0;d[e];e++)d[e].nodeType===1&&f.push(d[e]);
d=f}return d};a.innerHTML="<a href='#'></a>";if(a.firstChild&&typeof a.firstChild.getAttribute!=="undefined"&&a.firstChild.getAttribute("href")!=="#")j.attrHandle.href=function(a){return a.getAttribute("href",2)};a=null})();document.querySelectorAll&&function(){var a=i,b=document.createElement("div");b.innerHTML="<p class='TEST'></p>";if(!(b.querySelectorAll&&b.querySelectorAll(".TEST").length===0)){i=function(b,c,e,h){c=c||document;if(!h&&!i.isXML(c)){var g=/^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec(b);
if(g&&(c.nodeType===1||c.nodeType===9))if(g[1])return o(c.getElementsByTagName(b),e);else if(g[2]&&j.find.CLASS&&c.getElementsByClassName)return o(c.getElementsByClassName(g[2]),e);if(c.nodeType===9){if(b==="body"&&c.body)return o([c.body],e);else if(g&&g[3]){var l=c.getElementById(g[3]);if(l&&l.parentNode){if(l.id===g[3])return o([l],e)}else return o([],e)}try{return o(c.querySelectorAll(b),e)}catch(p){}}else if(c.nodeType===1&&c.nodeName.toLowerCase()!=="object"){var g=c,m=(l=c.getAttribute("id"))||
"__sizzle__",n=c.parentNode,k=/^\s*[+~]/.test(b);l?m=m.replace(/'/g,"\\$&"):c.setAttribute("id",m);if(k&&n)c=c.parentNode;try{if(!k||n)return o(c.querySelectorAll("[id='"+m+"'] "+b),e)}catch(q){}finally{l||g.removeAttribute("id")}}}return a(b,c,e,h)};for(var c in a)i[c]=a[c];b=null}}();(function(){var a=document.documentElement,b=a.matchesSelector||a.mozMatchesSelector||a.webkitMatchesSelector||a.msMatchesSelector;if(b){var c=!b.call(document.createElement("div"),"div"),d=!1;try{b.call(document.documentElement,
"[test!='']:sizzle")}catch(f){d=!0}i.matchesSelector=function(a,f){f=f.replace(/\=\s*([^'"\]]*)\s*\]/g,"='$1']");if(!i.isXML(a))try{if(d||!j.match.PSEUDO.test(f)&&!/!=/.test(f)){var g=b.call(a,f);if(g||!c||a.document&&a.document.nodeType!==11)return g}}catch(l){}return i(f,null,null,[a]).length>0}}})();(function(){var a=document.createElement("div");a.innerHTML="<div class='test e'></div><div class='test'></div>";if(a.getElementsByClassName&&a.getElementsByClassName("e").length!==0&&(a.lastChild.className=
"e",a.getElementsByClassName("e").length!==1))j.order.splice(1,0,"CLASS"),j.find.CLASS=function(a,c,d){if(typeof c.getElementsByClassName!=="undefined"&&!d)return c.getElementsByClassName(a[1])},a=null})();i.contains=document.documentElement.contains?function(a,b){return a!==b&&(a.contains?a.contains(b):!0)}:document.documentElement.compareDocumentPosition?function(a,b){return!!(a.compareDocumentPosition(b)&16)}:function(){return!1};i.isXML=function(a){return(a=(a?a.ownerDocument||a:0).documentElement)?
a.nodeName!=="HTML":!1};var C=function(a,b){for(var c,d=[],f="",e=b.nodeType?[b]:b;c=j.match.PSEUDO.exec(a);)f+=c[0],a=a.replace(j.match.PSEUDO,"");a=j.relative[a]?a+"*":a;c=0;for(var h=e.length;c<h;c++)i(a,e[c],d);return i.filter(f,d)};window.Sizzle=i})();