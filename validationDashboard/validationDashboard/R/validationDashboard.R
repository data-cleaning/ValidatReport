#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets
#'
#' @export
validationDashboard <- function(data, report, width = NULL, height = NULL, elementId = NULL) {

  # forward options using x
  x = list(
    data = data,
    report = report
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'validationDashboard',
    x,
    width = width,
    height = height,
    package = 'validationDashboard',
    elementId = elementId
  )
}

#' Shiny bindings for validationDashboard
#'
#' Output and render functions for using validationDashboard within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a validationDashboard
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name validationDashboard-shiny
#'
#' @export
validationDashboardOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'validationDashboard', width, height, package = 'validationDashboard')
}

#' @rdname validationDashboard-shiny
#' @export
renderValidationDashboard <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, validationDashboardOutput, env, quoted = TRUE)
}
