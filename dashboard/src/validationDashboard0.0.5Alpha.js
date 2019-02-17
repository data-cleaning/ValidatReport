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
let colorScaleValues = d3.scaleOrdinal().domain(["0", "1", "NA"]).range(["#FC8D59", "#91CF60", "#FFFFBF"]) // 0 = fail, 1 = pass, NA = NA
let colorScaleOpacityPasses = d3.scaleOrdinal().domain([1, 10]).range([0.4, 1]) // domain is set dynamically
let colorScaleOpacityFails = d3.scaleOrdinal().domain([1, 10]).range([0.4, 1]) // domain is set dynamically
let colorScaleOpacityNAs = d3.scaleOrdinal().domain([1, 10]).range([0.4, 1]) // domain is set dynamically
let myndx, valueDim, severityDim, agentDim, valueCount, severityCount, actorDim, actorCount, all
let ndx
let datatable
let datatableShowAllRows = true
let datatableColoredCells = new Map() // For administering metadata for each colored cell

class validationDashboard {

	constructor(options) {
		
		this.options = mergeOptions(_defaultOptions, options)
		if ("container" in this.options == false) {console.log('container not set'); return; }
		if ("data" in this.options == false) {console.log('data not set'); return; }
		if ("report" in this.options == false) {console.log('report not set'); return; }
		if ("idcol" in this.options == false) {console.log('idcol not set'); return; }
		if (d3.select(this.options.container).empty()) {console.log('container not found'); return; }
		
		// dc needs this:
		dc.config.defaultColors(d3.schemeAccent)
		
		// Create divs and headers:
		var row = d3.select(this.options.container).append("div").classed("row", true)
		var left = row.append("div").classed("col-4", true)
		var right = row.append("div").classed("col-8", true)
		let count = left.append("div").classed("row", true).append("div").classed("col", true).attr("id", "divEventCount")
			.append("span").classed("filter-count", true)
			.text("selected out of <span class='total-count'></span> records.")
		function addDiv(container, id, label) {
			var el = container.append("div").attr("id", id).append("div")
			el.append("strong").classed("selectorHeader", true).text(label)
			el.append("a").classed("reset", true).style("visibility", "hidden").style("margin-left", "5px").attr("href", "#").text("reset")
			return(el)
		}
		addDiv(left, "divChartValue", "Results")
		addDiv(left, "divChartSeverity", "Severity")
		addDiv(left, "divChartRule", "Rules")
		
		// Data table:
		let columns = []
		function escapeDots(s) {return(s.replace(/\./g, "\\."))}
		for (col of Object.keys(this.options.data[0])) {
			columns.push({data: escapeDots(col), name: col, title: col})
		}
		right.append("table").attr("id", "tableData").classed("compact", true).classed("cell-border", true)
		datatable = $('#tableData').DataTable({
			data: this.options.data,
		    columns: columns,
			searching: false,
			scrollY: "600px",
			scrollCollapse: true,
			paging: false,
			rowId: this.options.idcol,
			info: false,
			select: {
				style: 'single',
				items: 'cell',
				info: false
			},
			dom: 'Bfrtip',
			stateSave: true,
			buttons: [
				{
					extend: 'collection',
					autoClose: true,
					text: 'Row visibility',
					buttons: [{
							text: 'All rows',
							action: ( e, dt, node, config ) => {
								datatableShowAllRows = true
								this._updateTable()
							}
						}, {
							text: 'Colored rows',
							action: ( e, dt, node, config ) => {
							//action: function ( e, dt, node, config ) {
								datatableShowAllRows = false
								this._updateTable()
							}
						}
					]
				},
				'colvis'
			]
		})
		datatable.on( 'mouseenter', 'tbody td', function () {
			if ($(this).hasClass('selected') == false) {
				$(this).css("padding", 3)
				$(this).css("border", "1px solid #888")
			}
		})
		datatable.on( 'mouseleave', 'tbody td', function () {
			if ($(this).hasClass('selected') == false) {
				cellNormalState($(this))
			}
		})
		datatable.on( 'select', function ( e, dt, type, indexes ) {
			var cell = datatable.cell( indexes )
			$( cell.node() ).css("padding", 1)
			$( cell.node() ).css("border", "3px dashed black")
			
			// Filter ndx on id dimension to all events where this cell is in the target:
			let ids = []
			if (cell.node().cellId) {
				let events = datatableColoredCells.get(cell.node().cellId).events
				for (const e of events) {
					ids.push(e.id)
					// TODO: do something for other values
					//if (e.value == "0") ids.push(e.id)
				}
			}
			idDim.filterFunction( function(id) {
				return (ids.indexOf(id) != -1)
			})
		})
		datatable.on( 'deselect', function ( e, dt, type, indexes ) {
			var cell = datatable.cell( indexes )
			cellNormalState($( cell.node() ))
			
			idDim.filterFunction( function(id) {
				return (true)
			})
		})
		function cellNormalState(cell) {
			cell.css("padding", 4)
			cell.css("border-top", "1px solid #ddd")
			cell.css("border-right", "1px solid #ddd")
			cell.css("border-bottom", "")
			cell.css("border-left", "")
		}
		
		// Create dc charts:
		this.eventCount = dc.dataCount('#divEventCount')
		this.chartValue = dc.rowChart("#divChartValue")
		this.chartSeverity = dc.rowChart("#divChartSeverity")
		this.chartRule = dc.rowChart('#divChartRule')

		// Add callbacks for reset buttons:
		d3.select("#divChartValue a").on("click", () => this.chartValue.filter(null).redrawGroup() )
		d3.select("#divChartSeverity a").on("click", () => this.chartSeverity.filter(null).redrawGroup() )
		d3.select("#divChartRule a").on("click", () => this.chartRule.filter(null).redrawGroup() )

		// set crossfilter dimensions and counts:
		ndx = crossfilter(this.options.report)
		
		idDim = ndx.dimension(d => d.id)
		valueDim = ndx.dimension(d => d.value)
		severityDim = ndx.dimension(d => d.rule.severity)
		agentDim = ndx.dimension(d => d.event.agent)
		actorDim = ndx.dimension(d => d.event.actor)
		ruleDim = ndx.dimension(d => "id" in d.rule ? d.rule.id : this._expressionShort(d.rule.source))
		
		valueCount = valueDim.group().reduceCount()
		severityCount = severityDim.group().reduceCount()
		agentCount = agentDim.group().reduceCount()
		actorCount = actorDim.group().reduceCount()
		ruleCount = ruleDim.group().reduceCount()
		all = ndx.groupAll()
		
		// Events count:
		window.resetAll = function() {
			dc.filterAll()
			dc.renderAll()
			datatable.cells( { selected: true } ).deselect()
		}
		this.eventCount
		.dimension(ndx)
		.group(all)
		.html({
			some: '<strong>%filter-count</strong> out of <strong>%total-count</strong> selected' +
			' | <a href=\'javascript:resetAll();\'>Reset All</a>',
			all: '<strong>%filter-count</strong> out of <strong>%total-count</strong> selected'
		})

		// Events by Value:
		this.chartValue
		.width(200).height(120)
		.dimension(valueDim)
		.group(valueCount)
		.controlsUseVisibility(true)
		.elasticX(true)
		//.innerRadius(0)
		.label(d => d.key == 0 ? "fails" : (d.key == 1 ? "passes" : "NA"))
		.title(d => d.key == 0 ? "fails: "+d.value : (d.key == 1 ? "passes: "+d.value : "NA: "+d.value))
		.colors(d => colorScaleValues(d))
		//.externalLabels(10)
		//.externalRadiusPadding(10)
		//.drawPaths(true)
		//.replaceFilter([["0"]])		// Init selection to fails:
		.margins({top: 0, right: 10, bottom: 30, left: 5})


		// Events by severity:
		this.chartSeverity
		.width(200).height(120)
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
		.legend(dc.legend())
		.margins({top: 0, right: 10, bottom: 30, left: 5})
		
		// Events by rule:
		this.chartRule
		.width(400).height(450)
		.dimension(ruleDim)
		.group(ruleCount)
		.controlsUseVisibility(true)
		.ordinalColors(['#3182bd'])
		.elasticX(true)
		.ordering(d => d.key ) // sort on rule alphabetically instead of value
		//.y(d3.scaleBand())
		.margins({top: 0, right: 50, bottom: 30, left: 5})
		
		dc.renderAll();
		
		ndx.onChange(eventType => {
			if (eventType == "filtered") {
				this._updateTable()
				// TODO: update charts and count
				dc.redrawAll();
			}
		})
		this._updateTable()
		
		return(this)
	}

