(function( $ ) {
	'use strict';

	$(document).ready(function () {
		
		if (typeof $.fn.ChartBuilderGoogleChartsMain === 'function') {
			$(document).find('.ays-chart-container-google').ChartBuilderGoogleChartsMain();
		}

		if (typeof $.fn.ChartBuilderChartJsMain === 'function') {
			$(document).find('.ays-chart-container-chartjs').ChartBuilderChartJsMain();
		}
		
	});

})( jQuery );
