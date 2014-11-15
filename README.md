Observation-Charts
======================

Generate SVG star charts. 

See http://gulielmus.github.io/observation-charts/ for more information.

See http://gulielmus.github.io/observation-charts/tonight for a
realistically useful "Tonight's Sky" using Observation Charts.

Goal: Create dynamic charts that resemble the IAU Constellation
charts. This is a disjointed collection of stuff at the moment that is
slowly coalescing into an orderly pairing of a Python package that
generates GeoJSON from celestial catalogs and a JavaScript library that
generates the SVG charts. 

Currently there are two interesting components:

1. Python package `observation.catalogs`. This package includes classes
   that represent stars in the [HYG star database](http://www.astronexus.com/hyg),
   deep sky objects in the [NGC/IC catalogs](http://www.ngcicproject.org), and 
   constellation lines and boundaries. It includes a command-line
   utility to make reading and exporting from those databases to a
   custom JSON format and GeoJSON relatively straight-forward. This
   package is intended to be used to format data for...
2. JavaScript package `observation-chart`. This package includes (right
   now) a jQuery plugin which draws an SVG star chart based on a given
   configuration (either a particular region of the sky or the whole sky for 
   a given location and time). See [`charts/index.html`](chart/index.html) 
   for more specific information.


License
-------

BSD. See [LICENSE file](LICENSE).

Individual catalogs may have their own license.