	_expressionShort(expression) {
		return (expression.substr(0, 160))
	}
	
	_updateTable() {
		let coloredRows = this._setBackgroundColors()
		this._updateRowVisibility(coloredRows)
	}
	
	_setBackgroundColors() {
		
		let coloredRows = new Set()
		
		// Clean all cells:
		$( datatable.cells().nodes() ).css("background-color", '')
		datatableColoredCells.clear()
		
		// Calculate cell statistics and calculate maximum error cnt:
		let maxCnts = new Map([["0", 0],["1", 0],["NA", 0]])
		for (const e of ndx.allFiltered()) {
			for (const t of e.data.target) {
				let cellId = t[2]+t[3]
				let item = datatableColoredCells.get(cellId)
				if (!item) {
					datatableColoredCells.set(cellId, {row: t[2], col: t[3], cnts: new Map([["0", 0],["1", 0],["NA", 0]]), events: []})
					item = datatableColoredCells.get(cellId)
				}
				item.cnts.set(e.value, item.cnts.get(e.value)+1)
				item.events.push(e)
				
				// Administer maxCnts:
				if (item.cnts.get(e.value) > maxCnts.get(e.value)) maxCnts.set(e.value, item.cnts.get(e.value))
			}
		}
		
		
		// Set domain of colorScaleOpacityCells:
		colorScaleOpacityPasses.domain([1, maxCnts.get("1")])
		colorScaleOpacityFails.domain([1, maxCnts.get("0")])
		colorScaleOpacityNAs.domain([1, maxCnts.get("NA")])
		
		for (var [cellId, item] of datatableColoredCells) {
			let rowSelector = "#"+item.row
			let colSelector = item.col+':name'
			let cell = datatable.cell(rowSelector, colSelector)
			if (cell.node()) cell.node().cellId = cellId		// Register cellId for use in mouseover
			
			// register colored rows:
			coloredRows.add(rowSelector)
			
			// Determine background color:
			let failDetected = false
			let NADetected = false
			for (e of item.events) {
				if (e.value == "0") { failDetected = true; break }
				if (e.value == "NA") { NADetected = true }
			}
			let value = failDetected ? "0" : ( NADetected ? "NA" : "1" )
			
			// Set background-color:
			let bgcolor = d3.color(colorScaleValues(value))
			if (value == "0") {
				// Calculate opacity based on maxCnt:
				bgcolor.opacity = colorScaleOpacityFails(item.cnts.get(value))
			}
			$( cell.node() ).css("background-color", bgcolor.toString())
		}
		
		return(coloredRows)
	}
	
	_updateRowVisibility(coloredRows) {
		if (datatableShowAllRows) {
			$( datatable.rows().nodes() ).css("display", "table-row")
		}
		else {
			$( datatable.rows().nodes() ).css("display", "none")
			for (const rowSelector of coloredRows) $( datatable.row(rowSelector).node() ).css("display", "table-row")
		}
	}
	
}

// Assign to window for simplicity:
window.validationDashboard = validationDashboard