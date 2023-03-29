function project(){
    var filePath="data/homeless_ca.csv";
    part1(filePath);
    part2(filePath);
    part3(filePath);
    part4(filePath);
    part5(filePath);
}

var part1=function(filePath){
    d3.csv(filePath).then(function(data){
        var overall_homeless = d3.rollup(data, v=>d3.sum(v, d=>d['Overall Homeless']), d=>d['Year'], d=>d['CoC Number']);
        var years = Array.from(overall_homeless.keys()).map(Number)
        
        //create svg
        var width = 1300;
        var height = 700;
        var svg = d3.select("#geoPlot")
            .append("svg")
            .lower()
            .attr("width", width)
            .attr("height", height);
        
        //scale data
        var rScale = d3.scaleSqrt()
            .domain([0, d3.max(overall_homeless.get('2022').values())])
            .range([5, 60]);
        var cScale = d3.scaleSequential()
            .interpolator(d3.interpolateYlOrBr)
            .domain([-10, rScale(d3.max(overall_homeless.get('2022').values()))]);
        
        //map data
        const projection  = d3.geoMercator()
            .center([-120, 37])
            .scale(2800)
            .translate([1000, 350]);
        const pathgeo = d3.geoPath().projection(projection);
        var ca_map = d3.json("data/California_County_Boundaries.geojson");
        svg.append("text").attr('id', 'value').text('Year: ' + d3.min(years)).attr('transform', 'translate(400,480)');

        const features = ca_map.then(function(map){
            //get num of counties per CoC
            var num_counties = {}
            for (let feature of map.features){
                let num = feature.properties['CoC Number']
                if (num in num_counties){
                    num_counties[num] += 1;
                } else {
                    num_counties[num] = 1;
                }

            }
            
            //create tooltip
            var Tooltip = d3.select("#geoplot")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
        
            var mouseover = function(d) {
                let year = svg.selectAll('#value')._groups[0][0]['innerHTML'].slice(-4);
                Tooltip.style('opacity', .8);
                d3.select(this).transition().duration(500).style("stroke", cScale(rScale(overall_homeless.get(year).get(d.target.__data__.properties['CoC Number']))))
                .style("stroke-width", '3px');
            }
            var mousemove = function(d) {
                let year = svg.selectAll('#value')._groups[0][0]['innerHTML'].slice(-4);
                let props = d.target.__data__.properties
                Tooltip
                .html(props['CountyName'] + '<br>' + 'Homeless Count: ' + Math.floor(overall_homeless.get(year).get(props['CoC Number'])/num_counties[props['CoC Number']]))
                .style("left", (d3.pointer(d)[0]+0) + "px")
                .style("top", (d3.pointer(d)[1]+80) + "px");
            }
            var mouseleave = function(d) {
                Tooltip.style("opacity", 0);
                d3.select(this).transition().duration(100).style("stroke", "none")
            }

            //draw CA map
            svg.selectAll("path")
                .data(map.features)
                .enter()
                .append("path")
                .attr("d", pathgeo)
                .attr("fill", "#E0E0E0")
                .attr("stroke", "white")
                .attr("stroke-width", 1)

            var split_group = function(val) {
                if (val >= 9000) {
                    return 'C'
                } else if (val >= 1000) {
                    return 'B'
                } else {
                    return 'A'
                }
            }
            
            //draw bubbles
            var circle = svg.selectAll("circle")
                .data(map.features)
                .enter()
                .append("circle")
                .attr('class', function(d){
                    let val = overall_homeless.get(d3.min(years).toString()).get(d.properties['CoC Number']);
                    return split_group(val)
                })
                .attr('cx', d=>pathgeo.centroid(d)[0])
                .attr('cy', d=>pathgeo.centroid(d)[1])
                .attr('fill-opacity', 0.8)
                .attr('fill', d=>cScale(rScale(overall_homeless.get(d3.min(years).toString()).get(d.properties['CoC Number']))))
                .attr('r', d=>rScale(overall_homeless.get(d3.min(years).toString()).get(d.properties['CoC Number'])/num_counties[d.properties['CoC Number']]))
                .on('mouseover', mouseover)
                .on('mousemove', mousemove)
                .on('mouseleave', mouseleave)

            //build slider
            var slider = d3
                .sliderHorizontal()
                .min(d3.min(years))
                .max(d3.max(years))
                .tickFormat(d3.format('.4'))
                .step(1)
                .width(350)
                .displayValue(false)
                .on('onchange', (year) => {
                    d3.select('#value').text('Year: ' + year);
                    circle
                        .transition()
                        .duration(300)
                        .attr('class', function(d){
                            let val = overall_homeless.get(year.toString()).get(d.properties['CoC Number']);
                            return split_group(val)
                        })
                        .attr('fill-opacity', 0.8)
                        .attr('fill', d=>cScale(rScale(overall_homeless.get(year.toString()).get(d.properties['CoC Number']))))
                        .attr('r', d=>rScale(overall_homeless.get(year.toString()).get(d.properties['CoC Number'])/num_counties[d.properties['CoC Number']]))
                });
                
            //add slider   
            svg.append('g')
            .attr('transform', 'translate(400,500)')
            .call(slider);

            //add checkbox interactivity
            function update(){
                d3.selectAll(".checkbox").each(function(d){
                    box = d3.select(this);
                    group = box.property("value")

                    if (box.property("checked")) {
                        let year = svg.selectAll('#value')._groups[0][0]['innerHTML'].slice(-4);
                        svg.selectAll("."+group)
                            .transition()
                            .duration(1000)
                            .style("opacity", 0.8)
                            .attr("r", function(d){
                                return rScale(
                                    overall_homeless
                                    .get(year.toString())
                                    .get(d.properties['CoC Number'])/num_counties[d.properties['CoC Number']]
                                );
                            })
                    } else {
                        svg.selectAll('#value')._groups[0][0]['innerHTML'].slice(-4);
                        svg.selectAll("."+group).transition().duration(600).style("opacity", 0).attr("r", 0);
                    }
                })
            }
            d3.selectAll(".checkbox").on("change",update);
            update()
        });        
            
        //add section title and body
        var svg1 = svg.append('svg')
            .attr('class', 'paragraph1')
            .attr('width', 700)
            .attr('height', 400)
            
        svg1.append('text')
            .attr("class", "subtitle")
            .attr('transform', 'translate(100,100)')
            .append('tspan')
            .attr('x', 100)
            .attr('dy', '1em')
            .text('Number of Homeless Per County')
            .append('tspan')
            .attr('x', 100)
            .attr('dy', '1.1em')
            .text('From 2007-2022')
        
        var body = svg1.append('text')
            .attr('class', 'body')
            .attr('transform', 'translate(200,200)')
        body.append('tspan')
            .attr('x', 0)
            .attr('dy', '1em')
            .text('This project aims to visualize the issue of')
        body.append('tspan')
            .attr('x', 0)
            .attr('dy', '1em')
            .text('homelessness in California. The map visualization')
        body.append('tspan')
            .attr('x', 0)
            .attr('dy', '1em')
            .text('uses a lighter map with orange to brown circles to')
        body.append('tspan')
            .attr('x', 0)
            .attr('dy', '1em')
            .text('better visualize the number of homeless in a county.')
    });
}

