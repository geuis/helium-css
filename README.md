Helium is a tool for discovering unused CSS across many pages on a web site.

The tool is javascript-based and runs from the browser.

Helium accepts a list of URLs for different sections of a site then loads and parses each page to build up a list of all stylesheets. It then visits each page in the URL list and checks if the selectors found in the stylesheets are used on the pages. Finally, it generates a report that details each stylesheet and the selectors that were not found to be used on any of the given pages.


##### Note: You really should only run Helium on a local, development, or otherwise privately accessible version of your site. If you run this on your public site, every visitor will see the Helium test environment.

#####  PLEASE READ THE "IMPORTANT STUFF" SECTION BELOW!!

### Installation

1. Add a script element somewhere on your site that is loaded into every page that will be tested. This is typically a header or footer section. The element looks like:

	```html
	<script type="text/javascript" src="path/to/helium.js"></script>
	```
	##### Note: path/to/helium.js needs to reflect the path of where you place the javascript file.

2. Helium is initiated by calling the method "helium.init()". This has to be placed somewhere on the page where it gets called after page load. An example of this is:

	```html
	<script type="text/javascript">
		window.addEventListener('load', function(){
			
			helium.init();
	
		}, false);
	</script>
	```
	##### Note: Depending on the javascript loading strategy your site employs, you may wish to place "helium.init()" within a location that executes javascript after page load.


### Usage

1. Once Helium is setup, when you load your site you will see a box with a textarea where you input your URL list.

2. After you paste your list of links, click Start (lower left) to begin the process. Clicking "Reset to Beginning" clears the textarea and stored data.

3. The test will proceed to load and process each url you gave. When it is finished, you are presented with a report window that lists each stylesheet URL that was detected. Under each stylesheet, it will list the CSS selectors that were not detected to be in use on any page. 

4. The selectors are color-coded. 

   * ##### Green: Unmatched selectors. 
   	These are the primary ones that were not detected as in-use.

   * ##### Black: Matched selectors that are grouped with non-matched selectors. 
   	Basically this means that multiple selectors were defined together like "h1,h2,h3{}". All selectors are tested individually so these are displayed to make them easier to find in the stylesheets later.

   * ##### Red: Malformed selectors. 
   	These are likely to be rare. This means that when the browser tried testing for a selector, it can't parse the syntax of how it was written. This could be like ".classname# idname{}" or a "CSS hack" often used for Internet Explorer.

   * ##### Blue: Pseudo-class selector. 
  	These are selectors like ".div:hover" or "input:focus". These are selectors that require user interaction to activate. Currently, Helium can't simulate the interactions required to see if these are found or not. It is the developer's responsibility to test for these manually.

### Browser Support:

Any modern browser that supports LocalStorage and document.querySelector.

I have decided I will never adapt Helium to support IE6 or 7.

### IMPORTANT STUFF:
1. No cross-domain stylesheets: Helium has to load the stylesheets on your site via XHR in order to parse out the selectors to test. This means that all stylesheets URLs have to be on the same domain as the pages being tested. There's currently no back-end server to proxy requests, but this might be an option in the future.

2. No javascript errors on your pages: If Helium is run on a page that has one or more javascript errors, it can easily prevent Helium and other scripts from running on the page. This will stop your tests dead in their tracks. Verify ahead of time that all of the URLs you are testing do not generate any javascript errors. If you aren't sure, try running some Helium tests and see what page it stops at. Check out your error consoles on such pages.

3. No sitemap XML support: Right now, the URL list has to be line separated. No CSV or sitemap XML format is currently supported, though it will be in a future release.




