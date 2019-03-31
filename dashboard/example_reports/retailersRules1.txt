
# Positivity rules
staff >= 0
turnover >= 0
other.rev >= 0
total.rev >= 0
staff.costs >= 0
total.costs >= 0

# Overall balance rule
turnover + other.rev == total.rev

# Plausibility of total costs
total.costs > staff.costs

# People don't work for free :-)
if (staff > 0) staff.costs > 0

# Plausibility of the mean profit in the economic sector
mean(profit, na.rm=TRUE) > 0

