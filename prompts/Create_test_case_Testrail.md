Create test case in TestRail 3280 - Assign partner on client merge section:

Type: Functional
Priority: High
Generate acceptance criteria for each step.
Create all of the following test cases without asking for approval for each one of them.

Verify if the client merge functionality works correctly after the changes - test branch
1.Switch to local DB
2.Find two clients - client #1 created before client #2. 
3.Client #2 should have transfers created before the creation date of client #1
4.Login as admin
5.Go to admin panel/client merge
6.Merge client 1 with client 2
The clients are supposed to be merged successfully without any errors.

Merge 2 clients - same partner
1.Switch to local DB
2.Find two clients - client #1 created before client #2. 
3.Client #2 should have transfers created before the creation date of client #1 - clients assigned to different parnters
4.Login as admin
5.Go to admin panel/client merge
6.Merge client 1 with client 2
7.Impersonate client 2
8.Impersonate client 1
9.Examine the list of transfers
10.Switch to master branch and repeat steps 1-9
On test branch client 2 should no longer be accessible. The transfers of client 1 should be visible under client 2.
On master branch no transfers should be available under client #2

Merge 2 clients - assigned to different partner
1.Switch to local DB
2.Find two clients - client #1 created before client #2 - clients assigned to different partners
3.Client #2 should have transfers created before the creation date of client #1
4.Login as admin
5.Go to admin panel/client merge
6.Merge client 1 with client 2
7.Impersonate client 2
8.Impersonate client 1
9.Examine the list of transfers
Client 2 should no longer be accessible. The transfers of client 1 should be visible under client 2


Verify the partner, that was assigned for the period between creation of client 1 and client 2
1.Switch to local DB
2.Find two clients - client #1 created before client #2 - clients assigned to different partners
3.Client #2 should have transfers created before the creation date of client #1
4.Go to the databse gateway.partner_client for entries with client_id of the clients that you are about to merge - client 1 and client 2
5.Login as admin
6.Go to admin panel/client merge
7.Merge client 1 with client 2
8.Go to the databse gateway.partner_client
9.Go to the databse gateway.partner_client for entries with client_id of the clients that you are about to merge - client 1 and client 2
The newly created entry which covers the period of activity of client two should be with partner_client - the partner of client 2.


Verify if after the merge there is new entry in the gateway.partner_client table
1.Switch to local DB
2.Find two clients - client #1 created before client #2 - clients assigned to different partners
3.Client #2 should have transfers created before the creation date of client #1
4.Go to the databse gateway.partner_client for entries with client_id of the clients that you are about to merge - client 1 and client 2
5.Login as admin
6.Go to admin panel/client merge
7.Merge client 1 with client 2
8.Go to the databse gateway.partner_client
9.Go to the databse gateway.partner_client for entries with client_id of the clients that you are about to merge - client 1 and client 2
There should be newly created entry that covers the period between the creation date of client 1 and the creation date of client 2. 

Do we keep the client name and info of the client, that we choose to keep 
1.Switch to local DB
2.Find two clients - client #1 created before client #2 
3.Impersonate client 1 - check client’s name
4.Impersonate client 2 - check client’s name
5.Merge client 2 with client 1
6.Examine the name of client 2
The name of client 2 should remain the same before and after the merge

Do we keep the accounts assigned to the client, that we keep
1.Switch to local DB
2.Find two clients - client #1 created before client #2 
3.Impersonate client 1 - check client’s accounts
4.Impersonate client 2 - check client’s accounts
5.Merge client 2 with client 1
6.Examine the name of client 2
The name of client 2 should remain the same before and after the merge

Do we update client info after merge
1.Switch to local DB
2.Find two clients - client #1 created before client #2 
3.Impersonate client 2 - check client’s address
4.Merge client 2 with client 1
6.Examine the address of client 2
The address of client 2 should remain the same before and after the merge



