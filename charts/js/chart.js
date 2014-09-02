/*
 * Copyright 2010-2014 Will Barton. 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions
 * are met:
 * 
 *   1. Redistributions of source code must retain the above copyright 
 *      notice, this list of conditions and the following disclaimer.
 *   2. Redistributions in binary form must reproduce the above copyright 
 *      notice, this list of conditions and the following disclaimer in the 
 *      documentation and/or other materials provided with the distribution.
 *   3. The name of the author may not be used to endorse or promote products
 *      derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL
 * THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * This is loosely based on this Gist: https://gist.github.com/pnavarrc/9730300
 */ 

var PI_OVER_180 = Math.PI/180;
var TWO_PI = Math.PI * 2;
var TWELVE_OVER_PI = 12/Math.PI;
var ONEEIGHTY_OVER_PI = 180/Math.PI;

(function($){

    ObservationChart = function(el, options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Add a reverse reference to the DOM object
        base.$el.data("ObservationChart", base);
        
        // Store the current rotation
        base.rotate = {x: 0, y: 90};

        // Store the basic margins
        base.margin = {top: 20, right: 10, bottom: 20, left: 10};

        // Initialization
        base.init = function(){
            base.options = $.extend({},ObservationChart.defaultOptions, options);

            base.width = base.options.size.width - base.margin.left - base.margin.right;
            base.height = base.options.size.height - base.margin.top - base.margin.bottom;

            // Select our container and create the SVG element.
            base.container = d3.select(base.el);
            base.svg = base.container.append('svg')
                .attr('width', base.width + base.margin.left + base.margin.right)
                .attr('height', base.height + base.margin.top + base.margin.bottom)

            // Create our groups.
            base.lines_group = base.svg.append('g')
                .attr('class', 'lines')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            base.chart_group = base.svg.append('g')
                .attr('class', 'chart')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            base.const_group = base.svg.append('g')
                .attr('class', 'constellations')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            base.obj_group = base.svg.append('g')
                .attr('class', 'objects')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            base.star_group = base.svg.append('g')
                .attr('class', 'stars')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            base.label_group = base.svg.append('g')
                .attr('class', 'labels')
                .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
            
            // Create and configure an instance of the orthographic projection
            base.projection = d3.geo.stereographic()
                .scale(base.width * base.options.scale)
                .translate([base.width / 2, base.height / 2])
                .clipAngle(90)
                .rotate([base.rotate.x / 2, -base.rotate.y / 2]);

            // Center the projection
            // Assume that RA is in hours (decimal) and dec is in degrees.
            base.projection.rotate(base.utils.zenith());

            // Create and configure the geographic path generator
            base.path = d3.geo.path().projection(base.projection);
            
            // Overlay
            base.overlay = base.svg.selectAll('circle').data([base.rotate])
                .enter().append('circle')
                .attr('transform', 'translate(' + [base.width / 2, base.height / 2] + ')')
                .attr('r', base.width / 2)
                .attr('filter', 'url(#lightMe)')
                .attr('class', 'overlay');

            // Globe Outline
            base.globe = base.lines_group.selectAll('path.globe').data([{type: 'Sphere'}])
                .enter().append('path')
                .attr('class', 'globe')
                .attr('d', base.path);

            // Graticule
            base.graticule = d3.geo.graticule();

            // Draw graticule lines
            if (base.options.graticule) {
                base.lines_group.selectAll('path.graticule').data([base.graticule()])
                    .enter().append('path')
                    .attr('class', 'graticule')
                    .attr('d', base.path);
            }
                
            // Load the star catalog
            d3.json('stars.json', base.drawStars);

            // Load the object catalog
            d3.json('objects.json', base.drawObjects);

            // Load the constellation catalog
            // d3.json('consts.json', base.drawObjects);

            // Draw chart features
            base.drawZenith();
            base.drawEcliptic();

            // Relax our labels
            base.utils.relax();

        };

        // Draw labels for the given objects with the given css class
        // and with the given functions for calculating dx and dy.
        base.drawLabelsForObjects = function(objects, cssClass, x, y) {
            var center_projected = base.path.centroid(base.utils.zenithFeature());

            base.label_group.selectAll('text.' + cssClass).data(objects)
                .enter().append('text')
                .filter(function(d) { 
                    var path_defined = base.path(d) != undefined;
                    var name_defined = base.options.labels[d.properties.id] != undefined || d.properties.name != undefined;
                    return path_defined && name_defined;
                })
                .attr("class", cssClass)
                .style("text-anchor", "middle")
                .attr("transform", function(d) { 

                    // The SVG coordinate system is from the top left
                    // corner of the image. For calculating theta, we
                    // need the origin to be in the center of the image
                    var svgx = x(d);
                    var svgy = y(d);

                    var projx = svgx - base.width / 2;
                    var projy = base.height / 2 - svgy;
                    var angle = Math.atan(projy / projx) / PI_OVER_180;
                    angle = 0;

                    return "translate(" + svgx + "," + svgy + ")rotate(" + angle + ")";
                })
                .text(function(d) { 
                    return base.options.labels[d.properties.id] ? 
                            base.options.labels[d.properties.id].name : 
                            (d.properties.name ? d.properties.name : ''); 
                });
        };
        
        base.drawZenith = function() {
            var feature = [base.utils.zenithFeature()];
            base.path.pointRadius(2);
            base.chart_group.selectAll('path.zenith').data(feature)
                .enter().append('path')
                .attr('class', 'zenith')
                .attr('d', base.path);
            // base.drawLabelsForObjects(feature, 'zenith-label', 
            //         function(d) { return base.path.centroid(d)[0]; },
            //         function(d) { return base.path.centroid(d)[1] + 15; });
        };

        base.drawEcliptic = function() {

            // Construct and points of the ecliptic
            var epsilon = 23.44 * PI_OVER_180;
            var cos_epsilon = Math.cos(epsilon);
            var sin_epsilon = Math.sin(epsilon);
            var number_of_points = 100;
            var points = [];
            for (var i = 0; i < number_of_points; i++) {
                var phi0 = i/number_of_points * TWO_PI;
                var m_sin_phi0 = -1 * Math.sin(phi0);
                var phi = Math.atan2(m_sin_phi0 * cos_epsilon, Math.cos(phi0));
                var delta = Math.asin(m_sin_phi0 * sin_epsilon);
                var point = [phi * TWELVE_OVER_PI * 15, delta * ONEEIGHTY_OVER_PI];
                points.push(point);
            }

            var ecliptic_feature = [{ 
                "type": "Feature",
                "geometry": {
                    "type": "LineString", 
                    "coordinates": points
                },
                "properties": {"name": "Ecliptic"}
            }];
            
            base.chart_group.selectAll('path.ecliptic').data(ecliptic_feature)
                .enter().append('path')
                .attr('class', 'ecliptic')
                .attr('d', base.path);
            // base.drawLabelsForObjects(ecliptic_feature, 'ecliptic-label', 
            //         function(d) { return base.path.centroid(d)[0]; },
            //         function(d) { return base.path.centroid(d)[1]; });

        };
            

        base.drawStars = function(error, data) {
            // Handle errors getting and parsing the data
            if (error) { return error; }

            var stars = $.grep(data.features, function(d) {
                return d.properties.magnitude <= base.options.stars.magnitude;
            });

            // Compute the radius scale. The radius will be proportional to
            // the aparent magnitude
            var rScale = d3.scale.linear()
                .domain(d3.extent(stars, function(d) { 
                    return d.properties.magnitude; }))
                .range(base.options.stars.scale);

            // Stars
            // -----
            // Compute the radius for the point features
            base.path.pointRadius(function(d) {
                return rScale(d.properties.magnitude);
            });
            base.star_group.selectAll('path.star').data(stars)
                .enter().append('path')
                .filter(function(d) { return base.path(d) != undefined; })
                .attr('class', 'star')
                .attr('d', base.path);

            base.drawLabelsForObjects(stars, 'star-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - rScale(d.properties.magnitude) * 2; });

        };

        base.drawObjects = function(error, data) {
            // Handle errors getting and parsing the data
            if (error) { return error; }

            // Generate a D3 line function that we'll use for the
            // planetary nebula and globular cluster symbols.
            var lineFunction = d3.svg.line()
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; })
                .interpolate("linear");

            // Galaxies
            // -----
            // The galaxy is a red ellipse whose shape and orientation
            // roughly match that of the object it represents; an SVG
            // ellipse.
            var galaxies = $.grep(data.features, function(d) {
                return d.properties.type == 'Galaxy' && 
                    d.properties.magnitude <= base.options.galaxies.magnitude;
            });
            // We'll size galaxies based on their size, within our
            // min/max range.
            var galaxyMajorScale = d3.scale.linear()
                .domain(d3.extent(galaxies, function(d) {
                    return d3.max(d.properties.size); }))
                .range(base.options.galaxies.scale);
            var galaxyMinorScale = d3.scale.linear()
                .domain(d3.extent(galaxies, function(d) {
                    return d3.min(d.properties.size); }))
                .range(base.options.galaxies.scale);
            base.obj_group.selectAll('ellipse.galaxy').data(galaxies)
                .enter().append('ellipse')
                .filter(function(d) { return base.path(d) != undefined; })
                .attr('class', 'galaxy')
                .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                .attr('rx', function(d) { return galaxyMajorScale(d.properties.size[0]); })
                .attr('ry', function(d) { return galaxyMinorScale(d.properties.size[1]); })
                .attr('transform', function(d) {
                    var transform = 'rotate(' + d.properties.angle + ',' + 
                            base.projection(d.geometry.coordinates)[0] + ',' + 
                            base.projection(d.geometry.coordinates)[1] + ')';
                    return transform;
                });
            base.drawLabelsForObjects(galaxies, 'object-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - galaxyMajorScale(d.properties.size[0]) * 2; });
                    
            // Open Clusters
            // -----
            // The open cluster is a yellow circle with a dashed border
            // to indicate its openness; an SVG circle.
            var openClusters = $.grep(data.features, function(d) {
                return d.properties.type == 'Open Cluster' && 
                    d.properties.magnitude <= base.options.openclusters.magnitude;
            });
            // We'll size clusters based on their magnitude, within our
            // min/max range.
            var openClusterMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(openClusters, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.openclusters.scale);
            base.obj_group.selectAll('circle.open-cluster').data(openClusters)
                .enter().append('circle')
                .filter(function(d) { return base.path(d) != undefined; })
                .attr('class', 'open-cluster')
                .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                .attr('r', function(d) { return openClusterMagnitudeScale(d.properties.magnitude); });
            base.drawLabelsForObjects(openClusters, 'object-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - openClusterMagnitudeScale(d.properties.magnitude) * 2; });

            // Globular Clusters
            // -----
            // The globular cluster is a yellow circle with one vertical
            // and one horizontal line; a circle and two paths.
            var globularClusters = $.grep(data.features, function(d) {
                return d.properties.type == 'Globular Cluster' && 
                    d.properties.magnitude <= base.options.globularclusters.magnitude;
            });
            // We'll size clusters based on their magnitude, within our
            // min/max range.
            var globularClusterMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(globularClusters, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.globularclusters.scale);
            var globularClusterElms = base.obj_group.selectAll('g.globular-cluster')
                .data(globularClusters)
                .enter().append('g')
                    .filter(function(d) { return base.path(d) != undefined; })
                    .attr('class', 'globular-cluster');
            globularClusterElms.append('circle')
                    .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                    .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                    .attr('r', function(d) { return globularClusterMagnitudeScale(d.properties.magnitude); });
            globularClusterElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            base.projection(d.geometry.coordinates)[0],
                            base.projection(d.geometry.coordinates)[1]
                        ];
                        var line = lineFunction([
                                [coords[0]-globularClusterMagnitudeScale(
                                    d.properties.magnitude),
                                 coords[1]],
                                [coords[0]+globularClusterMagnitudeScale(
                                    d.properties.magnitude), 
                                 coords[1]]
                                 ]);
                        return line;
                    });
            globularClusterElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            base.projection(d.geometry.coordinates)[0],
                            base.projection(d.geometry.coordinates)[1]
                        ];
                        return lineFunction([
                                [coords[0],
                                 coords[1]-globularClusterMagnitudeScale(
                                     d.properties.magnitude)],
                                [coords[0],
                                 coords[1]+globularClusterMagnitudeScale(
                                     d.properties.magnitude)]
                                 ]);
                    });
            base.drawLabelsForObjects(globularClusters, 'object-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - globularClusterMagnitudeScale(d.properties.magnitude) * 2; });


            // Planetary Nebulas
            // -----
            // The planetary nebula is a green circle with one vertical
            // and one horizontal line; a circle and two paths.
            var planetaryNebulas = $.grep(data.features, function(d) {
                return d.properties.type == 'Planetary Nebula' && 
                    d.properties.magnitude <= base.options.planetarynebulas.magnitudes;
            });
            // We'll size the nebulas based on their magnitude, within our
            // min/max range.
            var planetaryNebulaMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(planetaryNebulas, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.planetarynebulas.scale);
            var planetaryNebulaElms = base.obj_group.selectAll('g.planetary-nebula')
                .data(planetaryNebulas)
                .enter().append('g')
                    .filter(function(d) { return base.path(d) != undefined; })
                    .attr('class', 'planetary-nebula');
            planetaryNebulaElms.append('circle')
                    .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                    .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                    .attr('r', function(d) { return planetaryNebulaMagnitudeScale(d.properties.magnitude)/2; });
            planetaryNebulaElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            base.projection(d.geometry.coordinates)[0],
                            base.projection(d.geometry.coordinates)[1]
                        ];
                        var line = lineFunction([
                                [coords[0]-planetaryNebulaMagnitudeScale(
                                    d.properties.magnitude),
                                 coords[1]],
                                [coords[0]+planetaryNebulaMagnitudeScale(
                                    d.properties.magnitude), 
                                 coords[1]]
                                 ]);
                        return line;
                    });
            planetaryNebulaElms.append('path')
                    .attr('d', function(d) {
                        var coords = [
                            base.projection(d.geometry.coordinates)[0],
                            base.projection(d.geometry.coordinates)[1]
                        ];
                        return lineFunction([
                                [coords[0],
                                 coords[1]-planetaryNebulaMagnitudeScale(
                                     d.properties.magnitude)],
                                [coords[0],
                                 coords[1]+planetaryNebulaMagnitudeScale(
                                     d.properties.magnitude)]
                                 ]);
                    });
            base.drawLabelsForObjects(planetaryNebulas, 'object-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - planetaryNebulaMagnitudeScale(d.properties.magnitude) * 2; });

            // Bright Nebulas
            // -----
            var brightNebulas = $.grep(data.features, function(d) {
                return d.properties.type == 'Bright Nebula' && 
                    d.properties.magnitude <= base.options.brightnebulas.magnitude;
            });
            // We'll size the nebulas based on their magnitude, within our
            // min/max range.
            var brightNebulaMagnitudeScale = d3.scale.linear()
                .domain(d3.extent(brightNebulas, function(d) {
                    return d.properties.magnitude; }))
                .range(base.options.brightnebulas.scale);
            base.obj_group.selectAll('circle.bright-nebula').data(brightNebulas)
                .enter().append('rect')
                .filter(function(d) { return base.path(d) != undefined; })
                .attr('class', 'bright-nebula')
                .attr('x', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                .attr('y', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                .attr('height', function(d) { return brightNebulaMagnitudeScale(d.properties.magnitude); })
                .attr('width', function(d) { return brightNebulaMagnitudeScale(d.properties.magnitude); });
            base.drawLabelsForObjects(brightNebulas, 'object-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - brightNebulaMagnitudeScale(d.properties.magnitude) * 2; });

            
        };
        

        // Utility functions 
        // ----
        base.utils = {};

        // Constraint relaxation for labels
        base.utils.alpha = 0.5;
        base.utils.spacing = 12;
        base.utils.relax = function() {
            again = false;
            textLabels = base.label_group.selectAll('text');

            textLabels.each(function (d, i) {
                a = this;
                da = d3.select(a);
                y1 = da.attr("y");
                textLabels.each(function (d, j) {
                    b = this;
                    // a & b are the same element and don't collide.
                    if (a == b) return;
                    db = d3.select(b);
                    // a & b are on opposite sides of the chart and
                    // don't collide
                    if (da.attr("text-anchor") != db.attr("text-anchor")) return;
                    // Now let's calculate the distance between
                    // these elements. 
                    y2 = db.attr("y");
                    deltaY = y1 - y2;

                    // If spacing is greater than our specified spacing,
                    // they don't collide.
                    if (Math.abs(deltaY) > base.utils.spacing) return;

                    // If the labels collide, we'll push each 
                    // of the two labels up and down a little bit.
                    again = true;
                    sign = deltaY > 0 ? 1 : -1;
                    adjust = sign * base.utils.alpha;
                    da.attr("y",+y1 + adjust);
                    db.attr("y",+y2 - adjust);
                });
            });

            // Adjust our line leaders here
            // so that they follow the labels. 
            if(again) {
                setTimeout(relax,20)
            }
        };
        
        // Julian Day
        base.utils.julianDay = function(date) {
            if(!date) date = base.options.datetime;
            return ( date.getTime() / 86400000.0 ) + 2440587.5;
        };

        
        // Greenwich Mean Sidereal Time, based on http://aa.usno.navy.mil/faq/docs/GAST.php
        // and http://community.dur.ac.uk/john.lucey/users/lst.html
        base.utils.greenwichMeanSiderealTime = function(date) {
            if(!date) date = base.options.datetime;

            var JD = base.utils.julianDay(date);
            var MJD = JD - 2400000.5;		
            var MJD0 = Math.floor(MJD);
            var UT = (MJD - MJD0)*24.0;		
            var T = (MJD0-51544.5)/36525.0;			
            var GMST = 6.697374558 + 1.0027379093 * UT + (8640184.812866 + (0.093104 - 0.0000062*T)*T)*T/3600.0;		
            return GMST;

        };

        // Local Sidereal Time, based on http://aa.usno.navy.mil/faq/docs/GAST.php
        // and http://community.dur.ac.uk/john.lucey/users/lst.html
        base.utils.localSiderealTime = function(date, lon) {
            if(!date) date = base.options.datetime;
            if(!lon) lon = base.options.location.longitude;

            function frac(x) {
                x -= Math.floor(x);
                return x < 0 ? x + 1.0 : x;
            };

            var GMST = base.utils.greenwichMeanSiderealTime(date);
            var LMST =  24.0*frac((GMST + lon/15.0)/24.0);
            return LMST;
        };

        base.utils.zenith = function() {
            if(!base.options.center) {
                var date = base.options.datetime;
                var location = base.options.location;
                var dec = -1 * location.latitude;
                var ra = base.utils.localSiderealTime() * 15;

                console.log("center", [ra, dec]);
                return [ra, dec];
            }
            return [base.options.center.ra * 15, -1 * base.options.center.dec];
        };

        base.utils.zenithFeature = function() {
            var coords = base.utils.zenith();
            var zenith_feature = { 
                "type": "Feature",
                "geometry": {
                    "type": "Point", 
                    "coordinates": [360 - coords[0], -1 * coords[1]]
                },
                "properties": {"name": "Zenith"}
            };
            return zenith_feature;
        };
        
        // Run initializer
        base.init();
    };

    ObservationChart.defaultOptions = {
        // The size of the chart  viewport. This plus the `scale`
        // effects how much of the sphere is visible.
        size: {
            width: 1200,
            height: 1200,
        },

        // The scale of the chart. This effects how much of the sphere
        // is visible within the chart's viewport (`size`).
        scale: 0.5, 

        graticule: true,

        // The date to be charted. Defaults to 'now'.
        datetime: new Date(),

        // The location from which the sky is observered
        location: {
            latitude: 40,
            longitude: -73.883611,
        },
            
        // OR

        // The positioning of the chart. If the chart's scale is such
        // that you can see the entire sphere, this will effect its
        // rotation.
        // RA is presumed in decimal hours, dec in degrees.
        center: undefined,
        // center: {
        //     ra: 5.8,
        //     dec: 0.0 
        // },

        stars: {
            magnitude: 5,
            scale: [6, 0.25]
        },

        galaxies: {
            magnitude: 8,
            scale: [3, 10]
        },
        
        openclusters: {
            magnitude: 6,
            scale: [6,3]
        },

        globularclusters: {
            magnitude: 8,
            scale: [8,4]
        },

        planetarynebulas: {
            magnitude: 10,
            scale: [12,6]
        },

        brightnebulas: {
            magnitude: 10,
            scale: [12,6]
        },

        labels: {
            // Bright, common named stars
            HIP24436: {name:'Rigel', },
            HIP27989: {name:'Betelgeuse', },
            HIP32349: {name:'Sirius', },
            HIP37279: {name:'Procyon', },
            HIP24608: {name:'Capella', },
            HIP5447:  {name:'Mirach', },
            HIP14576: {name:'Algol', },
            HIP21421: {name:'Aldebaran', },
            HIP10826: {name:'Mira', },
            HIP49669: {name:'Regulus', },
            HIP57632: {name:'Denebola', },
            HIP65474: {name:'Spica', },
            HIP69673: {name:'Arcturus', },
            HIP11767: {name:'Polaris', },
            HIP54061: {name:'Dubhe', },
            HIP62956: {name:'Alioth', },
            HIP67301: {name:'Alkaid', },
            HIP102098:{name:'Deneb', },
            HIP91262: {name:'Vega', },
            HIP97649: {name:'Altair', },
            HIP36850: {name:'Castor', },
            HIP37826: {name:'Pollux', },
            HIP113368:{name:'Fomalhaut', },
            HIP80763: {name:'Antares', },
            HIP60718: {name:'Acrux', },
            HIP30438: {name:'Canopus', },
            HIP7588:  {name:'Achernar', },

            // Messier objects (in our catalog by their NGC numbers)
            NGC1952: {name: 'M1',},
            NGC7089: {name: 'M2',},
            NGC5272: {name: 'M3',},
            NGC6121: {name: 'M4',},
            NGC5904: {name: 'M5',},
            NGC6405: {name: 'M6',},
            NGC6475: {name: 'M7',},
            NGC6523: {name: 'M8',},
            NGC6333: {name: 'M9',},
            NGC6254: {name: 'M10',},
            NGC6705: {name: 'M11',},
            NGC6218: {name: 'M12',},
            NGC6205: {name: 'M13',},
            NGC6402: {name: 'M14',},
            NGC7078: {name: 'M15',},
            NGC6611: {name: 'M16',},
            NGC6618: {name: 'M17',},
            NGC6613: {name: 'M18',},
            NGC6273: {name: 'M19',},
            NGC6514: {name: 'M20',},
            NGC6531: {name: 'M21',},
            NGC6656: {name: 'M22',},
            NGC6494: {name: 'M23',},
            IC4715: {name: 'M24',},
            IC4725: {name: 'M25',},
            NGC6694: {name: 'M26',},
            NGC6853: {name: 'M27',},
            NGC6626: {name: 'M28',},
            NGC6913: {name: 'M29',},
            NGC7099: {name: 'M30',},
            NGC224: {name: 'M31',},
            NGC221: {name: 'M32',},
            NGC598: {name: 'M33',},
            NGC1039: {name: 'M34',},
            NGC2168: {name: 'M35',},
            NGC1960: {name: 'M36',},
            NGC2099: {name: 'M37',},
            NGC1912: {name: 'M38',},
            NGC7092: {name: 'M39',},
            NGC2287: {name: 'M41',},
            NGC1976: {name: 'M42',},
            NGC1982: {name: 'M43',},
            NGC2632: {name: 'M44',},
            NGC2437: {name: 'M46',},
            NGC2422: {name: 'M47',},
            NGC2548: {name: 'M48',},
            NGC4472: {name: 'M49',},
            NGC2323: {name: 'M50',},
            NGC5194: {name: 'M51',},
            NGC5195: {name: 'M51',},
            NGC7654: {name: 'M52',},
            NGC5024: {name: 'M53',},
            NGC6715: {name: 'M54',},
            NGC6809: {name: 'M55',},
            NGC6779: {name: 'M56',},
            NGC6720: {name: 'M57',},
            NGC4579: {name: 'M58',},
            NGC4621: {name: 'M59',},
            NGC4649: {name: 'M60',},
            NGC4303: {name: 'M61',},
            NGC6266: {name: 'M62',},
            NGC5055: {name: 'M63',},
            NGC4826: {name: 'M64',},
            NGC3623: {name: 'M65',},
            NGC3627: {name: 'M66',},
            NGC2682: {name: 'M67',},
            NGC4590: {name: 'M68',},
            NGC6637: {name: 'M69',},
            NGC6681: {name: 'M70',},
            NGC6838: {name: 'M71',},
            NGC6981: {name: 'M72',},
            NGC6994: {name: 'M73',},
            NGC628: {name: 'M74',},
            NGC6864: {name: 'M75',},
            NGC650: {name: 'M76',},
            NGC651: {name: 'M76',},
            NGC1068: {name: 'M77',},
            NGC2068: {name: 'M78',},
            NGC1904: {name: 'M79',},
            NGC6093: {name: 'M80',},
            NGC3031: {name: 'M81',},
            NGC3034: {name: 'M82',},
            NGC5236: {name: 'M83',},
            NGC4374: {name: 'M84',},
            NGC4382: {name: 'M85',},
            NGC4406: {name: 'M86',},
            NGC4486: {name: 'M87',},
            NGC4501: {name: 'M88',},
            NGC4552: {name: 'M89',},
            NGC4569: {name: 'M90',},
            NGC4548: {name: 'M91',},
            NGC6341: {name: 'M92',},
            NGC2447: {name: 'M93',},
            NGC4736: {name: 'M94',},
            NGC3351: {name: 'M95',},
            NGC3368: {name: 'M96',},
            NGC3587: {name: 'M97',},
            NGC4192: {name: 'M98',},
            NGC4254: {name: 'M99',},
            NGC4321: {name: 'M100',},
            NGC5457: {name: 'M101',},
            NGC581: {name: 'M103',},
            NGC4594: {name: 'M104',},
            NGC3379: {name: 'M105',},
            NGC4258: {name: 'M106',},
            NGC6171: {name: 'M107',},
            NGC3556: {name: 'M108',},
            NGC3992: {name: 'M109',},
            NGC205: {name: 'M110',},

            // Interesting NGC objects worth labeling (from SEDS)
            NGC104: {name: 'NGC 104',},
            NGC188: {name: 'NGC 188',},
            NGC189: {name: 'NGC 189',},
            NGC206: {name: 'NGC 206',},
            NGC225: {name: 'NGC 225',},
            NGC253: {name: 'NGC 253',},
            NGC292: {name: 'NGC 292',},
            NGC381: {name: 'NGC 381',},
            NGC595: {name: 'NGC 595',},
            NGC604: {name: 'NGC 604',},
            NGC659: {name: 'NGC 659',},
            NGC752: {name: 'NGC 752',},
            NGC869: {name: 'NGC 869',},
            NGC884: {name: 'NGC 884',},
            NGC891: {name: 'NGC 891',},
            NGC1055: {name: 'NGC 1055',},
            NGC1432: {name: 'NGC 1432',},
            NGC1435: {name: 'NGC 1435',},
            NGC2023: {name: 'NGC 2023',},
            NGC2070: {name: 'NGC 2070',},
            NGC2169: {name: 'NGC 2169',},
            NGC2175: {name: 'NGC 2175',},
            NGC2204: {name: 'NGC 2204',},
            NGC2237: {name: 'NGC 2237',},
            NGC2238: {name: 'NGC 2238',},
            NGC2239: {name: 'NGC 2239',},
            NGC2244: {name: 'NGC 2244',},
            NGC2246: {name: 'NGC 2246',},
            NGC2264: {name: 'NGC 2264',},
            NGC2349: {name: 'NGC 2349',},
            NGC2360: {name: 'NGC 2360',},
            NGC2362: {name: 'NGC 2362',},
            NGC2403: {name: 'NGC 2403',},
            NGC2419: {name: 'NGC 2419',},
            NGC2438: {name: 'NGC 2438',},
            NGC2451: {name: 'NGC 2451',},
            NGC2477: {name: 'NGC 2477',},
            NGC2516: {name: 'NGC 2516',},
            NGC2546: {name: 'NGC 2546',},
            NGC2547: {name: 'NGC 2547',},
            NGC2903: {name: 'NGC 2903',},
            NGC2976: {name: 'NGC 2976',},
            NGC3077: {name: 'NGC 3077',},
            NGC3115: {name: 'NGC 3115',},
            NGC3228: {name: 'NGC 3228',},
            NGC3293: {name: 'NGC 3293',},
            NGC3372: {name: 'NGC 3372',},
            NGC3532: {name: 'NGC 3532',},
            NGC3628: {name: 'NGC 3628',},
            NGC3766: {name: 'NGC 3766',},
            NGC3953: {name: 'NGC 3953',},
            NGC4565: {name: 'NGC 4565',},
            NGC4571: {name: 'NGC 4571',},
            NGC4631: {name: 'NGC 4631',},
            NGC4656: {name: 'NGC 4656',},
            NGC4755: {name: 'NGC 4755',},
            NGC4833: {name: 'NGC 4833',},
            NGC5128: {name: 'NGC 5128',},
            NGC5139: {name: 'NGC 5139',},
            NGC5195: {name: 'NGC 5195',},
            NGC5281: {name: 'NGC 5281',},
            NGC5662: {name: 'NGC 5662',},
            NGC5907: {name: 'NGC 5907',},
            NGC6025: {name: 'NGC 6025',},
            NGC6124: {name: 'NGC 6124',},
            NGC6231: {name: 'NGC 6231',},
            NGC6242: {name: 'NGC 6242',},
            NGC6397: {name: 'NGC 6397',},
            NGC6530: {name: 'NGC 6530',},
            NGC6543: {name: 'NGC 6543',},
            NGC6603: {name: 'NGC 6603',},
            NGC6633: {name: 'NGC 6633',},
            NGC6712: {name: 'NGC 6712',},
            NGC6819: {name: 'NGC 6819',},
            NGC6822: {name: 'NGC 6822',},
            NGC6866: {name: 'NGC 6866',},
            NGC6946: {name: 'NGC 6946',},
            NGC7000: {name: 'NGC 7000',},
            NGC7009: {name: 'NGC 7009',},
            NGC7293: {name: 'NGC 7293',},
            NGC7331: {name: 'NGC 7331',},
            NGC7380: {name: 'NGC 7380',},
            NGC7479: {name: 'NGC 7479',},
            NGC7789: {name: 'NGC 7789',},
            IC10: {name: 'IC 10',},
            IC349: {name: 'IC 349',},
            IC434: {name: 'IC 434',},
            IC1434: {name: 'IC 1434',},
            IC2391: {name: 'IC 2391',},
            IC2395: {name: 'IC 2395',},
            IC2488: {name: 'IC 2488',},
            IC2602: {name: 'IC 2602',},
            IC4665: {name: 'IC 4665',},
            IC5152: {name: 'IC 5152',},

        },

    };
    
    $.fn.observationChart = function(options){
        console.log("observation chart");
        return this.each(function(){
            (new ObservationChart(this, options));
        });
    };

})(jQuery);

