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
library(validationDashboard)

setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# for the moment read data file and report from file:
data <- read.csv(file="../data/Task2_Data.csv", header=TRUE, sep=",")
report <- fromJSON(file = "../data/Task2_Report.json")

# Define UI for application that draws a histogram
ui <- fluidPage(
   
   # Application title
   titlePanel("A validation dashboard in Shiny"),
   
   # Sidebar with a slider input for number of bins 
   sidebarLayout(
      sidebarPanel(
         sliderInput("bins",
                     "Number of bins:",
                     min = 1,
                     max = 50,
                     value = 30)
      ),
      
      # Show a plot of the generated distribution
      mainPanel(
        validationDashboard(data, report)
        #mywidget("TEST4")
        
      )
   )
)

# Define server logic required to draw a histogram
server <- function(input, output) {
   
}

# Run the application 
shinyApp(ui = ui, server = server)

