#!/bin/bash

curl 'https://localhost:34567/classes' \
  -H 'Accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODk4LCJ1c2VyX3R5cGUiOiJBZG1pbiIsInNjaG9vbF9pZCI6IlNDSC8yMCIsImJyYW5jaF9pZCI6bnVsbCwiZW1haWwiOiJhYWthYmlyODhAZ21haWwuY29tIiwibGFzdEFjdGl2aXR5IjoiMjAyNS0xMi0wM1QxMTozNToyNi41MjRaIiwiaWF0IjoxNzY0NzYxNzI2LCJzZXNzaW9uQ3JlYXRlZCI6IjIwMjUtMTItMDNUMTE6MzU6MjYuNTI0WiIsInJlbmV3YWxDb3VudCI6MCwiZXhwIjoxNzY0ODQ4MTI2fQ.PQHwgzj3CWeEtFBoBkE0i9vBjMEjdzPdcdhA-cea8Ok' \
  -H 'Content-Type: application/json' \
  -H 'X-Branch-Id: BRCH00027' \
  -H 'X-School-Id: SCH/20' \
  --data-raw '{
    "class_name": "Primary 5",
    "section": "Primary",
    "school_id": "SCH/20",
    "branch_id": "BRCH00027",
    "class_arms": [
      {"arm_name": "A", "status": "Active"},
      {"arm_name": "B", "status": "Active"}
    ]
  }'
