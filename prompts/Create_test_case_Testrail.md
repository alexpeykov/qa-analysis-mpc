Create test case in Test case folder:

Type: Functional
Priority: High
Generate acceptance criteria for each step.
Create all of the following test cases without asking for approval for each one of them.

List the test case ID of each test case, that you've created, when you are done.

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


