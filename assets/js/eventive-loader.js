( function () {
	if ( ! window.__EventiveEE ) window.__EventiveEE = {};
	if ( window.__EventiveEE._inlineInjected ) return;
	window.__EventiveEE._inlineInjected = true;

	function runRebuildOnce() {
		if ( ! window.Eventive ) return;
		if ( window.__EventiveEE._rebuilt ) return;
		try {
			window.Eventive.rebuild();
		} catch ( e ) {}
		window.__EventiveEE._rebuilt = true;
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener(
			'DOMContentLoaded',
			function () {
				setTimeout( runRebuildOnce, 300 );
			},
			{ once: true }
		);
	} else {
		setTimeout( runRebuildOnce, 300 );
	}

	if ( window.jQuery && window.elementorFrontend ) {
		jQuery( window ).on( 'elementor/frontend/init', function () {
			try {
				elementorFrontend.hooks.addAction(
					'frontend/element_ready/global',
					function () {
						setTimeout( runRebuildOnce, 0 );
					}
				);
				jQuery( document ).on( 'elementor/popup/show', function () {
					setTimeout( runRebuildOnce, 0 );
				} );
			} catch ( e ) {}
		} );
	}
} )();
