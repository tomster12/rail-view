# Project

Long and Lat calculated using this: 

- https://www.mapsofworld.com/lat_long/maps/uk-lat-long.jpg

# Information

## Overview

There are lots of available open data from all the train networks:  

- https://wiki.openraildata.com/index.php/Main_Page  
- https://wiki.openraildata.com/index.php/Rail_Data_FAQ  

There are many levels of fidelity you can get data:

- https://wiki.openraildata.com/index.php/TRUST_vs_Darwin.

TRUST is a low level system for train positioning and information from Network Rail feeds:

- https://wiki.openraildata.com/index.php/About_the_Network_Rail_feeds
- https://en.wikipedia.org/wiki/TRUST  

Darwin is built ontop of lower level services as a consumer facing system from National Rail Enquiries (NRE) and the Rail Delivery Group (RDG):  
 
- https://www.nationalrail.co.uk/about-this-site/  
- https://www.nationalrail.co.uk/developers/darwin-data-feeds/  
- https://www.raildeliverygroup.com/  
- https://wiki.openraildata.com/index.php/About_the_National_Rail_Feeds  

## Rail Delivery Group

RDG provide many data feeds and methods of accessing their data.  

- https://wiki.openraildata.com/index.php/About_the_National_Rail_Feeds
- https://www.nationalrail.co.uk/developers/darwin-data-feeds/

the Live Departure Boards Web Service (LDBWS) can be accessed through either:

- SOAP API with XML, registered and accessed through the NRE APIs at https://nationalrail.co.uk
- REST API with JSON, registered and access through Rail Delivery Market (RDM) at https://raildata.org.uk/

This is split into staff and public, where the staff version seems to give more full information.

- https://realtime.nationalrail.co.uk/LDBSVWS/docs/documentation.html
- https://realtime.nationalrail.co.uk/LDBWS/docs/documentation.html

The real time rail information can be accessed through either:

- Push port with ActiveMQ, STOMP, or XML
- Kafka stream with JSON, Avro, XML

The modern method seems to be REST and Kafka streams through RDM.

The KnowledgeBase is a static information source for XML data.

## Other Links

- https://github.com/openraildata
- https://datasciencecampus.ons.gov.uk/visualising-rail-schedules-using-open-data/
- https://wiki.openstreetmap.org/wiki/OpenRailwayMap
- https://heigit.org/an-ohsome-railway-network-visualization-and-analysis-2/
- https://en.wikipedia.org/wiki/Shapefile

## Acronyms

- NRE: National Rail Enquiries  
- RDG: Rail Delivery Group  
- RDM: Rail Data Marketplace  
- TOC: Train Operating Company  
- CRS: Computer Reservation Code - uniquely identify railway stations  
- UID: Unique ID - Recurring train service  
- RID: Retail ID - Instance of a train service e.g. specific journey, specific day  
- Service ID: Similar to RID  
- SDD: Schedule Data Directory - schedule information ID for a service  
- TIPLOC: Timing Point Location  
- CIS: Customer Interface System  
- TRUST: Train Running System TOPS  

# Open Data

## LDBWS SV: Reference Data

- List of Stations (CRS, Name)
- List of TOCs (TOC, Name)

📋 https://raildata.org.uk/dataProduct/P-c73f0d2a-c233-497d-846b-8354e2cac326/overview  

- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetLoadingCategoryData/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetTOCList/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetStationList/{currentVersion}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetReasonCodeList
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetReasonCode/{reasonCode}
- https://api1.raildata.org.uk/1010-reference-data1_0/LDBSVWS/api/ref/20211101/GetSourceInstanceNames

## LDBWS SV: Arrivals and Departures Boards

- Station CRS + Time  ->  Relevant service instances (RID, UID, SDD, train ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-8ce95b80-43ba-4ef7-b59a-6eb5d2bab061/overview 

- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrDepBoardWithDetails/{crs}/{time}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrivalDepartureBoardByCRS/{crs}/{time}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards---staff-version1_0/LDBSVWS/api/20220120/GetArrivalDepartureBoardByTIPLOC/{tiploc}/{time}

## LDBWS SV: Query Services  

- Route UID + schedule SDD  ->  Relevant service instances (RID, UID, SDD, train ID, other)
- Instance RID              ->  Service (RID, operator, train ID, other) + List of Locations (TIPLOC, CRS, platforms, times)

📋 https://raildata.org.uk/dataProduct/P-9a4b5235-d06a-483d-b12f-7d0d95b06b18/overview  

- https://api1.raildata.org.uk/1010-query-services-and-service-details1_0/LDBSVWS/api/20220120/QueryServices/{serviceID}/{sdd}
- https://api1.raildata.org.uk/1010-query-services-and-service-details1_0/LDBSVWS/api/20220120/GetServiceDetailsByRID/{rid}

## LDBWS PV: Arrivals and Departures Boards  

- Station CRS  ->  Service info (service ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-2eec03eb-4d53-4955-8a96-0314964a4e9e/overview  

- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards-arr-and-dep1_1/LDBWS/api/20220120/GetArrDepBoardWithDetails/{crs}
- https://api1.raildata.org.uk/1010-live-arrival-and-departure-boards-arr-and-dep1_1/LDBWS/api/20220120/GetArrivalDepartureBoard/{crs}

## LDBWS PV: Service Details

- Service ID  ->  Service info (service ID, other)

📋 https://raildata.org.uk/dashboard/dataProduct/P-4dec1247-d040-4290-80a4-639dfac54a92/overview  

- https://api1.raildata.org.uk/1010-service-details1_2/LDBWS/api/20220120/GetServiceDetails/{serviceid}

## KnowledgeBase: Stations Data

- Station CRS  ->  Lots and lots of information

📋 https://raildata.org.uk/dashboard/dataProduct/P-88ffe920-471c-4fd9-8e0d-95d5b9b7a257/overview

## Other: Darwin Timetable Files

Services / SSDs are retrievable from the timetable files.

📋 https://raildata.org.uk/dashboard/dataProduct/P-9ca6bc7e-62e1-44d6-b93a-1616f7d2caf8/overview  

## Other: Station Reference Data

Big list of general data for each station.

📋 https://raildata.org.uk/dashboard/dataProduct/P-bc13af96-8ca5-484a-be47-2ee0a3251b01/overview 

## Other: NWR Track Model

Up to date track model.  

📋 https://raildata.org.uk/dashboard/dataProduct/P-9b4e960e-8bb6-438b-9722-34ae5768a48f/overview

