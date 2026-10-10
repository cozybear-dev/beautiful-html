A prospective enterprise customer's security team has asked how customer data flows through our systems, as part of their vendor security review. I need a document I can send to their CISO's team that shows it clearly. I'm a solutions engineer; I am not the audience, they are, and they will read it closely.

The source material is in the `data` folder:

- `systems.csv`: every system that touches customer data, with its type, network zone, owner and what data it holds
- `flows.csv`: every connection between systems, with protocol, port, what data moves, encryption in transit, authentication and daily volume
- `controls.json`: encryption at rest, data residency, certifications, subprocessors, the last penetration test, and one known gap with its remediation plan

They need to be able to follow a customer's data from the browser to where it is stored and to any third party, see which zone each system sits in, and see how each hop is protected. Please be upfront about the known gap rather than hiding it.

Create it as a single HTML file I can share with them, saved as `report.html` in this folder.