var part2=function(filePath){
    d3.select("#section2")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 10)

    d3.csv(filePath).then(function(data){
        var height = 600;
        var width = 750;
        var padding = 100;

        var svg = d3.select("#barPlot")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", padding/2)
            .text("Homelessness By Age Group")
            .attr("font-size", "25px")

        var data = data.filter(d=>d.Year>=2014);
        var years = Array.from(d3.group(data, d=>d.Year).keys())
        var age_groups = ['Under 18', 'Age 18 to 24', 'Over 24']
        var age_data = {}
        for (let a of age_groups){
            for (let y of years) {
                if (y in age_data) {
                    age_data[y][a] = d3.rollup(data, v=>d3.sum(v, d=>d['Overall Homeless - ' + a]), d=>d.Year).get(y)
                } else {
                    age_data[y] = {}
                    age_data[y][a] = d3.rollup(data, v=>d3.sum(v, d=>d['Overall Homeless - ' + a]), d=>d.Year).get(y)
                }
            }
        }

        var total_data = {}
        for (let a of age_groups){
            total_data[a] = d3.rollup(data, v=>d3.sum(v, d=>d['Overall Homeless - ' + a]))
        }

        var x = d3.scaleBand()
            .range([padding, width-padding])
            .domain(years)
            .padding(0.2);
        var xAxis = svg.append("g")
            .attr("transform", "translate(0," + (height-padding+10) + ")")
            .call(d3.axisBottom(x).tickSize(0).tickFormat(d3.format('d')))
            .call(g => g.select(".domain").remove())
            .attr("color", "white");

        var xSub = d3.scaleBand()
            .domain(age_groups)
            .range([0, x.bandwidth()])
            .padding([0.05])

        var y = d3.scaleLinear()
            .domain([0, d3.max(Object.values(Object.values(age_data)[8]))])
            .range([height-padding, padding]);
        var yAxis = svg.append("g")
            .attr("transform", "translate("+padding+",0)")
            .call(d3.axisLeft(y))
            .attr("color", "white");
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", 40)
            .attr("x", -270)
            .text("Number of Homeless")

        var cScale = d3.scaleOrdinal()
            .domain(age_groups)
            .range(['#F28C28','#377eb8','#4daf4a']);
        
        svg.append("g")
            .selectAll("g")
            .data(Object.values(age_data))
            .enter()
            .append("g")
                .attr("transform", function(d, i) {
                    return "translate(" + x(years[i]) + ",0)"})
                .selectAll("rect")
                .data(function(d) {
                    return age_groups.map(function(key) {
                        return {key: key, value: d[key]};
                    });
                })
                .enter()
                .append("rect")
                    .attr("x", function(d){return xSub(d.key)})
                    .attr("y", function(d){return y(0)})
                    .attr("width", xSub.bandwidth())
                    .attr("height", function(d){return height-padding - y(0)})
                    .attr("fill", function(d){return cScale(d.key)});

        window.addEventListener('scroll', function(){
            var scrollpos = window.scrollY
            if(scrollpos > 600 && scrollpos < 1300){
                svg.selectAll("rect")
                    .transition()
                    .duration(600)
                    .attr("y", function(d) {return y(d.value)})
                    .attr("height", function(d) {return height-padding - y(d.value)})
                    .delay(function(d,i){return(i*40)});
            } else {
                svg.selectAll("rect")
                    .transition()
                    .duration(200)
                    .attr("y", function(d) {return y(0)})
                    .attr("height", function(d) {return height-padding - y(0)})
                    .delay(function(d,i){return(i*40)});
            }
        });

        svg.selectAll("legend")
            .data(age_groups)
            .enter()
            .append("circle")
                .attr("cx", function(d,i){return 200 + i*120})
                .attr("cy", height-padding+50) 
                .attr("r", 7)
                .style("fill", function(d){ return cScale(d)})

        svg.selectAll("legend_labels")
            .data(age_groups)
            .enter()
            .append("text")
                .attr("x", function(d,i){return 210 + i*120})
                .attr("y", height-padding+50) 
                .style("fill", "white")
                .text(function(d){ return d})
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")
    });
}

