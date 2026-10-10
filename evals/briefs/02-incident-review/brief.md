Please write the post-incident review for the checkout outage on 17 September 2026. It goes to our engineering leadership and to the customer success team, who need to explain to merchants what happened. I'll also present it on screen at the incident review meeting.

Everything I have is in the `data` folder:

- `timeline.csv`: what happened when, and in which system
- `metrics_by_minute.csv`: checkout error rate, checkout latency and fraud scoring latency for 13:30 to 15:30 UTC
- `systems.json`: the systems on the checkout request path and how they call each other, with what failed, the impact numbers and the agreed follow-up actions

The reader should come away understanding how one configuration change in the cache took down checkout several systems away, how long it took us to find it and why, and what we are changing so it cannot happen again.

Save it as a single self-contained HTML file called `report.html` in this folder, so I can share it by email.
