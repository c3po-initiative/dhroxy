## Execution Plan

1) Exercise remaining clinical endpoints (focus: medicin order/prescription details, vaccination histories, labs; then ejournal/appointments; navigation last).  
2) For each successful call, add the live JSON as `application/json` examples in `openapi-spec-consolidated-trimmed.json`, keeping only required headers/params in the doc.  
3) Note failing endpoints (404/405/500) and only add examples when a working variant is confirmed.  
4) Re-validate the spec after each batch of updates to keep it compliant.  
5) Refresh request example snippets where needed to reflect the working header/query sets used.