var part3=function(filePath){
    d3.csv(filePath).then(function(data){
        var height = 600;
        var width = 750;
        var padding = 100;

        var svg = d3.select("#scatterPlot")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", padding/2)
            .text("Veterans in the Homeless Population")
            .attr("font-size", "25px")

        var data = data.filter(d=>d.Year>=2011)

        // Add X axis
        var x = d3.scaleLinear()
            .domain([0, d3.max(data, d=>parseInt(d['Overall Homeless']))])
            .range([padding, width-padding]);
        svg.append("g")
            .attr("transform", "translate(0," + (height-padding) + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")))
            .attr("color", "white");
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", height - padding + 50)
            .text("Number of Homeless By Year By CoC");

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([0, d3.max(data, d=>parseInt(d['Overall Homeless Veterans']))])
            .range([height-padding, padding]);
        svg.append("g")
            .attr("transform", "translate("+padding+",0)")
            .call(d3.axisLeft(y))
            .attr("color", "white");;
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", 40)
            .attr("x", -280)
            .text("Number of Homeless Veterans By Year By CoC")

        //create tooltip
        var Tooltip = d3.select("#scatterPlot")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var mouseover = function(d) {
            Tooltip.style('opacity', .8);
            d3.select(this)
                .transition()
                .duration(100)
                .style("fill", "white")
                .style("stroke", "white")
                .style("stroke-width", "3px");
        }
        var mousemove = function(d) {
            let point_data = d.target.__data__
            Tooltip
            .html(point_data['CoC Name'] + "<br> (" + point_data['Overall Homeless'] + ', '+parseInt(point_data['Overall Homeless Veterans'])  + ") <br>" + point_data['Year'])
            .style("left", (d3.pointer(d)[0] + width + 30) + "px")
            .style("top", (d3.pointer(d)[1] + 680 + padding) + "px");
        }
        var mouseleave = function(d) {
            Tooltip.style("opacity", 0);
            d3.select(this)
                .transition()
                .duration(100)
                .style("fill", "#F28C28")
                .style("stroke", "none");
        }
        
        // Add dots
        svg.append('g')
            .selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
                .attr("class", "dot")
                .attr("cx", function (d) {return width})
                .attr("cy", function (d) {return y(d['Overall Homeless Veterans'])})
                .attr("opacity", 0)
                .attr("r", 3)
                .style("fill", "#F28C28")
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave);
                
        window.addEventListener('scroll', function(){
            var scrollpos = window.scrollY
            if(scrollpos > 600 && scrollpos < 1300){
                svg.selectAll(".dot")
                    .transition()
                    .duration(500)
                    .attr("cx", function (d) {return x(d['Overall Homeless'])})
                    .attr("cy", function (d) {return y(d['Overall Homeless Veterans'])})
                    .attr("opacity", 1)
                    .delay(function(d,i){return(i*3)});
            } else {
                svg.selectAll(".dot")
                    .transition()
                    .duration(50)
                    .attr("cx", function (d) {return width})
                    .attr("cy", function (d) {return y(d['Overall Homeless Veterans'])})
                    .attr("opacity", 0)
                    .delay(function(d,i){return(i*2)});
            }
        });
    });
}

