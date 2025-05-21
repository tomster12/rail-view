# Overview

NRE are the main source of data: https://www.nationalrail.co.uk/about-this-site/.  
They are part of, and operated by, the RDG: https://www.raildeliverygroup.com/.  

- TRUST is a low level (not consumer friendly) core system for train positions from NRE: https://en.wikipedia.org/wiki/TRUST.  
- Darwin is built ontop of TRUST as a consumer facing system from RDG: https://www.nationalrail.co.uk/developers/darwin-data-feeds/.  

Typically Darwin is the common way to access data: https://wiki.openraildata.com/index.php/TRUST_vs_Darwin.  

RDM is a consumer platform for available data endpoints (Darwin, TRUST, CIF scheduling, and lots more).  

- https://wiki.openraildata.com/index.php/Main_Page
- https://wiki.openraildata.com/index.php/Rail_Data_FAQ
- https://wiki.openraildata.com/index.php/About_the_Network_Rail_feeds

Useful links with some existing projects:

- https://github.com/openraildata
- https://datasciencecampus.ons.gov.uk/visualising-rail-schedules-using-open-data/
- https://wiki.openstreetmap.org/wiki/OpenRailwayMap
- https://heigit.org/an-ohsome-railway-network-visualization-and-analysis-2/
- https://en.wikipedia.org/wiki/Shapefile

# Data Products

## Live Departure Board (LDB)

One of the main data feeds of Darwin from RDG split into a Public Version (PV) and Staff Version (SV).  
Each API is split up into multiple data products on https://raildata.org.uk with seperate API endpoints and keys.  

- https://realtime.nationalrail.co.uk/LDBSVWS/docs/documentation.html
- https://realtime.nationalrail.co.uk/LDBWS/docs/documentation.html

It seems better to blanket  use the staff versions as then have canonical RIDs / UIDs etc and include most of the same information.  

### Reference Data (SV)  

- Station CRS  ->  Name
- Company TOC  ->  Name

📋 https://raildata.org.uk/dataProduct/P-c73f0d2a-c233-497d-846b-8354e2cac326/overview  

- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetLoadingCategoryData/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetTOCList/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetStationList/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetReasonCodeList
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetReasonCode/{reasonCode}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetSourceInstanceNames

### Query Services (SV)  

- Route UID + schedule SDD  ->  Relevant service instances (RID, UID, SDD, train ID, other)
- Instance RID              ->  Service (RID, operator, train ID, other) + List of Locations (TIPLOC, CRS, platforms, times)

📋 https://raildata.org.uk/dataProduct/P-9a4b5235-d06a-483d-b12f-7d0d95b06b18/overview  

- https://api1.raildata.org.uk/1010-query-services-and-service-details1_0/LDBSVWS/api/20220120/QueryServices/{serviceID}/{sdd}
- https://api1.raildata.org.uk/1010-query-services-and-service-details1_0/LDBSVWS/api/20220120/GetServiceDetailsByRID/{rid}

### Arr and Dep Boards (SV)  

- Station CRS + Time  ->  Relevant service instances (RID, UID, SDD, train ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-8ce95b80-43ba-4ef7-b59a-6eb5d2bab061/overview 

- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrDepBoardWithDetails/{crs}/{time}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrivalDepartureBoardByCRS/{crs}/{time}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrivalDepartureBoardByTIPLOC/{tiploc}/{time}

### Arr and Dep Boards (PV)  

- Station CRS  ->  Service info (service ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-2eec03eb-4d53-4955-8a96-0314964a4e9e/overview  

- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards-arr-and-dep1_1/LDBWS/api/20220120/GetArrDepBoardWithDetails/{crs}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards-arr-and-dep1_1/LDBWS/api/20220120/GetArrivalDepartureBoard/{crs}

### Service Details (PV)  

- Service ID  ->  Service info (service ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-4dec1247-d040-4290-80a4-639dfac54a92/overview  

- https://api1.raildata.org.uk/1010-service-details1_2/LDBWS/api/20220120/GetServiceDetails/{serviceid}

## Downloadable Files

### Knowledgeable Stations

Full information of each station.

- Station CRS  ->  Lots and lots of information

📋 https://raildata.org.uk/dashboard/dataProduct/P-88ffe920-471c-4fd9-8e0d-95d5b9b7a257/overview

### Darwin Timetable Files

Services / SSDs are retrievable from the timetable files.

📋 https://raildata.org.uk/dashboard/dataProduct/P-9ca6bc7e-62e1-44d6-b93a-1616f7d2caf8/overview  

### Station Reference Data

Big list of general data for each station.

📋 https://raildata.org.uk/dashboard/dataProduct/P-bc13af96-8ca5-484a-be47-2ee0a3251b01/overview 

### NWR Track Model

Up to date track model.  

📋 https://raildata.org.uk/dashboard/dataProduct/P-9b4e960e-8bb6-438b-9722-34ae5768a48f/overview

# Acronyms

NRE: National Rail Enquiries
RDG: Rail Delivery Group
RDM: Rail Data Marketplace
TOC: Train Operating Company
CRS: Computer Reservation Code - uniquely identify railway stations
UID: Unique ID - Recurring train service
RID: Retail ID - Instance of a train service e.g. specific journey, specific day
Service ID: Similar to RID
SDD: Schedule Data Directory - schedule information ID for a service
TIPLOC: Timing Point Location
CIS: Customer Interface System
TRUST: Train Running System TOPS
