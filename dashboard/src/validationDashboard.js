/*
 * Validation Dashboard
 * Visualizes json validation reports
 * For definition of the format and use of this dashboard see 
 *  https://data-cleaning.github.io/ValidatReport/
 * 
 * Feel free to use under the EUPL
 * Questions, remarks: o.tenbosch[at]cbs.nl
 */
const mergeOptions = require('merge-options')

let _defaultOptions = {}
let colorScaleValues = d3.scaleOrdinal().domain(["0", "1", "NA"]).range(["#FC8D59", "#91CF60", "#FFFFBF"])
let myndx, valueDim, severityDim, agentDim, valueCount, severityCount, actorDim, actorCount, all
let ndx

class validationDashboard {

	constructor(options) {
		this.options = mergeOptions(_defaultOptions, options)
		if ("container" in this.options == false) {console.log('container not set'); return; }
		if ("data" in this.options == false) {console.log('data not set'); return; }
		if (d3.select(this.options.container).empty()) {console.log('container not found'); return; }
		
		// dc needs this:
		dc.config.defaultColors(d3.schemeAccent)
		
		// Create divs for charts:
		function addDiv(container, id, label) {
			var el = d3.select(container).append("div").attr("id", id).append("div")
			el.append("strong").text(label)
			el.append("a").classed("reset", true).style("visibility", "hidden").style("margin-left", "5px").attr("href", "#").text("reset")
			return(el)
		}
		addDiv(this.options.container, "divChartValue", "Events by value")
		addDiv(this.options.container, "divChartSeverity", "Events by severity")
		addDiv(this.options.container, "divChartActor", "Events by actor")
		addDiv(this.options.container, "divChartAgent", "Events by agent")
		addDiv(this.options.container, "divChartRule", "Events by rule")
		
		// Create divs for count and table:
		d3.select(this.options.container).append("div").attr("id", "divEventCount")
			.append("span").classed("filter-count", true)
			.text("selected out of <span class='total-count'></span> records.")
		d3.select(this.options.container).append("div").attr("id", "divTableEvents")

		// Create dc charts:
		this.chartValue = dc.pieChart("#divChartValue")
		this.chartSeverity = dc.rowChart("#divChartSeverity")
		this.chartActor = dc.rowChart("#divChartActor")
		this.chartAgent = dc.rowChart("#divChartAgent")
		this.chartRule = dc.barChart('#divChartRule')
		this.eventCount = dc.dataCount('#divEventCount')
		this.tableEvents = dc.dataTable('#divTableEvents')

		// Add callbacks for reset buttons:
		d3.select("#divChartValue a").on("click", () => this.chartValue.filter(null).redrawGroup() )
		d3.select("#divChartSeverity a").on("click", () => this.chartSeverity.filter(null).redrawGroup() )
		d3.select("#divChartActor a").on("click", () => this.chartActor.filter(null).redrawGroup() )
		d3.select("#divChartAgent a").on("click", () => this.chartAgent.filter(null).redrawGroup() )
		d3.select("#divChartRule a").on("click", () => this.chartRule.filter(null).redrawGroup() )

		// set crossfilter dimensions and counts:
		ndx = crossfilter(this.options.data)
		
		idDim = ndx.dimension(d => d.id)
		valueDim = ndx.dimension(d => d.value)
		severityDim = ndx.dimension(d => d.rule.severity)
		agentDim = ndx.dimension(d => d.event.agent)
		actorDim = ndx.dimension(d => d.event.actor)
		ruleDim = ndx.dimension(d => "id" in d.rule ? d.rule.id : this._expressionShort(d.rule.expression))
		
		valueCount = valueDim.group().reduceCount()
		severityCount = severityDim.group().reduceCount()
		agentCount = agentDim.group().reduceCount()
		actorCount = actorDim.group().reduceCount()
		ruleCount = ruleDim.group().reduceCount()
		all = ndx.groupAll()

		// Events by Value:
		this.chartValue
		.width(200).height(170)
		.dimension(valueDim)
		.group(valueCount)
		.controlsUseVisibility(true)
		.innerRadius(0)
		.label(d => d.key == 0 ? "fails" : (d.key == 1 ? "passes" : d.key))
		.colors(d => colorScaleValues(d))

		// Events by severity:
		this.chartSeverity
		.width(200).height(200)
		.dimension(severityDim)
		.group(severityCount)
		.controlsUseVisibility(true)
		.elasticX(true)
		.ordinalColors(['#3182bd'])
		.label(d => {
			if (this.chartSeverity.hasFilter() && !this.chartSeverity.hasFilter(d.key)) {
				return d.key + ' (0%)';
			}
			var label = d.key;
			if (all.value()) {
				label += ' (' + Math.floor(d.value / all.value() * 100) + '%)';
			}
			return label;
		})
		.legend(dc.legend());

		// Events by actor:
		this.chartActor
		.width(250).height(200)
		.dimension(actorDim)
		.group(actorCount)
		.controlsUseVisibility(true)
		.elasticX(true)
		.ordinalColors(['#3182bd'])
		.renderTitleLabel(false);

		// Events by agent:
		this.chartAgent
		.width(250).height(200)
		.dimension(agentDim)
		.group(agentCount)
		.controlsUseVisibility(true)
		.ordinalColors(['#3182bd'])
		.elasticX(true);
		
		// Events by rule:
		this.chartRule
		.width(800)
		.height(300)
		.x(d3.scaleBand())
		.xUnits(dc.units.ordinal)
		.brushOn(true)
		.xAxisLabel('Rules')
		.yAxisLabel('Count')
		.dimension(ruleDim)
		.barPadding(0.1)
		.outerPadding(0.05)
		.group(ruleCount)
		.title( d => d.key + "\n" + d.value)
		.controlsUseVisibility(true)
		.elasticY(true)
		.ordinalColors(['#3182bd'])
		.xAxis().tickFormat("");

		// Events count:
		this.eventCount
		.dimension(ndx)
		.group(all)
		.html({
			some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> events' +
			' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'>Reset All</a>',
			all: 'All events selected. Click on the graphs to apply filters.'
		});

		// Events grid:
		this.tableEvents
		.dimension(idDim)
		.group(d => d.id)
		.showGroups(false)
		.columns([
				'id', 'value', {
					label: 'time',
					format: d => d.event.time
				}, {
					label: 'severity',
					format: d => d.rule.severity == "error" ? "E" : (d.rule.severity == "information" ? "I" : "W")
				}, {
					label: 'language',
					format: d => d.rule.language
				}, {
					label: 'change',
					format: d => d.rule.change
				}, {
					label: 'actor',
					format: d => d.event.actor
				}, {
					label: 'agent',
					format: d => d.event.agent
				}, {
					label: 'trigger',
					format: d => d.event.trigger
				}
			])
		.on("renderlet", function (chart) {
			chart.selectAll('tr.dc-table-row').style('background-color', function (d) {
				return colorScaleValues(d.value)
			})
		})

		dc.renderAll();
		
		return(this)
	}
	
	/*_buildRuleMap(data) {
		for (var i=0; i<data.length; i++) {
			var rule = data[i].rule;
			var exprShort = this._expressionShort(rule.expression)
			if (exprShort in ruleMap) continue;
			ruleMap[exprShort] = rule.description;
		}
		return(ruleMap)
	}*/

	_expressionShort(expression) {
		return (expression.substr(0, 160))
	}
	
}

// Assign to window for simplicity:
window.validationDashboard = validationDashboard