var part4=function(filePath){
    var width = 1000;
    var height = 600;
    var padding = 100;

    var svg = d3.select("#streamGraph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
    svg.append("text")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", padding/2)
        .text("Number of Homeless By Racial Groups")
        .attr("font-size", "25px")

    d3.csv(filePath).then(function(data){
        var data = data.filter(d=>d.Year>=2015);
        var keys = [
            'Overall Homeless - American Indian, Alaska Native, or Indigenous',
            'Overall Homeless - Asian or Asian American',
            'Overall Homeless - Black, African American, or African',
            'Overall Homeless - Hispanic/Latino',
            'Overall Homeless - Multiple Races',
            'Overall Homeless - Native Hawaiian or Other Pacific Islander',
            'Overall Homeless - Non-Hispanic/Non-Latino',
            'Overall Homeless - White'
        ];
        var years = Array.from(d3.group(data, d=>d.Year).keys())
        var race_data = {}
        for (let k of keys){
            for (let y of years) {
                if (y in race_data) {
                    race_data[y][k] = d3.rollup(data, v=>d3.sum(v, d=>d[k]), d=>d.Year).get(y)
                } else {
                    race_data[y] = {}
                    race_data[y][k] = d3.rollup(data, v=>d3.sum(v, d=>d[k]), d=>d.Year).get(y)
                }
            }
        }

        var x = d3.scaleLinear()
            .domain([parseInt(d3.min(years)), parseInt(d3.max(years))])
            .range([padding, width-padding]);
        var xAxis = svg.append("g")
            .attr("transform", "translate(0," + (height-padding+20) + ")")
            .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('d')));
        xAxis.attr("color", "white");
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", height - padding + 70)
            .text("Year");

        var value_domain = d3.max(Object.values(race_data),function(d){
                let total = 0;
                for (let k of keys){
                    total+=parseInt(d[k])
                }
                return total
            });
        var y = d3.scaleLinear()
            .domain([0, value_domain])
            .range([height-padding, padding]);
        var yAxis = svg.append("g")
            .attr("transform", "translate("+(padding-20)+",0)")
            .call(d3.axisLeft(y));
        yAxis.attr("color", "white");
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", 20)
            .attr("x", -260)
            .text("Number of Homeless")

        var color = d3.scaleOrdinal()
            .domain(keys)
            .range(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#4F7942','#f781bf'])

        var stackedData = d3.stack()
            .keys(keys)
            (Object.values(race_data))

        svg
            .selectAll("mylayers")
            .data(stackedData)
            .enter()
            .append("path")
            .style("fill", function(d) {return color(d.key); })
            .style("opacity", 0.8)
            .attr("d", d3.area()
                .x(function(d, i) {return x(years[i]);})
                .y0(function(d) {
                    return y(d[0]);})
                .y1(function(d) {return y(d[1]);})
            )
    });
}

