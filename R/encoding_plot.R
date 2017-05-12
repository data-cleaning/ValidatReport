library(tidyr)
library(ggplot2)

dat <- read.table("R/encoding_use.dat",header=TRUE,stringsAsFactors = FALSE)
dat <- gather(dat, Encoding, percent)
names(dat) <- c("encoding", "year","percent")
dat$year <- as.numeric(substr(dat$year,2,5))
dat$percent <- as.numeric(sub("%","",dat$percent))


enc <- unique(dat$encoding)

pdf("report/fig/encoding_use.pdf")
lwd=2
par(mar=par('mar')+c(0,0,-2,0))

d <- subset(dat, encoding == enc[1])
plot(percent ~ year, data=d,type='l',lwd=lwd,las=1,ylim=c(0,100)
     , xlab = "Year",ylab="Percentage"
     , cex,lab=1.2,cex.axis=1.2)

for ( i in 2:4 ){
  d <- dat[dat$encoding==enc[i],]
  lines(d$year, d$percent, lwd=lwd, lty=i)
}

legend("topleft",
  legend=enc, lwd=2, lty=1:4, bty='n'
)

dev.off()

