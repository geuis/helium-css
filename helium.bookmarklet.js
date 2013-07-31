javascript:(function() {
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.onload = function () {
		window.helium.init();
	}
	s.src = 'https://raw.github.com/geuis/helium-css/master/helium.js';
	if (document.readyState === "complete"){
		document.head.appendChild(s);
	} else {
		window.addEventListener('load', function(){
			document.head.appendChild(s);
		}, false);
	}
})();