var part5=function(filePath){
    d3.csv(filePath).then(function(data){
        var data = data.filter(d=>d.Year>=2015);
        var keys = [
            'American Indian, Alaska Native, or Indigenous',
            'Asian or Asian American',
            'Black, African American, or African',
            'Hispanic/Latino',
            'Multiple Races',
            'Native Hawaiian or Other Pacific Islander',
            'Non-Hispanic/Non-Latino',
            'White'
        ];
        var years = Array.from(d3.group(data, d=>d.Year).keys());
        var race_data = {}
        for (let k of keys){
            for (let y of years) {
                if (y in race_data) {
                    race_data[y][k] = d3.rollup(data, v=>v.map(d=>parseInt(d['Overall Homeless - '+k])/parseInt(d['Overall Homeless'])), d=>d.Year).get(y)
                } else {
                    race_data[y] = {}
                    race_data[y][k] = d3.rollup(data, v=>v.map(d=>parseInt(d['Overall Homeless - '+k])/parseInt(d['Overall Homeless'])), d=>d.Year).get(y)
                }
            }
        };

        var get_stats = function(year) {
            stats = []
            let r_data = Object.values(race_data[year]).map(d=>d.sort(d3.ascending))
            let q1 = r_data.map(d=>d3.quantile(d, 0.25));
            let median = r_data.map(d=>d3.quantile(d, 0.5));
            let q3 = r_data.map(d=>d3.quantile(d, 0.75));
            let iqr = q3.map((v, i) => v - q1[i]); 
            let min = q1.map((v, i) => v - 1.5 * iqr[i]); 
            let max = q3.map((v, i) => v + 1.5 * iqr[i]);
            for (let i in r_data){
                stats.push({q1: q1[i], median: median[i], q3: q3[i], iqr: iqr[i], min: min[i], max: max[i]})
            }
            return stats
        };

        var width = 1200;
        var height = 700;
        var padding = 100;
        var bottom_padding = 200;

        var svg = d3.select("#boxPlot")
            .append("svg")
            .attr("width", width)
            .attr("height", height);
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", padding/2)
            .text("Racial Group Proportions of Homeless Population")
            .attr("font-size", "25px")

        var curr_year = d3.min(years);
        var stats = get_stats(curr_year);

        var x = d3.scaleBand()
            .range([padding, width-padding])
            .domain(keys)
            .paddingInner(1)
            .paddingOuter(.5)
        var xAxis = svg.append("g")
            .attr("transform", "translate(0," + (height-bottom_padding) + ")")
            .call(d3.axisBottom(x))
            .attr("color", "white")
            .selectAll("text")  
                .style("text-anchor", "start")
                .attr("transform", "rotate(20)");

        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("x", width/2)
            .attr("y", height-bottom_padding/2)
            .text("Racial Group");

        var y = d3.scaleLinear()
            .domain([-0.5, 1.5])
            .range([height-bottom_padding, padding])
        var yAxis = svg.append("g")
            .attr("transform", "translate("+padding+",0)")
            .call(d3.axisLeft(y))
            .attr("color", "white")
        svg.append("text")
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", 50)
            .attr("x", -280)
            .text("Proportion of Homeless Per County")

        svg
            .selectAll(".vertLines")
            .data(stats)
            .enter()
            .append("line")
            .attr('class', 'vertLines')
            .attr("x1", function(d,i){return x(keys[i])})
            .attr("x2", function(d, i){return(x(keys[i]))})
            .attr("y1", function(d){return(y(d.min))})
            .attr("y2", function(d){return(y(d.max))})
            .attr("stroke", "white")
            .style("width", 40)

        // rectangle for the main box
        var boxWidth = 100
        svg
            .selectAll(".boxes")
            .data(stats)
            .enter()
            .append("rect")
                .attr("class", "boxes")
                .attr("x", function(d,i){return(x(keys[i])-boxWidth/2)})
                .attr("y", function(d){return(y(d.q3))})
                .attr("height", function(d){return(y(d.q1)-y(d.q3))})
                .attr("width", boxWidth)
                .attr("stroke", "white")
                .style("fill", "#F28C28")

        // Show the median
        svg
            .selectAll(".medianLines")
            .data(stats)
            .enter()
            .append("line")
            .attr('class', 'medianLines')
            .attr("x1", function(d,i){return(x(keys[i])-boxWidth/2) })
            .attr("x2", function(d,i){return(x(keys[i])+boxWidth/2) })
            .attr("y1", function(d){return(y(d.median))})
            .attr("y2", function(d){return(y(d.median))})
            .attr("stroke", "white")
            .style("width", 80)
    

    var radio = d3.select('#boxPlot')
            .on("change", function(d) {
                var curr_year = d.target.value;
                var stats = get_stats(curr_year);
                svg.selectAll(".vertLines")
                    .data(stats) 
                    .attr("x1", function(d,i){return x(keys[i])})
                    .attr("x2", function(d, i){return(x(keys[i]))})
                    .attr("y1", function(d){return(y(d.min))})
                    .attr("y2", function(d){return(y(d.max))})
                    .attr("stroke", "white")
                    .style("width", 40)
                    
                var boxWidth = 100
                var boxes = svg
                    .selectAll(".boxes")
                    .data(stats)

                boxes
                    .attr("x", function(d,i){return(x(keys[i])-boxWidth/2)})
                    .attr("y", function(d){return(y(d.q3))})
                    .attr("height", function(d){return(y(d.q1)-y(d.q3))})
                    .attr("width", boxWidth)
                    .attr("stroke", "white")
                    .style("fill", "#F28C28")
        
                // Show the median
                var medianLines = svg.selectAll(".medianLines")
                    .data(stats)

                medianLines
                    .attr("x1", function(d,i){return(x(keys[i])-boxWidth/2) })
                    .attr("x2", function(d,i){return(x(keys[i])+boxWidth/2) })
                    .attr("y1", function(d){return(y(d.median))})
                    .attr("y2", function(d){return(y(d.median))})
                    .attr("stroke", "white")
                    .style("width", 80)
        })
    });    
}