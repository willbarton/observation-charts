/*
 * Copyright 2010-2015 Will Barton. 
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
 */ 

var PI_OVER_180 = Math.PI/180;
var TWO_PI = Math.PI * 2;
var TWELVE_OVER_PI = 12/Math.PI;
var ONEEIGHTY_OVER_PI = 180/Math.PI;



function ObservationChart(selection, options) {
    // To avoid scope issues, use 'base' instead of 'this'
    // to reference this class from internal events and functions.
    var base = this;

    base.selection = d3.select(selection);

    // Store the current rotation
    base.rotate = {x: 0, y: 90};

    // Store the basic margins
    base.margin = {top: 20, right: 20, bottom: 20, left: 20};

    // Initialization
    base.init = function() {

        // Select our container and create the SVG element.
        base.container = base.selection;
        base.svg = base.container.append('svg').attr('class', 'observation-chart');
        base.svg.attr('style', 'background-color: white;');

        // Create our groups.
        base.lines_group = base.svg.append('g')
            .attr('class', 'lines')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');
        base.chart_group = base.svg.append('g')
            .attr('class', 'chart')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');
        base.const_group = base.svg.append('g')
            .attr('class', 'constellations')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');
        base.obj_group = base.svg.append('g')
            .attr('class', 'objects')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")");
        base.star_group = base.svg.append('g')
            .attr('class', 'stars')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');
        base.solarsystem_group = base.svg.append('g')
            .attr('class', 'solarsystem')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');
        base.label_group = base.svg.append('g')
            .attr('class', 'labels')
            .attr("transform", "translate(" + base.margin.left + "," + base.margin.top + ")")
            .style('pointer-events', 'none');

        // Create and configure an instance of the orthographic projection
        base.projection = d3.geo.stereographic().clipAngle(90);

        // Create and configure the geographic path generator
        base.path = d3.geo.path().projection(base.projection);

        // Do options-based initialization and drawing
        base.update(options);
    };

    base.update = function(options) {
        base.options = base.utils.extend({}, base.defaultOptions, base.options, options);

        // Set up the chart's date/time
        base.datetime = base.options.datetime;

        // Set the SVG width/height
        base.width = base.utils.width();
        base.height = base.utils.height();
        base.svg
            .attr('width', base.width + base.margin.left + base.margin.right)
            .attr('height', base.height + base.margin.top + base.margin.bottom);
        
        // Configure the projection
        base.projection
            .scale(base.width * (base.options.scale/2))
            .translate([base.width / 2, base.height / 2])
            .rotate([base.rotate.x / 2, -base.rotate.y / 2]);

        // Center the projection
        base.projection.rotate(base.utils.zenith());

        // Set up zooming
        base.zoom = d3.behavior.zoom()
            .translate([0, 0])
            .scale(base.options.scale)
            .scaleExtent([base.options.scale, base.options.zoom.extent])
            .size([base.width, base.height])
            .on("zoom", function() {
                if (!base.options.zoom.zoomable)
                    return;

                var transform_attr = "translate(" + (d3.event.translate[0] + base.margin.left) + "," + (d3.event.translate[1] + base.margin.top) + ")scale(" + d3.event.scale + ")";

                base.lines_group.attr("transform", transform_attr);
                base.chart_group.attr("transform", transform_attr);
                base.const_group.attr("transform", transform_attr);
                base.obj_group.attr("transform", transform_attr);
                base.star_group.attr("transform", transform_attr);
                base.solarsystem_group.attr("transform", transform_attr);
                base.label_group.attr("transform", transform_attr);
                });
        base.svg.call(base.zoom);

        // Draw the chart
        base.draw();
    };

    base.draw = function() {
        base.lines_group.selectAll("*").remove();
        base.chart_group.selectAll("*").remove();
        base.const_group.selectAll("*").remove();
        base.obj_group.selectAll("*").remove();
        base.star_group.selectAll("*").remove();
        base.solarsystem_group.selectAll("*").remove();
        base.label_group.selectAll("*").remove();
        
        // Globe Outline
        base.globe = base.lines_group.selectAll('path.globe').data([{type: 'Sphere'}])
            .enter().append('path')
            .attr('class', 'globe')
            .attr('d', base.path)
            .attr('style', 'fill: white; stroke-width: 0.5; stroke: rgb(35, 31, 32);');
        
        // Graticule
        base.graticule = d3.geo.graticule();

        // Draw graticule lines
        if (base.options.graticule) {
            base.lines_group.selectAll('path.graticule').data([base.graticule()])
                .enter().append('path')
                .attr('class', 'graticule')
                .attr('d', base.path)
                .attr('style', 'fill: none; stroke-width: 0.25; stroke: rgba(35, 31, 32, 0.25)');
        }

        // Draw other chart features
        base.drawZenith();
        base.drawEcliptic();
        base.drawInformation();
        base.drawSolarSystem();
        
        // Load the constellations
        d3.json(base.options.data.constellations, function(error, data) {
            base.drawConstellations(error, data);

            // Load the object catalog
            d3.json(base.options.data.objects, function(error, data) {
                base.drawObjects(error, data);

                // Load the star catalog
                d3.json(base.options.data.stars, function(error, data) {
                    base.drawStars(error, data);

                    // Draw the solar System
                    base.drawSolarSystem();
                });
            });
        });
    };

    // Draw labels for the given objects with the given css class
    // and with the given functions for calculating dx and dy.
    base.drawLabelsForObjects = function(objects, cssClass, x, y, style) {
        var center_projected = base.path.centroid(base.utils.zenithFeature());

        var labelElements = base.label_group.selectAll('text.' + cssClass)
            .data(objects.filter(function(d) { 
                return base.path(d) != undefined && base.data.overrides(d).hasOwnProperty('name');
            }))
            .enter().append('text')
            .attr('id', function(d) { return d.properties.id + '-label'; })
            .attr('class', cssClass + ' label')
            .attr('transform', function(d) { 
                // The SVG coordinate system is from the top left
                // corner of the image. For calculating theta, we
                // need the origin to be in the center of the image
                var svgx = x(d);
                var svgy = y(d);

                var projx = svgx - base.width / 2;
                var projy = base.height / 2 - svgy;
                var angle = Math.atan(projy / projx) / PI_OVER_180;
                angle = 0;

                return 'translate(' + svgx + ',' + svgy + ')rotate(' + angle + ')';
            })
            .attr('style', style)
            .style('text-anchor', 'middle')
            .text(function(d) { return base.data.overrides(d).name; });

        return labelElements;
    };
        
    base.drawZenith = function() {
        if (!base.options.zenith.show)
            return;

        var feature = [base.utils.zenithFeature()];
        base.path.pointRadius(2);
        
        // base.chart_group.selectAll('path.zenith').data(feature)
        //     .enter().append('path')
        //     .attr('class', 'zenith')
        //     .attr('d', base.path);

        var zenithElm = base.chart_group.selectAll('g.zenith')
            .data(feature)
            .enter().append('g')
                .attr('id', 'zenith')
                .attr('class', 'zenith')
                .attr('style', 'stroke: rgb(128,214,247)');
        zenithElm.append('path')
                .attr('d', function(d) {
                    var coords = [base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]];
                    return base.utils.lineFunction([
                            [coords[0]-base.options.zenith.size, coords[1]],
                            [coords[0]+base.options.zenith.size, coords[1]]]);
                });
        zenithElm.append('path')
                .attr('d', function(d) {
                    var coords = [base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]];
                    return base.utils.lineFunction([
                            [coords[0],coords[1]-base.options.zenith.size],
                            [coords[0],coords[1]+base.options.zenith.size]]);
                });
        
        // base.drawLabelsForObjects(feature, 'zenith-label', 
        //         function(d) { return base.path.centroid(d)[0]; },
        //         function(d) { return base.path.centroid(d)[1] + 15; });
    };

    base.drawEcliptic = function() {
        if (!base.options.ecliptic)
            return;

        // Construct and points of the ecliptic
        var epsilon = 23.44 * PI_OVER_180;
        var cos_epsilon = Math.cos(epsilon);
        var sin_epsilon = Math.sin(epsilon);
        var number_of_points = 100;
        var points = [];
        for (var i = 0; i <= number_of_points; i++) {
            var phi0 = i/number_of_points * TWO_PI;
            var m_sin_phi0 = -1 * Math.sin(phi0);
            var phi = Math.atan2(m_sin_phi0 * cos_epsilon, Math.cos(phi0));
            var delta = Math.asin(m_sin_phi0 * sin_epsilon);
            var point_ra = 360 - (phi * TWELVE_OVER_PI * 15);
            var point_dec = delta * ONEEIGHTY_OVER_PI;
            var point = [point_ra, point_dec];
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
            .attr('d', base.path)
            .attr('style', 'fill: none; stroke-width: 0.96; stroke: rgb(128,214,247);');
        // base.drawLabelsForObjects(ecliptic_feature, 'ecliptic-label', 
        //         function(d) { return base.path.centroid(d)[0]; },
        //         function(d) { return base.path.centroid(d)[1]; });

    };

    // Draw labels on the map for North, South, East, and West, and
    // the latitude/longitude date and time if they're applicable.
    base.drawInformation = function() {
        // If we're set to a specific center ra/dec, we're not going
        // to draw direction labels at this time.
        if (base.options.center.ra && base.options.center.dec)
            return;

        if (!base.options.information)
            return;

        var bbox = base.globe.node().getBBox();

        base.chart_group
            .append('text')
            .attr('class', 'chartinfo-label')
            .style('text-anchor', 'middle')
            .attr('transform', function(d) { 
                return 'translate(' + (bbox.x + bbox.width/2) + ',' + (bbox.y + base.margin.top) + ')';
            })
            .attr('style', 'font-size: 100%; font-family: "Trebuchet MS", Helvetica, sans-serif; text-transform: uppercase; fill: rgba(128, 214, 247, 1.0);')
            .text('N')
        base.chart_group
            .append('text')
            .attr('class', 'chartinfo-label')
            .style('text-anchor', 'middle')
            .attr('transform', function(d) { 
                return 'translate(' + (bbox.x + bbox.width/2) + ',' + (bbox.y + bbox.height - base.margin.top) + ')';
            })
            .attr('style', 'font-size: 100%; font-family: "Trebuchet MS", Helvetica, sans-serif; text-transform: uppercase; fill: rgba(128, 214, 247, 1.0);')
            .text('S')
        base.chart_group
            .append('text')
            .attr('class', 'chartinfo-label')
            .style('text-anchor', 'middle')
            .attr('transform', function(d) { 
                return 'translate(' + (bbox.x + bbox.width - base.margin.left) + ',' + (bbox.y + bbox.height/2) + ')';
            })
            .attr('style', 'font-size: 100%; font-family: "Trebuchet MS", Helvetica, sans-serif; text-transform: uppercase; fill: rgba(128, 214, 247, 1.0);')
            .text('W')
        base.chart_group
            .append('text')
            .attr('class', 'chartinfo-label')
            .style('text-anchor', 'middle')
            .attr('transform', function(d) { 
                return 'translate(' + (bbox.x + base.margin.left) + ',' + (bbox.y + bbox.height/2) + ')';
            })
            .attr('style', 'font-size: 100%; font-family: "Trebuchet MS", Helvetica, sans-serif; text-transform: uppercase; fill: rgba(128, 214, 247, 1.0);')
            .text('E')
        
    };

    base.drawSolarSystem = function() {
        //http://www.stjarnhimlen.se/comp/ppcomp.html

        // Sun
        if (base.options.solar.sun) {
            var sunFeature = base.utils.sunFeature();
            base.path.pointRadius(function(d) { return 20; });
            base.solarsystem_group.selectAll('path.star')
                .data([sunFeature])
                .enter().append('path')
                .attr('class', 'star')
                .attr('id', 'sun')
                .attr('d', base.path);
            base.drawLabelsForObjects([sunFeature], 'sun-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - 30; },
                    'font-size: 80%; font-family: "Trebuchet MS", Helvetica, sans-serif; fill: rgba(35, 31, 32, 0.75);');
        }
        // Moon 
        if (base.options.solar.moon) {
            var moonFeature = base.utils.moonFeature();
            base.path.pointRadius(function(d) { return 8; });
            base.solarsystem_group.selectAll('path.planetary')
                .data([moonFeature])
                .enter().append('path')
                .attr('class', 'planetary')
                .attr('id', 'moon')
                .attr('d', base.path);
            base.drawLabelsForObjects([moonFeature], 'moon-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1] - 12; });
        }


    };
        
    base.drawConstellations = function(error, data) {
        // Handle errors getting and parsing the data
        if (error) { console.log(error); return error; }

        if (base.options.constellations.draw) 
            base.const_group.selectAll('path.constellation').data(data.features)
                .enter().append('path')
                .attr('class', 'constellation')
                .attr('d', base.path)
                .attr('style', 'fill: none; stroke-width: 0.64; stroke-linecap: butt; stroke-linejoin: miter; stroke: rgb(173,222,138); stroke-opacity: 1; stroke-miterlimit: 4;');

        if (base.options.constellations.label) 
            base.drawLabelsForObjects(data.features, 'constellation-label', 
                    function(d) { return base.path.centroid(d)[0]; },
                    function(d) { return base.path.centroid(d)[1]; },
                    'fill: rgba(0, 0, 0, 0.3); font-family: "Trebuchet MS", Helvetica, sans-serif; font-size: 80%; letter-spacing: 0.2em; text-anchor: bottom; dominant-baseline:top; text-transform: uppercase; font-style: italic;');
        
    };

    base.drawStars = function(error, data) {
        // Handle errors getting and parsing the data
        if (error) { return error; }

        var stars = data.features.filter(function(d) {
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
        base.star_group.selectAll('path.star')
            .data(stars.filter(function(d) { return base.path(d) != undefined; }))
            .enter().append('path')
            .attr('class', 'star')
            .attr('id', function(d) { return d.properties.id; })
            .attr('d', base.path)
            .attr('style', 'fill: black; fill-opacity: 0.9;');

        base.drawLabelsForObjects(stars, 'star-label', 
                function(d) { return base.path.centroid(d)[0]; },
                function(d) { return base.path.centroid(d)[1] - rScale(d.properties.magnitude) * 2; },
                'font-size: 80%; font-family: "Trebuchet MS", Helvetica, sans-serif; fill: rgba(35, 31, 32, 0.75);');

    };

    base.drawObjects = function(error, data) {
        // Handle errors getting and parsing the data
        if (error) { return error; }

        // Galaxies
        // -----
        // The galaxy is a red ellipse whose shape and orientation
        // roughly match that of the object it represents; an SVG
        // ellipse.
        var galaxies = data.features.filter(function(d) {
            return d.properties.type == 'Galaxy' && 
                (
                  // The magnitude is below our threshold OR
                  (d.properties.magnitude <= base.options.galaxies.magnitude) ||
                  // The object has an override
                  (base.data.overrides(d).hasOwnProperty('show'))
                ) &&
                base.path(d) != undefined;
        });
        // We'll size galaxies based on their size, within our
        // min/max range.
        var galaxyMajorScale = d3.scale.linear()
            .domain(d3.extent(galaxies, function(d) {
                return d3.max(d.properties.size); }))
            .range(base.options.galaxies.majorscale);
        var galaxyMinorScale = d3.scale.linear()
            .domain(d3.extent(galaxies, function(d) {
                return d3.min(d.properties.size); }))
            .range(base.options.galaxies.minorscale);
        var galaxyElms = base.obj_group.selectAll('ellipse.galaxy')
            .data(galaxies)
            .enter().append('ellipse')
            .attr("id", function(d) { return d.properties.id; })
            .attr('class', 'galaxy object')
            .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
            .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
            .attr('rx', function(d) { return galaxyMajorScale(d.properties.size[0]); })
            .attr('ry', function(d) { return galaxyMinorScale(d.properties.size[1]); })
            .attr('transform', function(d) {
                var transform = 'rotate(' + d.properties.angle + ',' + 
                        base.projection(d.geometry.coordinates)[0] + ',' + 
                        base.projection(d.geometry.coordinates)[1] + ')';
                return transform;
            })
            .attr('style', 'fill: rgb(236, 28, 36);  fill-opacity: 0.9; stroke-width: 0.32; stroke: rgb(35,31,32);');
              
        var galaxyLabels = base.drawLabelsForObjects(galaxies, 'galaxy-label', 
                function(d) { return base.path.centroid(d)[0]; },
                function(d) { return base.path.centroid(d)[1] - galaxyMajorScale(d.properties.size[0]) * 2; },
                'font-size: 75%; font-family: "Trebuchet MS", Helvetica, sans-serif; font-style: italic; text-transform: uppercase; fill: rgba(35, 31, 32, 0.75);');
        
        if (base.options.galaxies.labelhover) {
            galaxyLabels.style('visibility', 'hidden');
            galaxyElms
                .on('mouseover', base.toggleLabel)
                .on('mouseout', base.toggleLabel);
        }
                    
        // Open Clusters
        // -----
        // The open cluster is a yellow circle with a dashed border
        // to indicate its openness; an SVG circle.
        var openClusters = data.features.filter(function(d) {
            return d.properties.type == 'Open Cluster' && 
                (
                  // The magnitude is below our threshold OR
                  (d.properties.magnitude <= base.options.openclusters.magnitude) ||
                  // The object has an override
                  (base.data.overrides(d).hasOwnProperty('show'))
                ) &&
                base.path(d) != undefined;
        });
        // We'll size clusters based on their magnitude, within our
        // min/max range.
        var openClusterMagnitudeScale = d3.scale.linear()
            .domain(d3.extent(openClusters, function(d) {
                return d.properties.magnitude; }))
            .range(base.options.openclusters.scale);
        var openClusterElms = base.obj_group.selectAll('circle.open-cluster')
            .data(openClusters)
            .enter().append('circle')
            .attr("id", function(d) { return d.properties.id; })
            .attr('class', 'open-cluster object')
            .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
            .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
            .attr('r', function(d) { return openClusterMagnitudeScale(d.properties.magnitude); })
            .attr('style', 'fill: rgb(255, 242, 0); stroke-width: 0.8; stroke-linecap: round; stroke: rgb(35, 31, 32); stroke-opacity: 1; stroke-dasharray: 0, 2.5;');
                
        var openClusterLabels = base.drawLabelsForObjects(openClusters, 'opencluster-label', 
                function(d) { return base.path.centroid(d)[0]; },
                function(d) { return base.path.centroid(d)[1] - openClusterMagnitudeScale(d.properties.magnitude) * 2; },
                'font-size: 75%; font-family: "Trebuchet MS", Helvetica, sans-serif; font-style: italic; text-transform: uppercase; fill: rgba(35, 31, 32, 0.75);');
        if (base.options.globularclusters.labelhover) {
            openClusterLabels.style('visibility', 'hidden');
            openClusterElms
                .on('mouseover', base.toggleLabel)
                .on('mouseout', base.toggleLabel);
        }

        // Globular Clusters
        // -----
        // The globular cluster is a yellow circle with one vertical
        // and one horizontal line; a circle and two paths.
        var globularClusters = data.features.filter(function(d) {
            return d.properties.type == 'Globular Cluster' && 
                (
                  // The magnitude is below our threshold OR
                  (d.properties.magnitude <= base.options.globularclusters.magnitude) ||
                  // The object has an override
                  (base.data.overrides(d).hasOwnProperty('show'))
                ) &&
                base.path(d) != undefined;
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
                .attr("id", function(d) { return d.properties.id; })
                .attr('class', 'globular-cluster object');
        globularClusterElms.append('circle')
                .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                .attr('r', function(d) { return globularClusterMagnitudeScale(d.properties.magnitude); })
                .attr('style', 'fill: rgb(255, 242, 0); stroke-width: 0.32; stroke: rgb(35,31,32);');
        globularClusterElms.append('path')
                .attr('d', function(d) {
                    var coords = [
                        base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]
                    ];
                    var line = base.utils.lineFunction([
                            [coords[0]-globularClusterMagnitudeScale(
                                d.properties.magnitude),
                             coords[1]],
                            [coords[0]+globularClusterMagnitudeScale(
                                d.properties.magnitude), 
                             coords[1]]
                             ]);
                    return line;
                })
                .attr('style', 'stroke-width: 0.32;  stroke: rgb(35, 31, 32);');
        globularClusterElms.append('path')
                .attr('d', function(d) {
                    var coords = [
                        base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]
                    ];
                    return base.utils.lineFunction([
                            [coords[0],
                             coords[1]-globularClusterMagnitudeScale(
                                 d.properties.magnitude)],
                            [coords[0],
                             coords[1]+globularClusterMagnitudeScale(
                                 d.properties.magnitude)]
                             ]);
                })
                .attr('style', 'stroke-width: 0.32;  stroke: rgb(35, 31, 32);');
        var globularClusterLabels = base.drawLabelsForObjects(globularClusters, 'globularcluster-label', 
                function(d) { return base.path.centroid(d)[0]; },
                function(d) { return base.path.centroid(d)[1] - globularClusterMagnitudeScale(d.properties.magnitude) * 2; },
                'font-size: 75%; font-family: "Trebuchet MS", Helvetica, sans-serif; font-style: italic; text-transform: uppercase; fill: rgba(35, 31, 32, 0.75);');
        if (base.options.globularclusters.labelhover) {
            globularClusterLabels.style('visibility', 'hidden');
            globularClusterElms
                .on('mouseover', base.toggleLabel)
                .on('mouseout', base.toggleLabel);
        }
            

        // Planetary Nebulas
        // -----
        // The planetary nebula is a green circle with one vertical
        // and one horizontal line; a circle and two paths.
        var planetaryNebulas = data.features.filter(function(d) {
            return d.properties.type == 'Planetary Nebula' && 
                (
                  // The magnitude is below our threshold OR
                  (d.properties.magnitude <= base.options.planetarynebulas.magnitude) ||
                  // The object has an override
                  (base.data.overrides(d).hasOwnProperty('show'))
                ) &&
                base.path(d) != undefined;
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
                .attr("id", function(d) { return d.properties.id; })
                .attr('class', 'planetary-nebula object');
        planetaryNebulaElms.append('circle')
                .attr('cx', function(d) { return base.projection(d.geometry.coordinates)[0]; })
                .attr('cy', function(d) { return base.projection(d.geometry.coordinates)[1]; })
                .attr('r', function(d) { return planetaryNebulaMagnitudeScale(d.properties.magnitude)/2; })
                .attr('style', 'fill: rgb(128, 204, 40); stroke-width: 0.32; stroke: rgb(35, 31, 32);');
        planetaryNebulaElms.append('path')
                .attr('d', function(d) {
                    var coords = [
                        base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]
                    ];
                    var line = base.utils.lineFunction([
                            [coords[0]-planetaryNebulaMagnitudeScale(
                                d.properties.magnitude),
                             coords[1]],
                            [coords[0]+planetaryNebulaMagnitudeScale(
                                d.properties.magnitude), 
                             coords[1]]
                             ]);
                    return line;
                })
                .attr('style', 'stroke-width: 0.32;  stroke: rgb(35, 31, 32);');
        planetaryNebulaElms.append('path')
                .attr('d', function(d) {
                    var coords = [
                        base.projection(d.geometry.coordinates)[0],
                        base.projection(d.geometry.coordinates)[1]
                    ];
                    return base.utils.lineFunction([
                            [coords[0],
                             coords[1]-planetaryNebulaMagnitudeScale(
                                 d.properties.magnitude)],
                            [coords[0],
                             coords[1]+planetaryNebulaMagnitudeScale(
                                 d.properties.magnitude)]
                             ]);
                })
                .attr('style', 'stroke-width: 0.32;  stroke: rgb(35, 31, 32);');
        var planetaryNebulaLabels = base.drawLabelsForObjects(planetaryNebulas, 'planetarynebula-label', 
                function(d) { return base.path.centroid(d)[0]; },
                function(d) { return base.path.centroid(d)[1] - planetaryNebulaMagnitudeScale(d.properties.magnitude) * 2; },
                'font-size: 75%; font-family: "Trebuchet MS", Helvetica, sans-serif; font-style: italic; text-transform: uppercase; fill: rgba(35, 31, 32, 0.75);');
        if (base.options.planetarynebulas.labelhover) {
            planetaryNebulaLabels.style('visibility', 'hidden');
            planetaryNebulaElms
                .on('mouseover', base.toggleLabel)
                .on('mouseout', base.toggleLabel);
        }

        // Bright Nebulas
        // -----
        var brightNebulas = data.features.filter(function(d) {
            return d.properties.type == 'Bright Nebula' && 
                (
                  // The magnitude is below our threshold OR
                  (d.properties.magnitude <= base.options.brightnebulas.magnitude) ||
                  // The object has an override
                  (base.data.overrides(d).hasOwnProperty('show'))
                ) &&
                base.path(d) != undefined;
        });

        // We'll size the nebulas based on their magnitude, within our
        // min/max range.
        var brightNebulaMagnitudeScale = d3.scale.linear()
            .domain(d3.extent(brightNebulas, function(d) {
                return d.properties.magnitude; }))
            .range(base.options.brightnebulas.scale);
        var brightNebulaElms = base.obj_group.selectAll('rect.bright-nebula')
            .data(brightNebulas)
            .enter().append('rect')
            .attr("id", function(d) { return d.properties.id; })
            .attr('class', 'bright-nebula object')
            .attr('x', function(d) { return base.projection(d.geometry.coordinates)[0]; })
            .attr('y', function(d) { return base.projection(d.geometry.coordinates)[1]; })
            .attr('height', function(d) { return brightNebulaMagnitudeScale(d.properties.magnitude); })
            .attr('width', function(d) { return brightNebulaMagnitudeScale(d.properties.magnitude); })
            .attr('style', 'fill: rgb(128, 204, 40); stroke-width: 0.32; stroke: rgb(35, 31, 32);');
        


        var brightNebulaLabels = base.drawLabelsForObjects(brightNebulas, 'brightnebula-label', 
                function(d) { return base.path.centroid(d)[0] + brightNebulaMagnitudeScale(d.properties.magnitude) / 2; },
                function(d) { return base.path.centroid(d)[1] - brightNebulaMagnitudeScale(d.properties.magnitude) / 2; },
                'font-size: 75%; font-family: "Trebuchet MS", Helvetica, sans-serif; font-style: italic; text-transform: uppercase; fill: rgba(35, 31, 32, 0.75);');

        if (base.options.brightnebulas.labelhover) {
            brightNebulaLabels.style('visibility', 'hidden');
            brightNebulaElms
                .on('mouseover', base.toggleLabel)
                .on('mouseout', base.toggleLabel);
        }

    };

    // Toggle the visibility of a label for a given feature
    base.toggleLabel = function(data) {
        var label = base.svg.select('#' + data.properties.id + '-label')
        if (label.style('visibility') == 'hidden') {
            label.style('visibility', 'visible'); 
        } else if (label.style('visibility') == 'visible') {
            label.style('visibility', 'hidden'); 
        }
    }

    // Data handling functions
    base.data = {};

    // Return a new object for d.properties that replaces any
    // members with any specified override values.
    base.data.overrides = function(d) {
        if (base.options.overrides[d.properties.id] == undefined)
            return d.properties;

        var overrides = base.options.overrides[d.properties.id];
        var overrideProperties = base.utils.extend({}, d.properties, overrides);
        return overrideProperties;
    }

    // Information querying functions
    base.info = {};
    base.info.datetime = function() {
        return base.datetime.toString('h:mm tt MMM d, yyyy');
    };

    base.info.location = function() {
        var latstring = (base.options.location.latitude > 0) ? 
                        base.options.location.latitude + ' N ' :
                        -1 * base.options.location.latitude + ' S ';
        var lonstring = (base.options.location.longitude> 0) ? 
                        base.options.location.longitude + ' E ' :
                        -1 * base.options.location.longitude + ' W '; 
        var locstring = latstring + lonstring;
        return locstring;
    };

    // Utility functions 
    // ----
    base.utils = {};

    // An extend()-alike function
    // http://gomakethings.com/ditching-jquery/#extend
    base.utils.extend = function(objects) {
        var extended = {};
        var merge = function (obj) {
            for (var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    if ( Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
                        extended[prop] = base.utils.extend(extended[prop], obj[prop]);
                    }
                    else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };
        merge(arguments[0]);
        for (var i = 1; i < arguments.length; i++) {
            var obj = arguments[i];
            merge(obj);
        }
        return extended;
    };

    base.utils.width = function() {
        var width = base.options.size.width;
        if (typeof width == "string") {
            // assume it's a percentage
            width = parseFloat(width)/100 * base.el.node().getBBox().width;
        }
        return width - base.margin.left - base.margin.right;
    };

    base.utils.height = function() {
        var height = base.options.size.height;
        if (typeof height == "string") {
            // assume it's a percentage
            height = parseFloat(height)/100 * base.el.node().getBBox().height;
        }
        return height - base.margin.top - base.margin.bottom;
    };
    
    // Generate a D3 line function that we'll use for the
    // planetary nebula and globular cluster symbols.
    base.utils.lineFunction = d3.svg.line()
        .x(function(d) { return d[0]; })
        .y(function(d) { return d[1]; })
        .interpolate("linear");

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
        if(!date) date = base.datetime;

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
        if(!date) date = base.datetime;
        if(!lon) lon = base.options.location.longitude;

        function frac(x) {
            x -= Math.floor(x);
            return x < 0 ? x + 1.0 : x;
        };

        var GMST = base.utils.greenwichMeanSiderealTime(date);
        var LMST =  24.0*frac((GMST + lon/15.0)/24.0);
        return LMST;
    };

    base.utils.sun = function(date) {
        if(!date) date = base.datetime;

        var JD = base.utils.julianDay(date);
        var D = JD-2455196.5;
        var eg = 279.557208;
        var wg = 283.112438;
        var e = 0.016705;

        var N = ((360/365.242191) * D) % 360;
        if (N < 0)
            N += 360;

        var Mo = (N + eg - wg) % 360;
        if (Mo < 0)
            Mo += 360;

        var v = Mo + (360/Math.PI) * e * Math.sin(Mo * Math.PI/180);
        var lon = v + wg;
        if (lon > 360)
            lon -= 360;

        var lat = 0;

        return {lat:lat, lon:lon, Mo:Mo, D:D, N:N};
    }

    base.utils.sunFeature = function() {
        var coords = base.utils.sun();
        var sun_feature = { 
            "type": "Feature",
            "geometry": {
                "type": "Point", 
                "coordinates": [360 - coords.lon, -1 * coords.lat]
            },
            "properties": {
                "name": "Sun", 
                "id": "sun",
                "magnitude": -26.74
            }
        };
        return sun_feature;
    }; 

    base.utils.moon = function(date) {
        if(!date) date = base.datetime;

        var JD = base.utils.julianDay(date);
        var sun = base.utils.sun(date);
        var lo = 91.929336;
        var Po = 130.143076;
        var No = 291.682547;
        var i = 5.145396;
        var e =  0.0549;

        var l = (13.1763966 * sun.D + lo) % 360;
        if (l < 0)
            l += 360;

        var Mm = (l - 0.1114041 * sun.D - Po) % 360;
        if (Mm < 0)
            Mm += 360;

        var N = (No - 0.0529539 * sun.D) % 360;
        if (N < 0)
            N += 360;

        var C = l - sun.lon;
        var Ev = 1.2739 * Math.sin((2 * C - Mm) * PI_OVER_180);
        var sinMo = Math.sin(sun.Mo * PI_OVER_180);
        var Ae = 0.1858 * sinMo;
        var A3 = 0.37 * sinMo;
        var Mprimem = Mm + Ev - Ae - A3;
        var Ec = 6.2886 * Math.sin(Mprimem * PI_OVER_180);
        var A4 = 0.214*Math.sin(2 * Mprimem * PI_OVER_180);
        var lprime = l + Ev + Ec -Ae + A4;
        var V = 0.6583 * Math.sin(2 * (lprime - sun.lon) * PI_OVER_180);
        var lprimeprime = lprime + V;
        var Nprime =N - 0.16 * sinMo;
        var lppNp = (lprimeprime-Nprime) * PI_OVER_180;
        var sinlppNp = Math.sin(lppNp);
        var y = sinlppNp * Math.cos(i * PI_OVER_180);
        var x = Math.cos(lppNp);

        var lm = Math.atan2(y, x)/PI_OVER_180 + Nprime; 
        var Bm = Math.asin(sinlppNp * Math.sin(i * PI_OVER_180)) / PI_OVER_180;
        if (lm > 360)
            lm -= 360;

        return [Bm, lm];
    }

    base.utils.moonFeature = function() {
        var coords = base.utils.moon();
        var moon_feature = { 
            "type": "Feature",
            "geometry": {
                "type": "Point", 
                "coordinates": [360 - coords[1], -1 * coords[0]]
            },
            "properties": {
                "name": "Moon", 
                "id": "moon",
                "magnitude": -12.74 
            }
        };
        return moon_feature;
    }; 

    base.utils.zenith = function() {
        if (!base.options.center.ra && !base.options.center.dec) {
            var date = base.datetime;
            var location = base.options.location;
            var dec = -1 * location.latitude;
            var ra = base.utils.localSiderealTime() * 15;

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

    // Default options for the chart
    base.defaultOptions = {
        // The size of the chart  viewport. This plus the `scale`
        // effects how much of the sphere is visible.
        size: {
            width: 400,
            height: 400,
        },

        // The scale of the chart. This effects how much of the sphere
        // is visible within the chart's viewport (`size`).
        scale: 1, 

        // Zoomablility
        zoom: {
            zoomable: true,
            extent: 10
        },

        // The date to be charted. Defaults to 'now'.
        datetime: new Date(),

        // The location from which the sky is observered
        location: {
            latitude: 40.7528000,
            longitude: -73.9765222
        },
            
        // OR

        // The positioning of the chart. If the chart's scale is such
        // that you can see the entire sphere, this will effect its
        // rotation.
        // RA is presumed in decimal hours, dec in degrees.
        center: {
            ra: undefined,
            dec: undefined
        },

        // Chart Features
        graticule: true,
        zenith: {
            show: true,
            size: 5
        },
        ecliptic: true,
        information: true,

        data: {
            constellations: 'data/constellations.json',
            objects: 'data/objects.json',
            stars: 'data/starsHD.json'
        },

        // Solar System
        solar: {
            moon: true,
            sun: true,
            planets: true
        },

        // Sky
        constellations: {
            draw: true,
            label: true,
        },

        stars: {
            magnitude: 5,
            scale: [6, 0.25],
            labelhover: false
        },

        galaxies: {
            magnitude: 10,
            majorscale: [4, 8],
            minorscale: [2, 4],
            labelhover: true
        },
        
        openclusters: {
            magnitude: 6,
            scale: [6,3],
            labelhover: true
        },

        globularclusters: {
            magnitude: 8,
            scale: [6,4],
            labelhover: true
        },

        planetarynebulas: {
            magnitude: 12,
            scale: [10,6],
            labelhover: true
        },

        brightnebulas: {
            magnitude: 12,
            scale: [10,6],
            labelhover: true
        },

        // Override settings/label for any given object
        // overrides: base.utils.extend({}, BrightStars, Messier, InterestingObjects),
        overrides: {}

    };
    
    // Run initializer
    base.init();

    // Return the object
    return base;
};

ObservationChart.BrightStarOverrides = {
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
};

ObservationChart.MessierOverrides = {
    // Messier objects (in our catalog by their NGCnumbers)
    NGC1952: {name: 'M1'},
    NGC7089: {name: 'M2'},
    NGC5272: {name: 'M3'},
    NGC6121: {name: 'M4'},
    NGC5904: {name: 'M5'},
    NGC6405: {name: 'M6'},
    NGC6475: {name: 'M7'},
    NGC6523: {name: 'M8'},
    NGC6333: {name: 'M9'},
    NGC6254: {name: 'M10'},
    NGC6705: {name: 'M11'},
    NGC6218: {name: 'M12'},
    NGC6205: {name: 'M13'},
    NGC6402: {name: 'M14'},
    NGC7078: {name: 'M15'},
    NGC6611: {name: 'M16'},
    NGC6618: {name: 'M17'},
    NGC6613: {name: 'M18'},
    NGC6273: {name: 'M19'},
    NGC6514: {name: 'M20'},
    NGC6531: {name: 'M21'},
    NGC6656: {name: 'M22'},
    NGC6494: {name: 'M23'},
    IC4715: {name: 'M24'},
    IC4725: {name: 'M25'},
    NGC6694: {name: 'M26'},
    NGC6853: {name: 'M27'},
    NGC6626: {name: 'M28'},
    NGC6913: {name: 'M29'},
    NGC7099: {name: 'M30'},
    NGC224: {name: 'M31'},
    NGC221: {name: 'M32'},
    NGC598: {name: 'M33'},
    NGC1039: {name: 'M34'},
    NGC2168: {name: 'M35'},
    NGC1960: {name: 'M36'},
    NGC2099: {name: 'M37'},
    NGC1912: {name: 'M38'},
    NGC7092: {name: 'M39'},
    NGC2287: {name: 'M41'},
    NGC1976: {name: 'M42'},
    NGC1982: {name: 'M43'},
    NGC2632: {name: 'M44'},
    NCG1432: {name: 'M45'},
    NGC1435: {name: 'M45'},
    NGC2437: {name: 'M46'},
    NGC2422: {name: 'M47'},
    NGC2548: {name: 'M48'},
    NGC4472: {name: 'M49'},
    NGC2323: {name: 'M50'},
    NGC5194: {name: 'M51'},
    NGC5195: {name: 'M51'},
    NGC7654: {name: 'M52'},
    NGC5024: {name: 'M53'},
    NGC6715: {name: 'M54'},
    NGC6809: {name: 'M55'},
    NGC6779: {name: 'M56'},
    NGC6720: {name: 'M57'},
    NGC4579: {name: 'M58'},
    NGC4621: {name: 'M59'},
    NGC4649: {name: 'M60'},
    NGC4303: {name: 'M61'},
    NGC6266: {name: 'M62'},
    NGC5055: {name: 'M63'},
    NGC4826: {name: 'M64'},
    NGC3623: {name: 'M65'},
    NGC3627: {name: 'M66'},
    NGC2682: {name: 'M67'},
    NGC4590: {name: 'M68'},
    NGC6637: {name: 'M69'},
    NGC6681: {name: 'M70'},
    NGC6838: {name: 'M71'},
    NGC6981: {name: 'M72'},
    NGC6994: {name: 'M73'},
    NGC628: {name: 'M74'},
    NGC6864: {name: 'M75'},
    NGC650: {name: 'M76'},
    NGC651: {name: 'M76'},
    NGC1068: {name: 'M77'},
    // NGC2064: {name: 'M78'},
    // NGC2067: {name: 'M78'},
    NGC2068: {name: 'M78'},
    NGC2071: {name: 'M78'},
    NGC1904: {name: 'M79'},
    NGC6093: {name: 'M80'},
    NGC3031: {name: 'M81'},
    NGC3034: {name: 'M82'},
    NGC5236: {name: 'M83'},
    NGC4374: {name: 'M84'},
    NGC4382: {name: 'M85'},
    NGC4406: {name: 'M86'},
    NGC4486: {name: 'M87'},
    NGC4501: {name: 'M88'},
    NGC4552: {name: 'M89'},
    NGC4569: {name: 'M90'},
    NGC4548: {name: 'M91'},
    NGC6341: {name: 'M92'},
    NGC2447: {name: 'M93'},
    NGC4736: {name: 'M94'},
    NGC3351: {name: 'M95'},
    NGC3368: {name: 'M96'},
    NGC3587: {name: 'M97'},
    NGC4192: {name: 'M98'},
    NGC4254: {name: 'M99'},
    NGC4321: {name: 'M100'},
    NGC5457: {name: 'M101'},
    NGC581: {name: 'M103'},
    NGC4594: {name: 'M104'},
    NGC3379: {name: 'M105'},
    NGC4258: {name: 'M106'},
    NGC6171: {name: 'M107'},
    NGC3556: {name: 'M108'},
    NGC3992: {name: 'M109'},
    NGC205: {name: 'M110'},
};

ObservationChart.AlwaysMessierOverrides = {
    // Messier objects (in our catalog by their NGCnumbers)
    NGC1952: {name: 'M1', show: true,},
    NGC7089: {name: 'M2', show: true,},
    NGC5272: {name: 'M3', show: true,},
    NGC6121: {name: 'M4', show: true,},
    NGC5904: {name: 'M5', show: true,},
    NGC6405: {name: 'M6', show: true,},
    NGC6475: {name: 'M7', show: true,},
    NGC6523: {name: 'M8', show: true,},
    NGC6333: {name: 'M9', show: true,},
    NGC6254: {name: 'M10', show: true,},
    NGC6705: {name: 'M11', show: true,},
    NGC6218: {name: 'M12', show: true,},
    NGC6205: {name: 'M13', show: true,},
    NGC6402: {name: 'M14', show: true,},
    NGC7078: {name: 'M15', show: true,},
    NGC6611: {name: 'M16', show: true,},
    NGC6618: {name: 'M17', show: true,},
    NGC6613: {name: 'M18', show: true,},
    NGC6273: {name: 'M19', show: true,},
    NGC6514: {name: 'M20', show: true,},
    NGC6531: {name: 'M21', show: true,},
    NGC6656: {name: 'M22', show: true,},
    NGC6494: {name: 'M23', show: true,},
    IC4715: {name: 'M24', show: true,},
    IC4725: {name: 'M25', show: true,},
    NGC6694: {name: 'M26', show: true,},
    NGC6853: {name: 'M27', show: true,},
    NGC6626: {name: 'M28', show: true,},
    NGC6913: {name: 'M29', show: true,},
    NGC7099: {name: 'M30', show: true,},
    NGC224: {name: 'M31', show: true,},
    NGC221: {name: 'M32', show: true,},
    NGC598: {name: 'M33', show: true,},
    NGC1039: {name: 'M34', show: true,},
    NGC2168: {name: 'M35', show: true,},
    NGC1960: {name: 'M36', show: true,},
    NGC2099: {name: 'M37', show: true,},
    NGC1912: {name: 'M38', show: true,},
    NGC7092: {name: 'M39', show: true,},
    NGC2287: {name: 'M41', show: true,},
    NGC1976: {name: 'M42', show: true,},
    NGC1982: {name: 'M43', show: true,},
    NGC2632: {name: 'M44', show: true,},
    NCG1432: {name: 'M45', show: true,},
    NGC1435: {name: 'M45', show: true,},
    NGC2437: {name: 'M46', show: true,},
    NGC2422: {name: 'M47', show: true,},
    NGC2548: {name: 'M48', show: true,},
    NGC4472: {name: 'M49', show: true,},
    NGC2323: {name: 'M50', show: true,},
    NGC5194: {name: 'M51', show: true,},
    NGC5195: {name: 'M51', show: true,},
    NGC7654: {name: 'M52', show: true,},
    NGC5024: {name: 'M53', show: true,},
    NGC6715: {name: 'M54', show: true,},
    NGC6809: {name: 'M55', show: true,},
    NGC6779: {name: 'M56', show: true,},
    NGC6720: {name: 'M57', show: true,},
    NGC4579: {name: 'M58', show: true,},
    NGC4621: {name: 'M59', show: true,},
    NGC4649: {name: 'M60', show: true,},
    NGC4303: {name: 'M61', show: true,},
    NGC6266: {name: 'M62', show: true,},
    NGC5055: {name: 'M63', show: true,},
    NGC4826: {name: 'M64', show: true,},
    NGC3623: {name: 'M65', show: true,},
    NGC3627: {name: 'M66', show: true,},
    NGC2682: {name: 'M67', show: true,},
    NGC4590: {name: 'M68', show: true,},
    NGC6637: {name: 'M69', show: true,},
    NGC6681: {name: 'M70', show: true,},
    NGC6838: {name: 'M71', show: true,},
    NGC6981: {name: 'M72', show: true,},
    NGC6994: {name: 'M73', show: true,},
    NGC628: {name: 'M74', show: true,},
    NGC6864: {name: 'M75', show: true,},
    NGC650: {name: 'M76', show: true,},
    NGC651: {name: 'M76', show: true,},
    NGC1068: {name: 'M77', show: true,},
    // NGC2064: {name: 'M78', show: true,},
    // NGC2067: {name: 'M78', show: true,},
    NGC2068: {name: 'M78', show: true,},
    NGC2071: {name: 'M78', show: true,},
    NGC1904: {name: 'M79', show: true,},
    NGC6093: {name: 'M80', show: true,},
    NGC3031: {name: 'M81', show: true,},
    NGC3034: {name: 'M82', show: true,},
    NGC5236: {name: 'M83', show: true,},
    NGC4374: {name: 'M84', show: true,},
    NGC4382: {name: 'M85', show: true,},
    NGC4406: {name: 'M86', show: true,},
    NGC4486: {name: 'M87', show: true,},
    NGC4501: {name: 'M88', show: true,},
    NGC4552: {name: 'M89', show: true,},
    NGC4569: {name: 'M90', show: true,},
    NGC4548: {name: 'M91', show: true,},
    NGC6341: {name: 'M92', show: true,},
    NGC2447: {name: 'M93', show: true,},
    NGC4736: {name: 'M94', show: true,},
    NGC3351: {name: 'M95', show: true,},
    NGC3368: {name: 'M96', show: true,},
    NGC3587: {name: 'M97', show: true,},
    NGC4192: {name: 'M98', show: true,},
    NGC4254: {name: 'M99', show: true,},
    NGC4321: {name: 'M100', show: true,},
    NGC5457: {name: 'M101', show: true,},
    NGC581: {name: 'M103', show: true,},
    NGC4594: {name: 'M104', show: true,},
    NGC3379: {name: 'M105', show: true,},
    NGC4258: {name: 'M106', show: true,},
    NGC6171: {name: 'M107', show: true,},
    NGC3556: {name: 'M108', show: true,},
    NGC3992: {name: 'M109', show: true,},
    NGC205: {name: 'M110', show: true,},
};

ObservationChart.InterestingObjectOverrides = {
    // Interesting NGCobjects worth labeling (from SEDS)
    NGC104: {name: 'NGC104',},
    NGC188: {name: 'NGC188',},
    NGC189: {name: 'NGC189',},
    NGC206: {name: 'NGC206',},
    NGC225: {name: 'NGC225',},
    NGC253: {name: 'NGC253',},
    NGC292: {name: 'NGC292',},
    NGC381: {name: 'NGC381',},
    NGC595: {name: 'NGC595',},
    NGC604: {name: 'NGC604',},
    NGC659: {name: 'NGC659',},
    NGC752: {name: 'NGC752',},
    NGC869: {name: 'NGC869',},
    NGC884: {name: 'NGC884',},
    NGC891: {name: 'NGC891',},
    NGC1055: {name: 'NGC1055',},
    NGC1432: {name: 'NGC1432',},
    NGC1435: {name: 'NGC1435',},
    NGC2023: {name: 'NGC2023',},
    NGC2070: {name: 'NGC2070',},
    NGC2169: {name: 'NGC2169',},
    NGC2175: {name: 'NGC2175',},
    NGC2204: {name: 'NGC2204',},
    NGC2237: {name: 'NGC2237',},
    NGC2238: {name: 'NGC2238',},
    NGC2239: {name: 'NGC2239',},
    NGC2244: {name: 'NGC2244',},
    NGC2246: {name: 'NGC2246',},
    NGC2264: {name: 'NGC2264',},
    NGC2349: {name: 'NGC2349',},
    NGC2360: {name: 'NGC2360',},
    NGC2362: {name: 'NGC2362',},
    NGC2403: {name: 'NGC2403',},
    NGC2419: {name: 'NGC2419',},
    NGC2438: {name: 'NGC2438',},
    NGC2451: {name: 'NGC2451',},
    NGC2477: {name: 'NGC2477',},
    NGC2516: {name: 'NGC2516',},
    NGC2546: {name: 'NGC2546',},
    NGC2547: {name: 'NGC2547',},
    NGC2903: {name: 'NGC2903',},
    NGC2976: {name: 'NGC2976',},
    NGC3077: {name: 'NGC3077',},
    NGC3115: {name: 'NGC3115',},
    NGC3228: {name: 'NGC3228',},
    NGC3293: {name: 'NGC3293',},
    NGC3372: {name: 'NGC3372',},
    NGC3532: {name: 'NGC3532',},
    NGC3628: {name: 'NGC3628',},
    NGC3766: {name: 'NGC3766',},
    NGC3953: {name: 'NGC3953',},
    NGC4565: {name: 'NGC4565',},
    NGC4571: {name: 'NGC4571',},
    NGC4631: {name: 'NGC4631',},
    NGC4656: {name: 'NGC4656',},
    NGC4755: {name: 'NGC4755',},
    NGC4833: {name: 'NGC4833',},
    NGC5128: {name: 'NGC5128',},
    NGC5139: {name: 'NGC5139',},
    NGC5195: {name: 'NGC5195',},
    NGC5281: {name: 'NGC5281',},
    NGC5662: {name: 'NGC5662',},
    NGC5907: {name: 'NGC5907',},
    NGC6025: {name: 'NGC6025',},
    NGC6124: {name: 'NGC6124',},
    NGC6231: {name: 'NGC6231',},
    NGC6242: {name: 'NGC6242',},
    NGC6397: {name: 'NGC6397',},
    NGC6530: {name: 'NGC6530',},
    NGC6543: {name: 'NGC6543',},
    NGC6603: {name: 'NGC6603',},
    NGC6633: {name: 'NGC6633',},
    NGC6712: {name: 'NGC6712',},
    NGC6819: {name: 'NGC6819',},
    NGC6822: {name: 'NGC6822',},
    NGC6866: {name: 'NGC6866',},
    NGC6946: {name: 'NGC6946',},
    NGC7000: {name: 'NGC7000',},
    NGC7009: {name: 'NGC7009',},
    NGC7293: {name: 'NGC7293',},
    NGC7331: {name: 'NGC7331',},
    NGC7380: {name: 'NGC7380',},
    NGC7479: {name: 'NGC7479',},
    NGC7789: {name: 'NGC7789',},
    IC10: {name: 'IC10',},
    IC349: {name: 'IC349',},
    IC434: {name: 'IC434',},
    IC1434: {name: 'IC1434',},
    IC2391: {name: 'IC2391',},
    IC2395: {name: 'IC2395',},
    IC2488: {name: 'IC2488',},
    IC2602: {name: 'IC2602',},
    IC4665: {name: 'IC4665',},
    IC5152: {name: 'IC5152',},
};

