# Match data sources

To match facility lists the steps are to first create a pair of data sources and then to do the reconciliation starting at the highest level and going down the hierarchy to the last level.

## Pair sources

* Go to the Data Source Pair tab and select both data sources. The data source you select under “Source 1”  is the target (the one you want to fix). The data source you select under “Source 2”  is the one that is the leader that you want to eventually merge your data with.
* Choose NGO as Source 1 and DHIS2 as Source 2.

![alt text](img/pair_data.png)

* Click SAVE and you will be taken to the reconciliation screen.

## Reconciliation

* There are only two regions (the top administrative level in the fakeland data). They are automatically matched.
The status wheels labeled “Matched” indicate that 2 of 2 regions have been matched. In the bottom portion of the screenshot below, you can also see that for Level 1 there is 100% match, as the two locations in Source 1 match the two locations in Source 2.
Select Proceed to Level 2.

![alt text](img/level_1.png)

At Level 2, the districts will automatically be matched.

![alt text](img/level_2.png)

* Click Proceed to Level 3.
* At Level 3, some facilities will not match.
* There is a list of unmatched facilities in the light green box for Source 1.

![alt text](img/level_3_before.png)

* Select one of the facilities, like General Referral Hospital.
* A pop-up dialog will let you choose which facility to match it to.

![alt text](img/level_3_match_hospital.png)

* Select the most appropriate match, in this case it is Referral Hospital, and click SAVE MATCH.
* Go through the unmatched facilities in Source 1, select and save the best matches. One you are done, you will see:

![alt text](img/level_3.png)

* The Source 1 Reconciliation Status, in the top left-hand status box, should be 100%.

## Export a reconciliation report

* On the top left of the reconciliation tab there is an option to output either a FHIR-based report of the final reconciled dataset or a CSV of what matched and did not match in either dataset. Choose CSV Export. You will receive three files of matches and unmatches.

## View reconciliation status

* Select Reconciliation Status and view the overall status.

![alt text](img/reconciliation_status.png)

