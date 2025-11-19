Create test case in TestRail 5534 section:

Type: Functional
Priority: High
Generate acceptance criteria for each step.
Create all of the following test cases without asking for approval for each one of them.

Is the problem still present - shared DB problematic client 19110587 EVP0710018687132
1.Switch to remote DB
2.Verify if the problematic client from the ticket has status undetined
The client’s status is not supposed to be unidentified.

Import SQL fixtures to local DB
1.Switch to Local DB - evpbnak and mokejimai
2.Import the SQL fixtures
The fixtures are supposed to be imported without any errors. New client is supposed to be created in gateway.client - with status identified

Run the job publisher command and monitor outcome
1.Switch to Local DB - evpbnak and mokejimai
2.Run the job publisher
3.Monitor the output of the command
4.Check the level of the newly created client
The command is supposed to be executed without any errors. The level is supposed to remain the same.

Process the job and monitor consumer 
1.Switch to Local DB - evpbnak and mokejimai
2.Run the job consumer
3.Monitor the output of the command
4.Monitor the queue in Rabbit MQ
5.Check the level of the newly created client
The command is supposed to be executed without any errors. The level is supposed to remain the same. The messages are supposed to be created and then consumed in the queue without any errors.
