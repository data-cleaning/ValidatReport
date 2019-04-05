# Copy javascript files:
list.of.files <- list.files("C:/Users/Gebruiker/MEGA/ValidatReport/dashboard/js/", "*.js", full.names=TRUE)
file.copy(from=list.of.files, to="inst/htmlwidgets/lib/validationDashboard-0.0.5/plugins", overwrite = TRUE)

# Copy css files:
list.of.files <- list.files("C:/Users/Gebruiker/MEGA/ValidatReport/dashboard/css/", "*.css", full.names=TRUE)
file.copy(from=list.of.files, to="inst/htmlwidgets/lib/css", overwrite = TRUE)


#Uninstall package, to be sure in case signature was changed:
devtools::uninstall(pkg = ".")

#Install package:
devtools::install()

