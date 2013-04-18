//Helium-css v1.0
//Copyright 2010, Charles Lawrence http://twitter.com/geuis
//License: MIT License(http://opensource.org/licenses/mit-license.php) 
//release: 1/13/10

var helium = {

    callback : undefined,

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

        // Callback on init or default to running the report.
        helium.callback = (arguments.length > 0) ? arguments[0] : helium.report;

        //silently fail if localStorage is not available
        if( window.localStorage ){

            //load page data
            helium.load();

            helium.data.timeout = 3000;
            helium.save();

            helium.checkstatus();
        }else{
            throw new Error('localStorage API not found');
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

            helium.on( helium.$('#cssdetectStart'), 'click', function(){

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
            helium.on( helium.$('#cssdetectRestart'), 'click', function(){
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
			helium.callback();
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
        var sels = helium.$('#cssdetectID ul li');
        for(var s=0; s<sels.length; s++){
            (function(){
                var i=s;
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

        helium.on( helium.$('#cssreportResetID'), 'click', function(){
            helium.reset();
        },false);

	},
	
	reset:function(){
		//resets to beginning
		localStorage.removeItem('cssdetect');
		
		var nodes = helium.$('#cssdetectID');
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
				
				//run callback
				helium.callback();

			}
			
		}, helium.data.timeout);		


	},

	//search current page for selectors
	find:function(selector){

		//try/catch is used because querySelectorAll throws errors when syntactically invalid selectors are passed through. Useful for detection purposes.
		try{
			//returns true if selector found on page, false if not
			if( helium.$(selector).length > 0 ){
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
        var links = helium.$("link[rel='stylesheet']");
		
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
console.log( selectors );
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

    on: function(target, ev, fn){
        //only add events to the first element in the target/querySelectorAll nodeList.
        //don't need to add in support for multiple targets
        console.log( target );
        target[0].addEventListener(ev, fn, false);
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
	},
    
    $: function(selector){
        return document.querySelectorAll(selector);
    }

};
