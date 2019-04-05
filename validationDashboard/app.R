#
# This is a Shiny web application. You can run the application by clicking
# the 'Run App' button above.
#
# Find out more about building applications with Shiny here:
#
#    http://shiny.rstudio.com/
#
library(rjson)
library(shiny)
library(data.table)
library(validationDashboard)
library(validate)
library(validatereport)

#setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# for testing fixed values for dashboard:
data1 <- read.csv(file="example_reports/Task2_Data.csv", header=TRUE, sep=",")
report1 <- fromJSON(file = "example_reports/Task2_Report.json")

ui <- shinyUI(
  navbarPage(
  title = "ValidatFOSS",
  
  tabPanel("Data",
           sidebarLayout(
             sidebarPanel(
               shiny::fileInput("datafile", "CSV file"),
               shiny::selectInput("key", "Select key variable",
                                  "no key")
             ),
             mainPanel(dataTableOutput("datatable"))
           )),
  tabPanel("Rules",
           sidebarLayout(
             sidebarPanel(fileInput("rulefile", "Free text/YAML")),
             mainPanel(tabsetPanel(
               tabPanel(
                 "View Rules",
                 shiny::dataTableOutput("rules"),
                 # Download Rules Button
                 downloadButton("my_rules", "Download Rules")
               ),
               tabPanel(
                 "Coverage",
                 shiny::plotOutput("ruleplot"),
                 shiny::htmlOutput("variablesCovered"),
                 shiny::htmlOutput("variablesNotCovered")
               ),
               tabPanel(
                 "Imposed limits",
                 tags$h3("Boundaries"),
                 tags$em("Limits imposed by the rule set"),
                 shiny::dataTableOutput("num_bdr"),
                 shiny::dataTableOutput("cat_bdr"),
                 tags$h3("Fixed values"),
                 tags$em("Variables which can only take one value under the current rule set"),
                 shiny::dataTableOutput("fixed_variables")
               )
             ))
           )),
  tabPanel(
    "Validation",
    sidebarLayout(
      sidebarPanel(
        shiny::numericInput(
          "lin.eq.eps"
          ,
          label = "Tolerance for equality"
          ,
          value = 0,
          min = 0,
          max = Inf
        ),
        submitButton("Go!")
      ),
      mainPanel(
        tabsetPanel(
          tabPanel("summary",shiny::dataTableOutput("resultset"))
          , tabPanel("plot",shiny::plotOutput("confrontationplot"),
                     # Download Report Button
                     downloadButton("report", "Download Report"))
          , tabPanel("details", shiny::dataTableOutput("detailset"), 
                     # Download details Button
                     downloadButton("detailed_results", "Download Detailed Results"))
        )
      )
    )
  ),
  tabPanel(
    "Dashboard", validationDashboardOutput('dashboard')
  )
))




# Define server logic required to draw a histogram
server <- function(input, output, session) {

  ## reading data file ----
  DataFile <- reactive({
    validate(need(input$datafile, message = FALSE))
    input$datafile
  })
  
  DataSet <- reactive({
    fread(input=DataFile()$datapath)
  })
  
  output$datatable <- renderDataTable({
    DataSet()
  })
  
  observe({
    data <- DataSet()
    updateSelectInput(session, inputId = "key", choices = c("no key", names(DataSet())))
  })
  
  ## Reading rule file ----
  RuleFile <- reactive({
    # If no file is selected, don't do anything
    validate(need(input$rulefile, message = FALSE))
    input$rulefile
  })
  
  # The user's data, parsed into a data frame
  RuleSet <- reactive({
    validate::validator(.file=RuleFile()$datapath)
  })
  
  output$rules <- renderDataTable({
    as.data.frame(RuleSet())[c("name","label","rule")]
  })
  
  # Download rules as yaml file
  output$my_rules <- downloadHandler(
    filename = "my_rules.yaml",
    content = function(file) {
      validate::export_yaml(RuleSet(), file)
    }
  )
  
  ## Variable coverage ----
  output$ruleplot <- renderPlot({
    plot(RuleSet())
  })
  
  output$variablesCovered <- renderText({
    vrs <- paste(variables(RuleSet()),collapse=", ")
    HTML("<b>Variables covered: </b>", vrs)  
  })
  
  output$variablesNotCovered <- renderText({
    validate(need(DataSet(),"No data loaded"))
    vrs <- names(DataSet())
    vrs <- vrs[!vrs %in% variables(RuleSet())]
    HTML("<b>Variables not covered: </b> ",paste(vrs, collapse=", "))
  })
  
  ## Rule inspection ----
  observe({
    rls <- RuleSet()
    fixed <- validatetools::detect_fixed_variables(rls)
    fixed <- if (is.null(fixed)){
      data.frame(variable=character(0), value=numeric(0))
    } else {
      data.frame(variable=names(fixed), value=sapply(fixed, identity))
    }
    
    num_bdr <- validatetools::detect_boundary_num(rls)
    cat_bdr <- validatetools::detect_boundary_cat(rls)
    
    
    
    output$cat_bdr <- renderDataTable(cat_bdr)
    output$num_bdr <- renderDataTable(num_bdr)
    output$fixed_variables <- renderDataTable(fixed)
  })
  
  ## Confrontation ----
  observe({
    rls <- RuleSet()
    updateNumericInput(session
                       , inputId = "lin.eq.eps"
                       , value = voptions(RuleSet(), "lin.eq.eps"))
  })
  
  ResultSet <- reactive({
    confront(DataSet()
             , RuleSet()
             , key = ifelse(input$key == "no key", NA_character_, input$key)
             , lin.eq.eps=input$lin.eq.eps)
  })
  
  output$resultset <- renderDataTable(summary(ResultSet()))
  output$confrontationplot <- renderPlot(plot(ResultSet(),main="Results by rule"))
  
  output$detailset <- renderDataTable(as.data.frame(ResultSet()))
  
  # Download report
  output$report <- downloadHandler(
    filename = "report.json",
    content = function(file) {
      validatereport::export_ess_validation_report(ResultSet(), RuleSet(), file)
    }
  )
  
  ## Dashboard ----
  #Report2 <- reactive({
    #ess_validation_report(ResultSet(), RuleSet())
  #})

  output$dashboard <- renderValidationDashboard(
    #validationDashboard(data1, report1)
    #validationDashboard(DataSet(), report1)
    validationDashboard(DataSet(), fromJSON(ess_validation_report(ResultSet(), RuleSet())), idcol=input$key )
  )
  
}

# Run the application 
shinyApp(ui = ui, server = server)
